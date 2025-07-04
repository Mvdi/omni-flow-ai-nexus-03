-- Opdater email sync til at køre hver 3. minut i stedet for hver 10. minut
SELECT cron.unschedule('working-email-sync');

SELECT cron.schedule(
  'fast-email-sync',
  '*/3 * * * *', -- hver 3. minut
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/manual-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "fast-automated-sync"}'::jsonb
  );
  $$
);