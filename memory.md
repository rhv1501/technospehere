# TechnoSphere Procurement Architecture & Memory Record

This document serves as the persistent architectural reference and memory record for the **TechnoSphere B2B Procurement & Quotation Management Application**.

---

## 1. System Overview & Purpose
**TechnoSphere** is a production-grade enterprise procurement management portal designed to streamline Request for Quotation (RFQ) distribution, multi-vendor bidding, price negotiations, and final Purchase Order (PO) closure.

### Key Objectives:
1. **Vendor Directory**: Manage registered suppliers, contact personnel, categories of supply, GST verification, and communication logs.
2. **RFQ Management**: Create procurement requisitions with multi-line items (item title, quantity, specifications, estimated pricing, and customer/end-user metadata).
3. **Automated Vendor Matching & Quotation Dispatch**:
   - Filter active vendors by category.
   - Generate official RFQ PDFs on the fly using `pdfkit`.
   - Dispatch RFQ emails via configured SMTP servers using `nodemailer`.
   - Prepare formatted WhatsApp Web deep-links (`wa.me`) for compliant manual dispatch.
4. **RFQ Closure (Win vs. Lost)**:
   - **Win Pathway**: Select the winning vendor, enter agreed negotiated unit prices for each line item, auto-calculate the total PO amount ($\sum \text{Qty} \times \text{Unit Price}$), and award the Purchase Order.
   - **Lost Pathway**: Mark the requirement as Closed - Lost when client cancels, pricing fails, or competitor wins, capturing loss reason and context.
5. **Vendor Performance & RFQ History**:
   - View all RFQs assigned to any vendor with a dedicated **Won** filter to track awarded purchase orders.

---

## 2. Tech Stack & Environment
- **Framework**: Next.js 16 (App Router, Turbopack, React 19, Server Actions, TypeScript)
- **Styling**: Vanilla Tailwind CSS with custom dark/light theme provider
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Cookie-based session handling)
- **Storage**: Supabase Storage (`lead-attachments` bucket)
- **Document Generation**: PDFKit (server-side streaming & buffer generation)
- **Email Service**: Nodemailer (custom SMTP configuration per tenant)
- **Icons & Notifications**: Lucide React & Sonner toasts

---

## 3. Database Schema & Models

### Core Tables in Supabase:
1. `profiles`: System admins and operators (`id`, `email`, `role`, `created_at`).
2. `categories`: Product categories (e.g. Lenovo Commercial, Dell Enterprise, Apple Business, HP Commercial, Software & Licensing).
3. `vendors`: Supplier profiles:
   - Columns: `id`, `company_name`, `contact_person`, `email`, `whatsapp_number`, `status` (`active` | `inactive`), `registration_status` (`pending` | `approved` | `rejected`), `notes`, `gst_number`, `address`, `secondary_contact_person`, `secondary_email`, `secondary_phone`.
4. `vendor_categories`: Many-to-many junction table between `vendors` and `categories`.
5. `vendor_registrations`: Public self-onboarding applications requiring admin review and approval.
6. `leads`: Primary procurement RFQ records:
   - Columns: `id`, `lead_number`, `customer_name`, `lead_name` (RFQ reference), `product_item`, `quantity`, `specifications`, `due_date`, `status`, `category_id`, `delivery_terms`, `warranty`, `unit_price_estimate`, `gst_rate`, `remarks`, `created_by`, `created_at`, `updated_at`.
   - Closure Extensions: `winning_vendor_id` (UUID FK to `vendors`), `winning_amount` (numeric), `closure_notes` (text), `closed_at` (timestamptz), `closure_outcome` (`win` | `lost`), `loss_reason` (text), `closure_items` (JSONB).
7. `lead_attachments`: Documents, datasheets, and client BoMs uploaded to Supabase Storage.
8. `lead_vendors`: Junction table tracking assigned vendors for each RFQ, recording email dispatch status and WhatsApp preparation timestamps.
9. `message_logs`: Audit trail for all outgoing email and WhatsApp communications.
10. `system_settings`: Company metadata, branding addresses, GST, and SMTP credentials.

### Dual-Layer Storage Pattern (Production Resiliency)
In strict adherence to production standards:
- Native schema columns (`closure_outcome`, `loss_reason`, `closure_items`, `winning_vendor_id`, `winning_amount`, etc.) are updated first.
- If remote Supabase instances undergo schema cache updates or pending migrations, data is seamlessly backed up into structured delimiter tokens in `remarks`/`specifications`:
  - Multi-line items: `[[ITEMS_JSON:[...]]] `
  - Closure outcome & items: `[[CLOSURE_DATA:{...}]]`
  - End-user context: `[[END_USER:{...}]]`
- Reads automatically parse both native columns and delimiter fallbacks, guaranteeing zero data loss across environments.

---

## 4. Workflows & Features

### 4.1 RFQ Creation & Multi-Item BoMs
- Single or multiple line items can be added with individual quantities, titles, specifications, and unit estimates.
- Automatically calculates estimated subtotal.
- Automatically matches all active vendors belonging to the selected category.

### 4.2 Document & Quote Dispatch
- Generates professional PDF quote requests with company branding.
- Standardized Purchase Requisition references as **PR REF: {ref}** and **PR Reference No: {ref}** across all quotation request PDFs, emails, and forms.
- Dispatches transactional emails directly via SMTP with attached RFQ PDFs.
- Prepares WhatsApp Web deep-links (`https://web.whatsapp.com/send?phone=...&text=...`), keeping message dispatch under human review per policy.

### 4.3 Two-Way Closure (Win vs. Lost)
- **Win & Award PO**:
  - Select winning vendor from assigned suppliers.
  - Item-by-item unit price entry.
  - Automatic computation: $\text{Line Total} = \text{Qty} \times \text{Agreed Unit Price}$; $\text{Final PO Amount} = \sum \text{Line Totals}$.
  - Sets `closure_outcome = 'win'`, updates `status = 'completed'`, and records winner details.
- **Lost Pathway**:
  - Sets `closure_outcome = 'lost'`, updates `status = 'cancelled'`.
  - Captures structured loss reason (Price, Competition, Client cancelled, Timeline, etc.) and notes.
- **Reopen Option**:
  - Administrators can reopen a closed RFQ back to draft/active if requirements change.

### 4.4 Vendor Hub & RFQ History (Amazon-Style Infinite Scroll)
- In the Vendor tab, selecting any vendor reveals their full profile, contact cards, and an interactive list of RFQs assigned to them.
- A filter switch allows viewing **All RFQs** vs. **Won Only** (RFQs where this vendor was awarded the PO).
- **Amazon-Style Infinite Scroll**: `getVendorRfqsPaginated({ vendorId, page, pageSize: 15, filter })` streams RFQs in chunks of 15 using Supabase `.range(from, to)` as the user scrolls the modal drawer.
- **Real-Time Counters**: Displays live `All RFQs (X)` and `Won (Y)` counts alongside a `Showing A of B RFQs` indicator, loading pulse indicator, and end-of-list checkmark.
- Both the vendor company name and the "View RFQs" button trigger the modal drawer.

### 4.5 Amazon-Style Infinite Scroll Fetching (RFQs)
- **Server Action**: `getLeadsPaginated({ page, pageSize: 15, search, status, categoryId })` performs Supabase range queries (`.range(from, to)`) with `{ count: 'exact' }`.
- **Client IntersectionObserver**: Watches a bottom sentinel element with a `rootMargin: '250px'` prefetch margin so the next page seamlessly loads before the user hits the absolute bottom.
- **Debounced Server Search**: Typing in the search input or changing category/status debounces (300ms) and resets to page 1.
- **Dynamic UX Feedback**: Shows live "Showing X of Y RFQs" badge, smooth loading spinner, and an "All X RFQs loaded" confirmation when reaching the end of records.

### 4.6 Communication Logs Infinite Scroll & Audit Trail
- **Server Action**: `getMessageLogsPaginated({ page, pageSize: 20, search, channel, status, leadId })` with Supabase range querying.
- **Client Component**: `MessageLogsClient.tsx` with live debounced search by recipient/subject, channel switcher (All, Email, WhatsApp), delivery status filter, and live record count metrics.
- **Audit Viewer**: In-line modal preview allows reading the exact message body, parameters, and error logs for any dispatch.
- **Database Indexes**: Indexed `created_at DESC`, `channel`, `status`, `lead_id`, and `vendor_id` on `message_logs`.

---

## 5. Non-Negotiable Engineering Rules (AGENTS.md)
1. **Real Data Only**: No mock arrays, hardcoded business IDs, or fake JSON endpoints.
2. **Real Operations**: Every button, status update, price entry, and filter must connect to Supabase.
3. **WhatsApp Compliance**: Web deep-links only (`wa.me`); no automated bots or unofficial WhatsApp APIs.
4. **Security & RLS**: Server actions run server-side using secure admin clients; client components receive strictly sanitized responses.
5. **No Placeholders or Truncations**: Exhaustive, robust code implementations.
