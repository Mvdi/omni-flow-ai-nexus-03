
-- FASE 1: RYD OP I ALLE GAMLE/KONFLIKTENDE CRON JOBS
-- Dette er kritisk for at stoppe race conditions og konflikter

-- Fjern alle eksisterende email sync cron jobs
SELECT cron.unschedule('office365-email-sync');
SELECT cron.unschedule('auto-fetch-emails-backup');
SELECT cron.unschedule('auto-fetch-emails-fast');
SELECT cron.unschedule('fetch-office365-emails-fast');
SELECT cron.unschedule('auto-fetch-emails-backup-dk-v2');
SELECT cron.unschedule('auto-fetch-emails-fast-dk-v2');

-- Tjek om der er andre email sync jobs og fjern dem
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE '%email%' OR jobname LIKE '%sync%';

-- FASE 2: OPRET ÉT CENTRALT, BULLETPROOF CRON JOB
-- Dette job kører hver 2. minut for optimal balance mellem hastighed og pålidelighed
SELECT cron.schedule(
  'bulletproof-email-sync',
  '*/2 * * * *', -- Hver 2. minut for optimal balance
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/reliable-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "bulletproof-cron", "priority": "high"}'::jsonb
  );
  $$
);

-- FASE 3: OPRET BACKUP SYNC JOB (kører hver 15. minut som failsafe)
SELECT cron.schedule(
  'backup-email-sync',
  '*/15 * * * *', -- Hver 15. minut som backup
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/reliable-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "backup-cron", "priority": "backup"}'::jsonb
  );
  $$
);

-- FASE 4: TILFØJ UNIQUE CONSTRAINT FOR AT FORHINDRE DUPLICATE SYNC LOCKS
-- Dette sikrer kun ét sync job kan køre ad gangen på database niveau
ALTER TABLE email_sync_log 
ADD CONSTRAINT unique_system_lock 
UNIQUE (mailbox_address, status) 
DEFERRABLE INITIALLY DEFERRED;

-- FASE 5: OPRET SYNC HEALTH MONITORING TABEL
CREATE TABLE IF NOT EXISTS email_sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  health_status TEXT CHECK (health_status IN ('healthy', 'warning', 'critical')),
  consecutive_failures INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  error_details TEXT,
  emails_processed INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- FASE 6: OPRET DEAD LETTER QUEUE TABEL FOR FAILED EMAILS
CREATE TABLE IF NOT EXISTS email_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id TEXT NOT NULL,
  mailbox_address TEXT NOT NULL,
  sender_email TEXT,
  subject TEXT,
  error_message TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed', 'resolved'))
);

-- FASE 7: TILFØJ INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_email_sync_health_timestamp ON email_sync_health (sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_sync_health_status ON email_sync_health (health_status);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_status ON email_dead_letter_queue (status);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_retry ON email_dead_letter_queue (next_retry_at) WHERE status = 'pending';

-- FASE 8: OPRET FUNCTION TIL AT TJEKKE SYNC HEALTH
CREATE OR REPLACE FUNCTION check_email_sync_health()
RETURNS TABLE (
  current_status TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  consecutive_failures INTEGER,
  minutes_since_last_sync INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    esl.status,
    esl.sync_started_at,
    COALESCE(
      (SELECT consecutive_failures FROM email_sync_health ORDER BY created_at DESC LIMIT 1),
      0
    ) as consecutive_failures,
    EXTRACT(EPOCH FROM (now() - esl.sync_started_at))::INTEGER / 60 as minutes_since_last_sync
  FROM email_sync_log esl
  WHERE esl.mailbox_address != 'SYSTEM_LOCK' 
    AND esl.mailbox_address != 'HEALTH_CHECK'
    AND esl.mailbox_address != 'DEAD_LETTER_QUEUE'
  ORDER BY esl.sync_started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- FASE 9: OPRET ALERT FUNCTION TIL KRITISKE FEJL
CREATE OR REPLACE FUNCTION alert_critical_sync_failure()
RETURNS TRIGGER AS $$
BEGIN
  -- Hvis sync er fejlet mere end 3 gange i træk, log kritisk alert
  IF NEW.consecutive_failures >= 3 THEN
    INSERT INTO email_sync_log (
      mailbox_address,
      status,
      emails_processed,
      errors_count,
      error_details,
      sync_started_at,
      sync_completed_at
    ) VALUES (
      'CRITICAL_ALERT',
      'failed',
      0,
      NEW.consecutive_failures,
      'CRITICAL: Email sync har fejlet ' || NEW.consecutive_failures || ' gange i træk!',
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FASE 10: OPRET TRIGGER FOR AUTOMATIC ALERTS
DROP TRIGGER IF EXISTS trigger_alert_critical_sync_failure ON email_sync_health;
CREATE TRIGGER trigger_alert_critical_sync_failure
  AFTER INSERT OR UPDATE ON email_sync_health
  FOR EACH ROW
  EXECUTE FUNCTION alert_critical_sync_failure();

-- FASE 11: RENS OP I GAMLE SYNC LOGS (beholde kun sidste 24 timer)
DELETE FROM email_sync_log 
WHERE sync_started_at < now() - INTERVAL '24 hours'
  AND mailbox_address NOT IN ('SYSTEM_LOCK', 'HEALTH_CHECK', 'CRITICAL_ALERT', 'DEAD_LETTER_QUEUE');

-- FASE 12: TILFØJ KOMMENTAR TIL DOKUMENTATION
COMMENT ON TABLE email_sync_health IS 'Real-time monitoring af email sync systemets sundhed og pålidelighed';
COMMENT ON TABLE email_dead_letter_queue IS 'Fejlede emails der skal genbehandles automatisk';
COMMENT ON FUNCTION check_email_sync_health() IS 'Tjekker nuværende status på email sync systemet';
