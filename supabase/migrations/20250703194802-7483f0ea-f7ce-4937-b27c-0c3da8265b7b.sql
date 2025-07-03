-- Add missing RLS policies for security compliance

-- Enable RLS on tables that don't have it
ALTER TABLE public.email_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_leads_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_detection_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_sync_log (admin/system access only)
CREATE POLICY "Authenticated users can view email sync logs" 
ON public.email_sync_log 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage email sync logs" 
ON public.email_sync_log 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- RLS policies for facebook_leads_processed (admin access only)
CREATE POLICY "Authenticated users can view facebook leads processed" 
ON public.facebook_leads_processed 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage facebook leads processed" 
ON public.facebook_leads_processed 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- RLS policies for monitored_mailboxes (admin access only)
CREATE POLICY "Authenticated users can view monitored mailboxes" 
ON public.monitored_mailboxes 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage monitored mailboxes" 
ON public.monitored_mailboxes 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

-- RLS policies for service_detection_patterns (read for authenticated, manage for admin)
CREATE POLICY "Authenticated users can view service detection patterns" 
ON public.service_detection_patterns 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage service detection patterns" 
ON public.service_detection_patterns 
FOR ALL 
USING (auth.role() = 'authenticated'::text);