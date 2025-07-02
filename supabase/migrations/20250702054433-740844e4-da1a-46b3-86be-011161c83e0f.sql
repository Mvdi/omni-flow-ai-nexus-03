-- FASE 1: KOMPLET CLEANUP OG BULLETPROOF EMAIL SYNC SYSTEM
-- Fjern ALLE eksisterende email sync cron jobs for at stoppe konflikter
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE '%email%' OR jobname LIKE '%sync%';

-- FASE 2: OPRET ROBUST 24/7 EMAIL SYNC SYSTEM
-- Primært sync job hver 2. minut (hurtig response)
SELECT cron.schedule(
  'bulletproof-email-sync-v2',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/reliable-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "bulletproof-cron-v2", "priority": "high", "facebookLeadDetection": true}'::jsonb
  );
  $$
);

-- KRITISK: Natlig deep sync kl. 06:00 med 24-timers vindue for catch-up
SELECT cron.schedule(
  'nightly-deep-sync',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/reliable-email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
    body := '{"source": "nightly-deep-sync", "priority": "critical", "syncHours": 24, "facebookLeadDetection": true}'::jsonb
  );
  $$
);

-- FASE 3: TILFØJ FACEBOOK LEAD DETECTION TABEL
CREATE TABLE IF NOT EXISTS facebook_leads_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  service_detected TEXT,
  customer_data JSONB,
  original_email_content TEXT,
  processing_notes TEXT
);

-- FASE 4: FORBEDRET EMAIL SYNC LOG MED LEAD TRACKING
ALTER TABLE email_sync_log 
ADD COLUMN IF NOT EXISTS facebook_leads_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_vs_tickets_ratio NUMERIC DEFAULT 0;

-- FASE 5: OPRET SERVICE DETECTION TABEL
CREATE TABLE IF NOT EXISTS service_detection_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  detection_patterns TEXT[] NOT NULL,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indsæt standard service patterns
INSERT INTO service_detection_patterns (service_name, detection_patterns, priority) VALUES
('Vinduespudsning', ARRAY['vindues', 'window', 'rude', 'glasrengøring', 'facade'], 1),
('Rengøring', ARRAY['rengøring', 'cleaning', 'rens', 'gør rent', 'städning'], 1),
('Havearbejde', ARRAY['have', 'garden', 'græs', 'plæne', 'beskæring', 'hæk'], 2),
('Byggeri', ARRAY['byg', 'construction', 'renovering', 'ombygning', 'håndværk'], 3);

-- FASE 6: OPRET FUNCTION TIL INTELLIGENT LEAD CREATION
CREATE OR REPLACE FUNCTION create_facebook_lead(
  email_content TEXT,
  sender_email TEXT,
  sender_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  lead_id UUID;
  detected_service TEXT;
  customer_data JSONB := '{}';
  phone_match TEXT;
  address_match TEXT;
BEGIN
  -- Detecter service type fra email content
  SELECT service_name INTO detected_service
  FROM service_detection_patterns sdp
  WHERE EXISTS (
    SELECT 1 FROM unnest(sdp.detection_patterns) AS pattern
    WHERE email_content ILIKE '%' || pattern || '%'
  )
  ORDER BY priority
  LIMIT 1;

  -- Extract telefonnummer
  phone_match := (SELECT (regexp_matches(email_content, '\+?[\d\s\-\(\)]{8,}', 'g'))[1]);
  
  -- Extract adresse (simpel pattern)
  address_match := (SELECT (regexp_matches(email_content, '\d{1,4}\s+[A-Za-zæøåÆØÅ\s]+', 'g'))[1]);

  -- Byg customer data
  customer_data := jsonb_build_object(
    'extracted_phone', phone_match,
    'extracted_address', address_match,
    'source_email', sender_email,
    'detected_service', detected_service
  );

  -- Opret lead
  INSERT INTO leads (
    navn,
    email,
    telefon,
    adresse,
    status,
    kilde,
    noter,
    ai_enriched_data,
    sidste_kontakt
  ) VALUES (
    COALESCE(sender_name, split_part(sender_email, '@', 1)),
    sender_email,
    phone_match,
    address_match,
    'Ny',
    'Facebook Lead',
    'Automatisk oprettet fra Facebook lead email: ' || substr(email_content, 1, 500),
    customer_data,
    'Email modtaget: ' || now()::TEXT
  ) RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$ LANGUAGE plpgsql;

-- FASE 7: FORBEDRET SYNC HEALTH MONITORING
CREATE OR REPLACE FUNCTION get_email_sync_health_detailed()
RETURNS TABLE (
  status TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  minutes_since_last_sync INTEGER,
  facebook_leads_today INTEGER,
  total_emails_today INTEGER,
  consecutive_failures INTEGER,
  health_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_sync AS (
    SELECT 
      esl.status,
      esl.sync_started_at,
      esl.facebook_leads_created,
      esl.emails_processed,
      EXTRACT(EPOCH FROM (now() - esl.sync_started_at))::INTEGER / 60 as minutes_since
    FROM email_sync_log esl
    WHERE esl.mailbox_address NOT IN ('SYSTEM_LOCK', 'HEALTH_CHECK', 'CRITICAL_ALERT')
    ORDER BY esl.sync_started_at DESC
    LIMIT 1
  ),
  daily_stats AS (
    SELECT 
      COALESCE(SUM(facebook_leads_created), 0) as leads_today,
      COALESCE(SUM(emails_processed), 0) as emails_today
    FROM email_sync_log
    WHERE sync_started_at >= CURRENT_DATE
  ),
  failure_count AS (
    SELECT COUNT(*) as failures
    FROM email_sync_log
    WHERE status = 'failed' 
    AND sync_started_at >= now() - INTERVAL '1 hour'
  )
  SELECT 
    rs.status,
    rs.sync_started_at,
    rs.minutes_since,
    ds.leads_today::INTEGER,
    ds.emails_today::INTEGER,
    fc.failures::INTEGER,
    CASE 
      WHEN rs.minutes_since < 5 AND fc.failures = 0 THEN 100
      WHEN rs.minutes_since < 10 AND fc.failures < 2 THEN 80
      WHEN rs.minutes_since < 15 AND fc.failures < 3 THEN 60
      ELSE 20
    END as health_score
  FROM recent_sync rs, daily_stats ds, failure_count fc;
END;
$$ LANGUAGE plpgsql;

-- FASE 8: AUTOMATIC CLEANUP AF GAMLE LOGS (kun beholde 48 timer)
DELETE FROM email_sync_log 
WHERE sync_started_at < now() - INTERVAL '48 hours'
  AND mailbox_address NOT IN ('SYSTEM_LOCK', 'HEALTH_CHECK', 'CRITICAL_ALERT');

-- KOMMENTARER TIL DOKUMENTATION
COMMENT ON TABLE facebook_leads_processed IS 'Tracker Facebook leads der er automatisk konverteret fra emails';
COMMENT ON FUNCTION create_facebook_lead IS 'Intelligent lead creation fra Facebook emails med service detection';
COMMENT ON FUNCTION get_email_sync_health_detailed IS 'Detaljeret sundhedstjek med Facebook lead tracking';