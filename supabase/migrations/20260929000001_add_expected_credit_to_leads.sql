-- Add expected_credit column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS expected_credit TEXT;
