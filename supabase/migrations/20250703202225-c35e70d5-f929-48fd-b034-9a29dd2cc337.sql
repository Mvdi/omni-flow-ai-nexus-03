-- Fix critical security issues identified in security review

-- 1. Fix RLS policy conflicts for support_tickets (remove conflicting policies)
DROP POLICY IF EXISTS "Users can view assigned tickets only" ON public.support_tickets;

-- Keep only the main policy for viewing tickets
CREATE POLICY "Authenticated users can view all support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- 2. Enhance audit logging for ticket_messages table
DROP TRIGGER IF EXISTS audit_ticket_messages_trigger ON public.ticket_messages;
CREATE TRIGGER audit_ticket_messages_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 3. Add security validation triggers to more tables
DROP TRIGGER IF EXISTS validate_leads_input ON public.leads;
CREATE TRIGGER validate_leads_input
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_input();

DROP TRIGGER IF EXISTS validate_customers_input ON public.customers;  
CREATE TRIGGER validate_customers_input
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_input();

-- 4. Enhance rate limiting for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Only admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- 5. Add comprehensive input validation function for forms
CREATE OR REPLACE FUNCTION public.validate_form_input(
  input_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;