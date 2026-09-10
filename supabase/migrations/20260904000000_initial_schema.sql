-- Initial Schema Migration for Vendor Quotation Management System (Steps 1–4)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

----------------------------------------------------
-- 1. PROFILES TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff', 'vendor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

----------------------------------------------------
-- 2. CATEGORIES TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by authenticated users and anon"
ON public.categories FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Categories editable by authenticated users"
ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

----------------------------------------------------
-- 3. VENDORS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    address TEXT,
    gst_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    registration_status TEXT NOT NULL DEFAULT 'approved' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_company_name ON public.vendors(company_name);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors viewable by authenticated users"
ON public.vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendors editable by authenticated users"
ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

----------------------------------------------------
-- 4. VENDOR_CATEGORIES (Many-to-Many) TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vendor_category_unique UNIQUE(vendor_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_categories_vendor_id ON public.vendor_categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_category_id ON public.vendor_categories(category_id);

ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor categories viewable by authenticated users"
ON public.vendor_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendor categories editable by authenticated users"
ON public.vendor_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

----------------------------------------------------
-- 5. VENDOR_REGISTRATIONS (Public submissions) TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    category_ids UUID[] DEFAULT '{}',
    address TEXT,
    gst_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_registrations_status ON public.vendor_registrations(status);

ALTER TABLE public.vendor_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor registrations readable by authenticated users"
ON public.vendor_registrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can submit vendor registration"
ON public.vendor_registrations FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Vendor registrations updateable by authenticated users"
ON public.vendor_registrations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_vendor_registrations_updated_at BEFORE UPDATE ON public.vendor_registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

----------------------------------------------------
-- 6. LEADS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    lead_name TEXT NOT NULL,
    product_item TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    specifications TEXT,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_send', 'sent', 'quoted', 'completed', 'cancelled')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    delivery_terms TEXT,
    warranty TEXT,
    unit_price_estimate NUMERIC(12, 2),
    gst_rate NUMERIC(5, 2) DEFAULT 18.00,
    remarks TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category_id ON public.leads(category_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads readable by authenticated users"
ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leads manageable by authenticated users"
ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

----------------------------------------------------
-- 7. LEAD_ATTACHMENTS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id ON public.lead_attachments(lead_id);

ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead attachments viewable by authenticated users"
ON public.lead_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lead attachments manageable by authenticated users"
ON public.lead_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

----------------------------------------------------
-- 8. LEAD_VENDORS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    whatsapp_prepared BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_prepared_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lead_vendor_unique UNIQUE(lead_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_vendors_lead_id ON public.lead_vendors(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_vendors_vendor_id ON public.lead_vendors(vendor_id);

ALTER TABLE public.lead_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead vendors viewable by authenticated users"
ON public.lead_vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lead vendors manageable by authenticated users"
ON public.lead_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

----------------------------------------------------
-- 9. MESSAGE_LOGS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('prepared', 'sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_lead_id ON public.message_logs(lead_id);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Message logs viewable by authenticated users"
ON public.message_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Message logs insertable by authenticated users"
ON public.message_logs FOR INSERT TO authenticated WITH CHECK (true);

----------------------------------------------------
-- 10. SYSTEM_SETTINGS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System settings readable by authenticated users"
ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "System settings manageable by authenticated users"
ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

----------------------------------------------------
-- STORAGE BUCKETS SETUP & POLICIES
----------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lead-attachments', 'lead-attachments', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']),
  ('vendor-documents', 'vendor-documents', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies for lead-attachments
CREATE POLICY "Authenticated users can upload lead attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "Authenticated users can select lead attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-attachments');

CREATE POLICY "Authenticated users can delete lead attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-attachments');

CREATE POLICY "Anon can view public lead attachments"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'lead-attachments');

----------------------------------------------------
-- SEED DEFAULT CATEGORIES
----------------------------------------------------
INSERT INTO public.categories (name, description) VALUES
('Lenovo Commercial', 'Laptops, desktops and workstations for commercial enterprise customers'),
('Lenovo Personal', 'Consumer laptops, gaming PCs, and personal accessories'),
('Dell Enterprise & Client', 'Dell Servers, Storage, Latitude and XPS laptops'),
('HP Commercial & Enterprise', 'HP ProBook, EliteBook, ZBook and printers'),
('Apple Business', 'MacBook Pro, iMac, iPad and Mac Studio solutions'),
('Software & Licensing', 'Microsoft 365, Cloud subscriptions, and enterprise software')
ON CONFLICT (name) DO NOTHING;

----------------------------------------------------
-- SEED INITIAL SEED VENDORS (PROD-GRADE DEFAULT DEMO DATA FOR INITIAL DASHBOARD VIEWING)
----------------------------------------------------
DO $$
DECLARE
    v1_id UUID := gen_random_uuid();
    v2_id UUID := gen_random_uuid();
    v3_id UUID := gen_random_uuid();
    cat_lenovo_comm UUID;
    cat_lenovo_pers UUID;
    cat_dell UUID;
    cat_hp UUID;
BEGIN
    SELECT id INTO cat_lenovo_comm FROM public.categories WHERE name = 'Lenovo Commercial' LIMIT 1;
    SELECT id INTO cat_lenovo_pers FROM public.categories WHERE name = 'Lenovo Personal' LIMIT 1;
    SELECT id INTO cat_dell FROM public.categories WHERE name = 'Dell Enterprise & Client' LIMIT 1;
    SELECT id INTO cat_hp FROM public.categories WHERE name = 'HP Commercial & Enterprise' LIMIT 1;

    INSERT INTO public.vendors (id, company_name, contact_person, email, whatsapp_number, address, gst_number, notes, status, registration_status)
    VALUES
    (v1_id, 'Apex Infotech Solutions', 'Rajesh Sharma', 'sales@apexinfotech.com', '+919876543210', 'Plot 42, Tech Park, Electronic City, Bengaluru', '29ABCDE1234F1Z5', 'Authorized Lenovo Platinum Partner for Commercial & Workstations', 'active', 'approved'),
    (v2_id, 'TechnoSphere Digital Media', 'Ananya Patel', 'contact@technospheredigital.in', '+919812345678', 'Suite 302, Cyber Tower, Hitec City, Hyderabad', '36AAACT9876Q1Z9', 'Specialized in Hardware Distribution & Cloud Licensing', 'active', 'approved'),
    (v3_id, 'Nexus Compute Systems', 'Vikramaditya Rao', 'procurement@nexuscompute.com', '+919900112233', '15 Mahatma Gandhi Road, Connaught Place, New Delhi', '07AAACN5432M1Z2', 'Enterprise supplier for HP and Dell IT Infrastructure', 'active', 'approved')
    ON CONFLICT DO NOTHING;

    IF cat_lenovo_comm IS NOT NULL THEN
        INSERT INTO public.vendor_categories (vendor_id, category_id) VALUES (v1_id, cat_lenovo_comm) ON CONFLICT DO NOTHING;
        INSERT INTO public.vendor_categories (vendor_id, category_id) VALUES (v2_id, cat_lenovo_comm) ON CONFLICT DO NOTHING;
    END IF;

    IF cat_lenovo_pers IS NOT NULL THEN
        INSERT INTO public.vendor_categories (vendor_id, category_id) VALUES (v1_id, cat_lenovo_pers) ON CONFLICT DO NOTHING;
    END IF;

    IF cat_dell IS NOT NULL THEN
        INSERT INTO public.vendor_categories (vendor_id, category_id) VALUES (v3_id, cat_dell) ON CONFLICT DO NOTHING;
    END IF;

    IF cat_hp IS NOT NULL THEN
        INSERT INTO public.vendor_categories (vendor_id, category_id) VALUES (v3_id, cat_hp) ON CONFLICT DO NOTHING;
    END IF;
END $$;
