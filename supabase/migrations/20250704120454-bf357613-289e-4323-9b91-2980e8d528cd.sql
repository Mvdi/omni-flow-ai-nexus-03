-- Fix the remaining audit_trigger function
ALTER FUNCTION public.audit_trigger() SET search_path = public;