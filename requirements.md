# Vendor Quotation Management System — Steps 1–4

## Objective

Build **Steps 1–4 only** of the attached Vendor Quotation Management System using **Next.js + Supabase**, at a **production-ready level**.

Before implementation, **use/read all relevant available skills, documentation, and best practices** for Next.js, Supabase, authentication, database design, storage, realtime features, security, and production deployment. Follow those skills instead of improvising architecture.

---

# Core Technology Stack

- **Next.js** with App Router + TypeScript
- **Supabase as the complete backend**
- Supabase PostgreSQL — database
- Supabase Auth — authentication and session management
- Supabase Storage — vendor/lead attachments and files
- Supabase Realtime — live updates where useful
- Supabase Row Level Security (RLS) — mandatory
- Server Actions / Route Handlers where appropriate
- Clean, modular, scalable architecture
- Responsive professional admin dashboard

### Important Backend Rule

**Supabase must be used for everything backend-related.**

Do not introduce another backend, database, authentication provider, file-storage provider, or unnecessary third-party backend service.

---

# Production-Level Requirements

The application must be built as if it will be used by a real business.

Include:

- Proper database schema and relationships
- Foreign keys and constraints
- Appropriate indexes
- UUIDs where appropriate
- RLS policies for every relevant table
- Secure authentication/session handling
- Server-side authorization checks
- Input validation
- Proper error handling
- Loading, empty and error states
- Secure file upload handling
- Storage bucket policies
- File type/size validation
- Audit-friendly timestamps
- Created/updated timestamps
- Environment variables for secrets/configuration
- No secrets exposed to the client
- No hardcoded credentials
- Production-quality TypeScript
- Reusable components
- Reusable form components
- Clean separation of UI, data access and business logic
- Optimistic/realtime UI updates where appropriate
- Pagination/search/filtering for large datasets
- Proper database queries instead of unnecessary client-side filtering
- Protection against unauthorized vendor/lead access
- Mobile/tablet/desktop responsive UI
- Production-ready UX and accessibility

Do not create a fake/mock backend or hardcoded demo data.

---

# Step 1 — Vendor Onboarding

## Admin Adds Vendor

Admin can create a vendor with:

- Company Name
- Contact Person
- Email
- WhatsApp Number
- Category
- Address
- GST Number (optional)
- Notes
- Status: Active / Inactive

Store all vendor data in Supabase PostgreSQL.

## Vendor Registration Form

- Admin can generate/share a vendor registration form/link.
- Vendor fills in company/contact information.
- Vendor submits the form.
- Submission is stored securely in Supabase.
- Admin can review the submission.
- Do not expose other vendor information through the public registration form.

## Admin Review & Approval

Admin can:

- View pending registrations
- Review vendor details
- Approve vendor
- Reject vendor
- Edit vendor information
- Activate/deactivate vendor

Approved vendors become available in the vendor database.

## Vendor Database

Create a professional vendor management interface with:

- Vendor list
- Search
- Category filters
- Status filters
- Vendor details
- Edit vendor
- Activate/deactivate
- Registration status
- Created/updated dates

Use Supabase queries with proper pagination/filtering.

## Categories

Support multiple categories, for example:

- Lenovo Commercial
- Lenovo Personal
- Other categories

Admin should be able to assign one or multiple categories to a vendor.

Use a proper many-to-many relationship such as:

`vendors → vendor_categories → categories`

---

# Step 2 — Create New Lead

Admin can click **Create New Lead**.

Fields:

- Customer Name
- Lead / PO Name
- Product / Item
- Quantity
- Specifications
- Attachments
- Due Date
- Remarks

## Lead Requirements

- Automatically generate a unique Lead ID.
- Save leads as drafts.
- Edit/update drafts.
- Upload multiple attachments.
- Delete/replace attachments where permitted.
- Validate required fields.
- Track lead status.
- Store lead data in Supabase.
- Store files in Supabase Storage.
- Store attachment metadata in PostgreSQL.

Suggested initial statuses:

- Draft
- Ready to Send
- Sent

Architecture must allow future statuses for Steps 5–9.

---

# Step 3 — Select Vendors by Category

After creating a lead:

1. Admin selects a category.
2. Supabase fetches matching vendors.
3. Only **Active** vendors are shown.
4. Admin can select one or multiple vendors.
5. Admin can search/filter vendors.
6. Clearly display selected vendors.
7. Prevent inactive vendors from being selected.
8. Save selected vendors against the lead.

Use a proper relationship such as:

`leads → lead_vendors → vendors`

---

# Step 4 — Prepare & Send Lead

## Lead Template

Automatically generate a professional quotation-request template containing:

- Lead ID
- Customer Name
- Lead / PO Name
- Product / Item
- Quantity
- Specifications
- Required Delivery Timeline / Due Date
- Unit Price
- GST
- Delivery Terms
- Warranty
- Availability
- Remarks
- Attachments

Fields not provided by the admin should remain blank/editable.

## Review & Confirm

Before sending:

- Show complete lead preview
- Allow editing
- Review attachments
- Show selected vendors
- Confirm recipients
- Validate all required information
- Show clear confirmation before sending

---

# Email Sending

Send quotation requests to selected vendors by email.

Requirements:

- Generate professional email content from the lead template.
- Include relevant lead details.
- Include attachment links/files as appropriate.
- Record email/message status.
- Handle failures gracefully.
- Never expose email credentials/secrets in frontend code.

If an email provider is required, keep the architecture modular so it can be configured through environment variables without replacing Supabase as the backend.

---

# WhatsApp Web — IMPORTANT

**DO NOT USE THE WHATSAPP BUSINESS API.**

**DO NOT USE WHATSAPP CLOUD API.**

**DO NOT USE unofficial WhatsApp APIs or third-party WhatsApp automation services.**

Use **WhatsApp Web/manual interaction only**.

The system should:

- Generate the WhatsApp message automatically.
- Use the vendor's WhatsApp number.
- Open WhatsApp Web with the recipient/message where technically supported.
- Allow the admin to review the message.
- Require the admin to manually send the WhatsApp message.
- Never attempt to bypass WhatsApp security, authentication, rate limits, or restrictions.
- Record that the WhatsApp message was prepared/sent from the system where appropriate.

Prefer a safe `wa.me` / WhatsApp Web deep-link approach rather than browser automation.

---

# Supabase Architecture

## Supabase Auth

Use Supabase Auth for:

- Admin authentication
- Login/logout
- Session management
- Protected routes
- Authorization

Do not build a custom authentication system.

Design the database so additional roles/users can be supported later.

---

## Supabase Database

Create a proper production schema for at least:

- `profiles`
- `vendors`
- `categories`
- `vendor_categories`
- `vendor_registrations`
- `leads`
- `lead_attachments`
- `lead_vendors`
- `message_logs`

Use:

- UUID primary keys
- Foreign keys
- Unique constraints where required
- Appropriate indexes
- `created_at`
- `updated_at`
- Appropriate status fields
- Database-level integrity constraints

Use migrations rather than manually creating an undocumented database.

---

## Supabase Storage

Use Supabase Storage for all uploaded files.

Create appropriate buckets, for example:

- `lead-attachments`
- `vendor-documents`

Requirements:

- Secure bucket policies
- File type validation
- File size limits
- Secure upload/download access
- Never expose private files publicly unless explicitly required
- Store file metadata in PostgreSQL
- Use signed URLs for private files when required

---

## Supabase Realtime

Use Supabase Realtime where it improves the workflow, for example:

- New vendor registration appears live
- Vendor approval/status changes
- Lead status changes
- Attachment/upload state updates
- Other relevant admin dashboard updates

Do not add realtime unnecessarily where normal database queries are better.

---

# UI / UX

Match the attached reference flow's overall structure and simplicity.

Create a professional business/admin application with:

- Step-based workflow
- Sidebar/navigation
- Dashboard
- Clean cards
- Tables
- Forms
- Search
- Filters
- Status badges
- Modals
- Confirmation dialogs
- Toast notifications
- Loading states
- Empty states
- Error states
- Responsive design
- Accessible components

The UI should feel like a **real production SaaS/admin application**, not a prototype.

---

# Security

Security is mandatory.

Implement:

- Supabase RLS on all user-accessible tables
- Least-privilege access
- Protected admin routes
- Server-side authorization
- Secure storage policies
- Input validation
- File validation
- No exposed service-role keys
- No secrets in source code
- Safe handling of public vendor registration links
- Protection against unauthorized record access
- Proper environment variable usage

The Supabase `service_role` key must never be exposed to the browser.

---

# Project Structure

Use a scalable Next.js structure.

Keep:

- UI components reusable
- Database/Supabase access organized
- Validation schemas centralized
- Business logic separated from presentation
- Types generated/maintained from the database where appropriate
- Server-side operations clearly separated from client-side components

Avoid a monolithic page/component.

---

# Scope Restriction

Implement **ONLY Steps 1, 2, 3 and 4**.

Do NOT implement:

- Vendor responses
- Quote management
- Negotiation
- Quote comparison
- Purchase orders
- Reports/history

However, design the database and architecture so Steps 5–9 can be added later without rebuilding the foundation.

---

# Final Implementation Standard

Do not stop at creating screens.

Deliver a **fully functional production-level foundation** where:

**Admin Login → Vendor Onboarding → Approval → Category Assignment → Create Lead → Upload Attachments → Select Vendors → Review Lead → Send Email → Prepare WhatsApp Web Message**

works end-to-end with **Supabase Database + Auth + Storage + Realtime**.

Use the relevant available skills/documentation before implementation and follow production best practices throughout.
