-- Migration: Add Secondary Contact Person fields to vendors and vendor_registrations

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS secondary_contact_person TEXT,
  ADD COLUMN IF NOT EXISTS secondary_email TEXT,
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT;

ALTER TABLE public.vendor_registrations
  ADD COLUMN IF NOT EXISTS secondary_contact_person TEXT,
  ADD COLUMN IF NOT EXISTS secondary_email TEXT,
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
