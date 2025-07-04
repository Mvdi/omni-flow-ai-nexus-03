-- Fix remaining functions (part 3 - final)

DROP FUNCTION IF EXISTS public.generate_quote_number() CASCADE;
CREATE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer) CASCADE;
CREATE FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_max_requests integer DEFAULT 10, p_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  request_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;
  
  DELETE FROM rate_limits WHERE window_start < window_start;
  
  SELECT COALESCE(SUM(request_count), 0) INTO request_count
  FROM rate_limits 
  WHERE identifier = p_identifier AND endpoint = p_endpoint AND window_start >= window_start;
  
  IF request_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;

DROP FUNCTION IF EXISTS public.validate_form_input(jsonb) CASCADE;
CREATE FUNCTION public.validate_form_input(input_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  validated_data JSONB := '{}';
  email_regex TEXT := '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';
BEGIN
  IF input_data ? 'email' THEN
    IF NOT (input_data->>'email' ~ email_regex) THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    validated_data := validated_data || jsonb_build_object('email', input_data->>'email');
  END IF;
  
  IF input_data ? 'name' THEN
    IF LENGTH(input_data->>'name') < 2 OR LENGTH(input_data->>'name') > 50 THEN
      RAISE EXCEPTION 'Name must be between 2-50 characters';
    END IF;
    validated_data := validated_data || jsonb_build_object('name', 
      TRIM(REGEXP_REPLACE(input_data->>'name', '[<>\"''&]', '', 'g')));
  END IF;
  
  IF input_data ? 'phone' THEN
    IF NOT (REGEXP_REPLACE(input_data->>'phone', '[^0-9+]', '', 'g') ~ '^(\+45)?[2-9][0-9]{7}$') THEN
      RAISE EXCEPTION 'Invalid Danish phone number format';
    END IF;
    validated_data := validated_data || jsonb_build_object('phone', input_data->>'phone');
  END IF;
  
  RETURN validated_data;
END;
$function$;

DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;
CREATE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP FUNCTION IF EXISTS public.calculate_customer_score(text) CASCADE;
CREATE FUNCTION public.calculate_customer_score(customer_email_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP FUNCTION IF EXISTS public.avg_response_time_for_customer(text) CASCADE;
CREATE FUNCTION public.avg_response_time_for_customer(customer_email_input text)
RETURNS TABLE(avg numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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