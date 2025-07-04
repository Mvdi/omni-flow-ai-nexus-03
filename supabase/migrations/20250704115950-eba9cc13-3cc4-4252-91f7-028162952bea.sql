-- Fix functions with dependencies properly
-- We need to handle triggers and other dependencies

-- 1. Fix calculate_next_due_date (safe to drop)
DROP FUNCTION IF EXISTS public.calculate_next_due_date() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_next_due_date(date, integer, date) CASCADE;

CREATE FUNCTION public.calculate_next_due_date(start_date date, interval_weeks integer, last_order_date date)
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

-- 2. Fix mark_order_as_manually_edited (has trigger dependency)
DROP TRIGGER IF EXISTS trigger_mark_order_edited ON orders;
DROP FUNCTION IF EXISTS public.mark_order_as_manually_edited() CASCADE;

CREATE FUNCTION public.mark_order_as_manually_edited()
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

-- Recreate the trigger
CREATE TRIGGER trigger_mark_order_edited
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION mark_order_as_manually_edited();

-- 3. Fix set_quote_number (has trigger dependency)
DROP TRIGGER IF EXISTS trigger_set_quote_number ON quotes;
DROP FUNCTION IF EXISTS public.set_quote_number() CASCADE;

CREATE FUNCTION public.set_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_set_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW EXECUTE FUNCTION set_quote_number();

-- 4. Fix set_ticket_number (has trigger dependency)
DROP TRIGGER IF EXISTS trigger_set_ticket_number ON support_tickets;
DROP FUNCTION IF EXISTS public.set_ticket_number() CASCADE;

CREATE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger  
CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON support_tickets
FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

-- 5. Fix validate_user_input (has trigger dependency)
DROP TRIGGER IF EXISTS validate_leads_input ON leads;
DROP FUNCTION IF EXISTS public.validate_user_input() CASCADE;

CREATE FUNCTION public.validate_user_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.email IS NOT NULL AND NOT (NEW.email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$') THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  IF NEW.navn IS NOT NULL AND (LENGTH(NEW.navn) < 2 OR LENGTH(NEW.navn) > 50 OR NEW.navn !~ '^[a-zA-ZæøåÆØÅ\s\-''\.]+$') THEN
    RAISE EXCEPTION 'Invalid name format';
  END IF;
  
  IF NEW.adresse IS NOT NULL AND (LENGTH(NEW.adresse) < 5 OR LENGTH(NEW.adresse) > 200) THEN
    RAISE EXCEPTION 'Address must be between 5-200 characters';
  END IF;
  
  IF NEW.postnummer IS NOT NULL AND NEW.postnummer !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Invalid postal code format';
  END IF;
  
  IF NEW.navn IS NOT NULL THEN
    NEW.navn := TRIM(REGEXP_REPLACE(NEW.navn, '[<>\"''&]', '', 'g'));
  END IF;
  
  IF NEW.adresse IS NOT NULL THEN
    NEW.adresse := TRIM(REGEXP_REPLACE(NEW.adresse, '[<>\"''&]', '', 'g'));
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER validate_leads_input
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION validate_user_input();

-- 6. Fix create_lead_from_tilbud (has trigger dependency)
DROP TRIGGER IF EXISTS create_lead_trigger ON tilbud;
DROP FUNCTION IF EXISTS public.create_lead_from_tilbud() CASCADE;

CREATE FUNCTION public.create_lead_from_tilbud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO leads (navn, email, telefon, adresse, status, kilde, noter, vaerdi)
  VALUES (
    NEW.navn, NEW.email, NEW.telefon, NEW.adresse, 'new', 'Prisberegner',
    FORMAT('Prisberegning fra widget: %s interval, vedligeholdelse: %s, beregnet pris: %s', 
           NEW.interval, CASE WHEN NEW.vedligeholdelse THEN 'Ja' ELSE 'Nej' END, NEW.beregnet_pris),
    CASE WHEN NEW.beregnet_pris ~ '^[0-9,]+' THEN 
         CAST(REPLACE(REPLACE(REGEXP_REPLACE(NEW.beregnet_pris, '[^0-9,]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
         ELSE NULL END
  );
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER create_lead_trigger
AFTER INSERT ON tilbud
FOR EACH ROW EXECUTE FUNCTION create_lead_from_tilbud();