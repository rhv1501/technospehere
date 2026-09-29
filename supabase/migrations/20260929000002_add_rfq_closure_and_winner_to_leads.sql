-- Migration: Add RFQ closure and winning vendor fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS winning_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS winning_amount NUMERIC(12, 2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closure_notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Add index on winning_vendor_id
CREATE INDEX IF NOT EXISTS idx_leads_winning_vendor_id ON public.leads(winning_vendor_id);
