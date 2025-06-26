
-- Opret tabel til at tracke monitored mailboxes
CREATE TABLE IF NOT EXISTS public.monitored_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_token TEXT, -- For delta sync med Microsoft Graph
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indsæt de 3 mailboxes der skal monitores
INSERT INTO public.monitored_mailboxes (email_address) VALUES 
  ('info@mmmultipartner.dk'),
  ('salg@mmmultipartner.dk'),
  ('faktura@mmmultipartner.dk')
ON CONFLICT (email_address) DO NOTHING;

-- Opret tabel til email sync status og logs
CREATE TABLE IF NOT EXISTS public.email_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_address TEXT NOT NULL,
  sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  emails_processed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Tilføj cron job til at køre email sync hver 3. minut
SELECT cron.schedule(
  'office365-email-sync',
  '*/3 * * * *', -- Hver 3. minut
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/office365-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);
