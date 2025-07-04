-- Fix all functions with proper search_path settings
-- The previous migration didn't apply search_path correctly, so we need to fix this

-- Note: We need to drop and recreate functions to properly set search_path

-- 1. Fix calculate_next_due_date (there are two versions)
DROP FUNCTION IF EXISTS public.calculate_next_due_date();
DROP FUNCTION IF EXISTS public.calculate_next_due_date(date, integer, date);

CREATE OR REPLACE FUNCTION public.calculate_next_due_date(start_date date, interval_weeks integer, last_order_date date)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF last_order_date IS NULL THEN
        RETURN start_date + (interval_weeks * 7);
    ELSE
        RETURN last_order_date + (interval_weeks * 7);
    END IF;
END;
$function$;

-- 2. Fix create_subscription_orders
DROP FUNCTION IF EXISTS public.create_subscription_orders();
CREATE OR REPLACE FUNCTION public.create_subscription_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    sub_record RECORD;
    order_date DATE;
    i INTEGER;
BEGIN
    FOR sub_record IN 
        SELECT * FROM subscriptions 
        WHERE status = 'active' 
        AND auto_create_orders = true
        AND next_due_date <= CURRENT_DATE + 7
        AND next_due_date > CURRENT_DATE
    LOOP
        INSERT INTO orders (
            user_id, subscription_id, order_type, customer, customer_email,
            price, scheduled_date, status, comment, address, priority, estimated_duration
        ) VALUES (
            sub_record.user_id, sub_record.id, sub_record.service_type,
            sub_record.customer_name, sub_record.customer_email, sub_record.price,
            sub_record.next_due_date, 'Ikke planlagt',
            CONCAT('Abonnement: ', sub_record.description, CASE WHEN sub_record.notes IS NOT NULL THEN E'\nNoter: ' || sub_record.notes ELSE '' END),
            sub_record.customer_address, 'Normal', sub_record.estimated_duration
        );

        FOR i IN 1..3 LOOP
            order_date := sub_record.next_due_date + (sub_record.interval_weeks * 7 * i);
            INSERT INTO orders (
                user_id, subscription_id, order_type, customer, customer_email,
                price, scheduled_date, status, comment, address, priority, estimated_duration
            ) VALUES (
                sub_record.user_id, sub_record.id, sub_record.service_type,
                sub_record.customer_name, sub_record.customer_email, sub_record.price,
                order_date, 'Ikke planlagt',
                CONCAT('Abonnement (fremtidig): ', sub_record.description, CASE WHEN sub_record.notes IS NOT NULL THEN E'\nNoter: ' || sub_record.notes ELSE '' END),
                sub_record.customer_address, 'Normal', sub_record.estimated_duration
            );
        END LOOP;

        UPDATE subscriptions 
        SET next_due_date = sub_record.next_due_date + (sub_record.interval_weeks * 7),
            last_order_date = sub_record.next_due_date,
            updated_at = NOW()
        WHERE id = sub_record.id;
    END LOOP;
END;
$function$;

-- 3. Fix mark_order_as_manually_edited
DROP FUNCTION IF EXISTS public.mark_order_as_manually_edited();
CREATE OR REPLACE FUNCTION public.mark_order_as_manually_edited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date) OR 
     (OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time) OR 
     (OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id) THEN
    NEW.edited_manually := TRUE;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Fix get_email_sync_health_detailed
DROP FUNCTION IF EXISTS public.get_email_sync_health_detailed();
CREATE OR REPLACE FUNCTION public.get_email_sync_health_detailed()
RETURNS TABLE(status text, last_sync_at timestamp with time zone, minutes_since_last_sync integer, facebook_leads_today integer, total_emails_today integer, consecutive_failures integer, health_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH recent_sync AS (
    SELECT esl.status, esl.sync_started_at, esl.facebook_leads_created, esl.emails_processed,
           EXTRACT(EPOCH FROM (now() - esl.sync_started_at))::INTEGER / 60 as minutes_since
    FROM email_sync_log esl
    WHERE esl.mailbox_address NOT IN ('SYSTEM_LOCK', 'HEALTH_CHECK', 'CRITICAL_ALERT')
    ORDER BY esl.sync_started_at DESC LIMIT 1
  ),
  daily_stats AS (
    SELECT COALESCE(SUM(facebook_leads_created), 0) as leads_today,
           COALESCE(SUM(emails_processed), 0) as emails_today
    FROM email_sync_log WHERE sync_started_at >= CURRENT_DATE
  ),
  failure_count AS (
    SELECT COUNT(*) as failures FROM email_sync_log
    WHERE status = 'failed' AND sync_started_at >= now() - INTERVAL '1 hour'
  )
  SELECT rs.status, rs.sync_started_at, rs.minutes_since,
         ds.leads_today::INTEGER, ds.emails_today::INTEGER, fc.failures::INTEGER,
         CASE WHEN rs.minutes_since < 5 AND fc.failures = 0 THEN 100
              WHEN rs.minutes_since < 10 AND fc.failures < 2 THEN 80
              WHEN rs.minutes_since < 15 AND fc.failures < 3 THEN 60
              ELSE 20 END as health_score
  FROM recent_sync rs, daily_stats ds, failure_count fc;
END;
$function$;

-- 5. Fix create_facebook_lead
DROP FUNCTION IF EXISTS public.create_facebook_lead(text, text, text);
CREATE OR REPLACE FUNCTION public.create_facebook_lead(email_content text, sender_email text, sender_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_id UUID;
  detected_service TEXT;
  customer_data JSONB := '{}';
  phone_match TEXT;
  address_match TEXT;
BEGIN
  SELECT service_name INTO detected_service
  FROM service_detection_patterns sdp
  WHERE EXISTS (
    SELECT 1 FROM unnest(sdp.detection_patterns) AS pattern
    WHERE email_content ILIKE '%' || pattern || '%'
  ) ORDER BY priority LIMIT 1;

  phone_match := (SELECT (regexp_matches(email_content, '(\+45\s?)?[\d\s\-\(\)]{8,}', 'g'))[1]);
  address_match := (SELECT (regexp_matches(email_content, '[A-Za-zæøåÆØÅ\.\s]+\d+[A-Za-zæøåÆØÅ\d\s\.,]*', 'g'))[1]);

  customer_data := jsonb_build_object(
    'extracted_phone', phone_match, 'extracted_address', address_match,
    'source_email', sender_email, 'detected_service', detected_service
  );

  INSERT INTO leads (navn, email, telefon, adresse, status, kilde, noter, ai_enriched_data, sidste_kontakt)
  VALUES (
    COALESCE(sender_name, split_part(sender_email, '@', 1)), sender_email, phone_match, address_match,
    'new', 'Facebook Lead', 'Automatisk oprettet fra Facebook lead email: ' || substr(email_content, 1, 500),
    customer_data, 'Email modtaget: ' || now()::TEXT
  ) RETURNING id INTO lead_id;
  
  RETURN lead_id;
END;
$function$;

-- Continue with remaining functions...