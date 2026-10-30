-- Migration: Add indexes to message_logs for scalable paginated querying
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON public.message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_channel ON public.message_logs(channel);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON public.message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_lead_id ON public.message_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_vendor_id ON public.message_logs(vendor_id);
