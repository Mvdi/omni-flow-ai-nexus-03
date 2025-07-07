-- Clean up existing email sync cron jobs (only unschedule if they exist)
DO $$
BEGIN
    -- Try to unschedule existing jobs, ignore errors if they don't exist
    BEGIN
        PERFORM cron.unschedule('automatic-email-sync-2min');
    EXCEPTION WHEN OTHERS THEN
        -- Job doesn't exist, continue
    END;
    
    BEGIN
        PERFORM cron.unschedule('nightly-deep-sync');
    EXCEPTION WHEN OTHERS THEN
        -- Job doesn't exist, continue
    END;
END $$;

-- CREATE: New properly named automatic email sync
SELECT cron.schedule(
  'bulletproof-email-sync-2min',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/automatic-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "automatic-2min-sync", "priority": "normal"}'::jsonb
  );
  $$
);

-- Log the cleanup and setup
INSERT INTO email_sync_log (
  mailbox_address, 
  status, 
  emails_processed, 
  sync_started_at, 
  sync_completed_at, 
  errors_count, 
  facebook_leads_created,
  error_details
) VALUES (
  'SYSTEM_CLEANUP', 
  'completed', 
  0, 
  NOW(), 
  NOW(), 
  0, 
  0,
  'Email sync system cleaned up: created automatic-email-sync with bulletproof-email-sync-2min cron job'
);