
-- Opdater cron job fra hver 3. minut til hvert minut
SELECT cron.unschedule('office365-email-sync');

SELECT cron.schedule(
  'office365-email-sync',
  '*/1 * * * *', -- Hver 1. minut i stedet for 3 minutter
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/office365-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);

-- Aktiver realtime på support_tickets tabellen for øjeblikkelige opdateringer
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
