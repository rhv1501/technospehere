-- Migration: Add RFQ closure outcomes, loss reasons, and item-level pricing breakdown
-- Supports both "win" and "lost" closure pathways and itemized PO calculation

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS winning_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS winning_amount NUMERIC(12, 2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closure_notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closure_outcome TEXT CHECK (closure_outcome IN ('win', 'lost'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closure_items JSONB;

-- Update status check constraint to include all workflow statuses
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('draft', 'ready_to_send', 'sent', 'quoted', 'completed', 'cancelled', 'lost', 'won'));

-- Add performance indexes for filtering and queries
CREATE INDEX IF NOT EXISTS idx_leads_winning_vendor_id ON public.leads(winning_vendor_id);
CREATE INDEX IF NOT EXISTS idx_leads_closure_outcome ON public.leads(closure_outcome);
CREATE INDEX IF NOT EXISTS idx_leads_closed_at ON public.leads(closed_at);
