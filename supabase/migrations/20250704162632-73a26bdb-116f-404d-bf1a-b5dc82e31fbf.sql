-- Afsluttende RLS optimering - de sidste tabeller

-- Optimér audit_log policies
-- Audit log skal kun være tilgængelig for admins, så vi bruger en specifik funktion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_log;

CREATE POLICY "Optimized only admins can view audit logs" ON audit_log
FOR SELECT USING (public.is_admin());

-- Optimér security_events policies
DROP POLICY IF EXISTS "Only admins can view security events" ON security_events;

CREATE POLICY "Optimized only admins can view security events" ON security_events
FOR SELECT USING (public.is_admin());

-- Tilføj indeks optimering for de nyligt optimerede policies
CREATE INDEX IF NOT EXISTS idx_profiles_role_optimization ON profiles(id, role) WHERE role IS NOT NULL;

-- Final statistik opdatering for alle optimerede tabeller
ANALYZE profiles;
ANALYZE authorized_emails;
ANALYZE support_tickets;
ANALYZE ticket_messages;
ANALYZE customers;
ANALYZE leads;
ANALYZE integration_secrets;
ANALYZE kanban_columns;
ANALYZE ticket_tags;
ANALYZE email_sync_log;
ANALYZE facebook_leads_processed;
ANALYZE monitored_mailboxes;
ANALYZE service_detection_patterns;
ANALYZE rate_limits;
ANALYZE enhanced_rate_limits;
ANALYZE audit_log;
ANALYZE security_events;