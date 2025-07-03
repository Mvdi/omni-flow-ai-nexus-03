-- Fix Function Search Path Security Issues
-- This migration addresses the mutable search_path warnings by setting an explicit search_path for all functions

-- Fix calculate_next_due_date functions (there appear to be duplicates)
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(start_date date, interval_weeks integer, last_order_date date)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    IF last_order_date IS NULL THEN
        RETURN start_date + (interval_weeks * 7);
    ELSE
        RETURN last_order_date + (interval_weeks * 7);
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_next_due_date()
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  -- Your variable declarations here
BEGIN
  -- Return statement
  RETURN NULL;  -- Replace with your actual return logic
END;
$function$;

-- Fix create_subscription_orders
CREATE OR REPLACE FUNCTION public.create_subscription_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    sub_record RECORD;
    order_date DATE;
    i INTEGER;
BEGIN
    -- Find subscriptions that need orders created (1 week before due date)
    FOR sub_record IN 
        SELECT * FROM public.subscriptions 
        WHERE status = 'active' 
        AND auto_create_orders = true
        AND next_due_date <= CURRENT_DATE + 7
        AND next_due_date > CURRENT_DATE
    LOOP
        -- Create the main order for the due date
        INSERT INTO public.orders (
            user_id,
            subscription_id,
            order_type,
            customer,
            customer_email,
            price,
            scheduled_date,
            status,
            comment,
            address,
            priority,
            estimated_duration
        ) VALUES (
            sub_record.user_id,
            sub_record.id,
            sub_record.service_type,
            sub_record.customer_name,
            sub_record.customer_email,
            sub_record.price,
            sub_record.next_due_date,
            'Ikke planlagt',
            CONCAT('Abonnement: ', sub_record.description, CASE WHEN sub_record.notes IS NOT NULL THEN E'\nNoter: ' || sub_record.notes ELSE '' END),
            sub_record.customer_address,
            'Normal',
            sub_record.estimated_duration
        );

        -- Create the next 3 orders for planning
        FOR i IN 1..3 LOOP
            order_date := sub_record.next_due_date + (sub_record.interval_weeks * 7 * i);
            
            INSERT INTO public.orders (
                user_id,
                subscription_id,
                order_type,
                customer,
                customer_email,
                price,
                scheduled_date,
                status,
                comment,
                address,
                priority,
                estimated_duration
            ) VALUES (
                sub_record.user_id,
                sub_record.id,
                sub_record.service_type,
                sub_record.customer_name,
                sub_record.customer_email,
                sub_record.price,
                order_date,
                'Ikke planlagt',
                CONCAT('Abonnement (fremtidig): ', sub_record.description, CASE WHEN sub_record.notes IS NOT NULL THEN E'\nNoter: ' || sub_record.notes ELSE '' END),
                sub_record.customer_address,
                'Normal',
                sub_record.estimated_duration
            );
        END LOOP;

        -- Update subscription with new next due date
        UPDATE public.subscriptions 
        SET 
            next_due_date = sub_record.next_due_date + (sub_record.interval_weeks * 7),
            last_order_date = sub_record.next_due_date,
            updated_at = NOW()
        WHERE id = sub_record.id;
    END LOOP;
END;
$function$;

-- Fix mark_order_as_manually_edited
CREATE OR REPLACE FUNCTION public.mark_order_as_manually_edited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If scheduled_date, scheduled_time, or assigned_employee_id changed, mark as manually edited
  IF (OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date) OR 
     (OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time) OR 
     (OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id) THEN
    NEW.edited_manually := TRUE;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix get_email_sync_health_detailed
CREATE OR REPLACE FUNCTION public.get_email_sync_health_detailed()
RETURNS TABLE(status text, last_sync_at timestamp with time zone, minutes_since_last_sync integer, facebook_leads_today integer, total_emails_today integer, consecutive_failures integer, health_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix create_facebook_lead
CREATE OR REPLACE FUNCTION public.create_facebook_lead(email_content text, sender_email text, sender_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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

  -- Extract telefonnummer (improved pattern for Danish phone numbers)
  phone_match := (SELECT (regexp_matches(email_content, '(\+45\s?)?[\d\s\-\(\)]{8,}', 'g'))[1]);
  
  -- Extract adresse (improved pattern)
  address_match := (SELECT (regexp_matches(email_content, '[A-Za-zæøåÆØÅ\.\s]+\d+[A-Za-zæøåÆØÅ\d\s\.,]*', 'g'))[1]);

  -- Byg customer data
  customer_data := jsonb_build_object(
    'extracted_phone', phone_match,
    'extracted_address', address_match,
    'source_email', sender_email,
    'detected_service', detected_service
  );

  -- Opret lead med korrekt status værdi ('new' i stedet for 'Ny')
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
    'new',  -- Changed from 'Ny' to 'new' to match constraint
    'Facebook Lead',
    'Automatisk oprettet fra Facebook lead email: ' || substr(email_content, 1, 500),
    customer_data,
    'Email modtaget: ' || now()::TEXT
  ) RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$function$;

-- Fix generate_quote_number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  next_number INTEGER;
  generated_quote_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(q.quote_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM quotes q
  WHERE q.quote_number LIKE 'Q-%';
  
  generated_quote_number := 'Q-' || LPAD(next_number::TEXT, 4, '0');
  RETURN generated_quote_number;
END;
$function$;

-- Fix set_quote_number
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix validate_user_input
CREATE OR REPLACE FUNCTION public.validate_user_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Validate email format
  IF NEW.email IS NOT NULL AND NOT (NEW.email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$') THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate name length and characters
  IF NEW.navn IS NOT NULL AND (LENGTH(NEW.navn) < 2 OR LENGTH(NEW.navn) > 50 OR NEW.navn !~ '^[a-zA-ZæøåÆØÅ\s\-''\.]+$') THEN
    RAISE EXCEPTION 'Invalid name format';
  END IF;
  
  -- Validate address length
  IF NEW.adresse IS NOT NULL AND (LENGTH(NEW.adresse) < 5 OR LENGTH(NEW.adresse) > 200) THEN
    RAISE EXCEPTION 'Address must be between 5-200 characters';
  END IF;
  
  -- Validate postal code (Danish format)
  IF NEW.postnummer IS NOT NULL AND NEW.postnummer !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Invalid postal code format';
  END IF;
  
  -- Sanitize text fields to prevent XSS
  IF NEW.navn IS NOT NULL THEN
    NEW.navn := TRIM(REGEXP_REPLACE(NEW.navn, '[<>\"''&]', '', 'g'));
  END IF;
  
  IF NEW.adresse IS NOT NULL THEN
    NEW.adresse := TRIM(REGEXP_REPLACE(NEW.adresse, '[<>\"''&]', '', 'g'));
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_max_requests integer DEFAULT 10, p_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  request_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start;
  
  -- Count current requests in window
  SELECT COALESCE(SUM(request_count), 0) 
  INTO request_count
  FROM public.rate_limits 
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start >= window_start;
  
  -- Check if limit exceeded
  IF request_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;

-- Fix audit_trigger
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix create_lead_from_tilbud
CREATE OR REPLACE FUNCTION public.create_lead_from_tilbud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert into leads table
  INSERT INTO public.leads (
    navn,
    email,
    telefon,
    adresse,
    status,
    kilde,
    noter,
    vaerdi
  ) VALUES (
    NEW.navn,
    NEW.email,
    NEW.telefon,
    NEW.adresse,
    'new',  -- Set status to new lead
    'Prisberegner',  -- Source is price calculator
    FORMAT('Prisberegning fra widget: %s interval, vedligeholdelse: %s, beregnet pris: %s', 
           NEW.interval, 
           CASE WHEN NEW.vedligeholdelse THEN 'Ja' ELSE 'Nej' END,
           NEW.beregnet_pris),
    -- Try to extract numeric value from beregnet_pris for lead value
    CASE 
      WHEN NEW.beregnet_pris ~ '^[0-9,]+' THEN 
        CAST(REPLACE(REPLACE(REGEXP_REPLACE(NEW.beregnet_pris, '[^0-9,]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$function$;

-- Fix validate_form_input
CREATE OR REPLACE FUNCTION public.validate_form_input(input_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  validated_data JSONB := '{}';
  email_regex TEXT := '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';
BEGIN
  -- Validate email if present
  IF input_data ? 'email' THEN
    IF NOT (input_data->>'email' ~ email_regex) THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    validated_data := validated_data || jsonb_build_object('email', input_data->>'email');
  END IF;
  
  -- Validate name if present
  IF input_data ? 'name' THEN
    IF LENGTH(input_data->>'name') < 2 OR LENGTH(input_data->>'name') > 50 THEN
      RAISE EXCEPTION 'Name must be between 2-50 characters';
    END IF;
    -- Sanitize name
    validated_data := validated_data || jsonb_build_object('name', 
      TRIM(REGEXP_REPLACE(input_data->>'name', '[<>\"''&]', '', 'g'))
    );
  END IF;
  
  -- Validate phone if present (Danish format)
  IF input_data ? 'phone' THEN
    IF NOT (REGEXP_REPLACE(input_data->>'phone', '[^0-9+]', '', 'g') ~ '^(\+45)?[2-9][0-9]{7}$') THEN
      RAISE EXCEPTION 'Invalid Danish phone number format';
    END IF;
    validated_data := validated_data || jsonb_build_object('phone', input_data->>'phone');
  END IF;
  
  RETURN validated_data;
END;
$function$;

-- Fix generate_ticket_number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  next_number INTEGER;
  generated_ticket_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(st.ticket_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM support_tickets st
  WHERE st.ticket_number LIKE 'T-%';
  
  generated_ticket_number := 'T-' || LPAD(next_number::TEXT, 3, '0');
  RETURN generated_ticket_number;
END;
$function$;

-- Fix set_ticket_number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix calculate_customer_score
CREATE OR REPLACE FUNCTION public.calculate_customer_score(customer_email_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    ticket_count INTEGER;
    score INTEGER := 50;
BEGIN
    SELECT COUNT(*) INTO ticket_count
    FROM support_tickets 
    WHERE customer_email = customer_email_param;
    
    IF ticket_count > 10 THEN
        score := score + 20;
    ELSIF ticket_count > 5 THEN
        score := score + 10;
    END IF;
    
    RETURN LEAST(GREATEST(score, 0), 100);
END;
$function$;

-- Fix avg_response_time_for_customer
CREATE OR REPLACE FUNCTION public.avg_response_time_for_customer(customer_email_input text)
RETURNS TABLE(avg numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT AVG(EXTRACT(EPOCH FROM (tm.created_at - st.created_at))/3600)::NUMERIC as avg
    FROM support_tickets st
    LEFT JOIN ticket_messages tm ON st.id = tm.ticket_id
    WHERE st.customer_email = customer_email_input
    AND tm.sender_email != customer_email_input
    AND tm.created_at = (
        SELECT MIN(tm2.created_at) 
        FROM ticket_messages tm2 
        WHERE tm2.ticket_id = st.id 
        AND tm2.sender_email != customer_email_input
    );
END;
$function$;

-- Move pg_net extension from public to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;