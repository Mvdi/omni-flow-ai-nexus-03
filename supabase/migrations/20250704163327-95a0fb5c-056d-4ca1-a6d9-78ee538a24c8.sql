-- Løsning af de resterende 35 fejl - del 1: Auth RLS Optimization

-- Først løser vi auth RLS initialization problems ved at bruge (select auth.role())
-- Dette undgår at auth.role() evalueres for hver række

DROP POLICY IF EXISTS "Final rate limits access" ON rate_limits;
CREATE POLICY "Final rate limits access" ON rate_limits
FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Final enhanced rate limits access" ON enhanced_rate_limits;
CREATE POLICY "Final enhanced rate limits access" ON enhanced_rate_limits
FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Final auth users manage authorized emails" ON authorized_emails;
CREATE POLICY "Final auth users manage authorized emails" ON authorized_emails
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final support tickets access" ON support_tickets;
CREATE POLICY "Final support tickets access" ON support_tickets
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final ticket messages access" ON ticket_messages;
CREATE POLICY "Final ticket messages access" ON ticket_messages
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final customers access" ON customers;
CREATE POLICY "Final customers access" ON customers
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final leads access" ON leads;
CREATE POLICY "Final leads access" ON leads
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final integration secrets access" ON integration_secrets;
CREATE POLICY "Final integration secrets access" ON integration_secrets
FOR ALL USING ((select auth.role()) = 'authenticated');