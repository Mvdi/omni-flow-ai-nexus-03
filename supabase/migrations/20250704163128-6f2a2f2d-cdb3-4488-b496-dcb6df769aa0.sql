-- Final oprydning af rate limits og duplicate indeks

-- Rate limits - rens duplicate policies
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Optimized service role can manage rate limits" ON rate_limits;

CREATE POLICY "Final rate limits access" ON rate_limits
FOR ALL USING (auth.role() = 'service_role');

-- Enhanced rate limits - rens duplicate policies  
DROP POLICY IF EXISTS "Service role can manage enhanced rate limits" ON enhanced_rate_limits;
DROP POLICY IF EXISTS "Optimized service role can manage enhanced rate limits" ON enhanced_rate_limits;

CREATE POLICY "Final enhanced rate limits access" ON enhanced_rate_limits
FOR ALL USING (auth.role() = 'service_role');

-- Fjern alle mulige duplicate indeks der kan forårsage konflikter
DROP INDEX IF EXISTS idx_support_tickets_customer_email;
DROP INDEX IF EXISTS idx_support_tickets_status;
DROP INDEX IF EXISTS idx_support_tickets_created_at;
DROP INDEX IF EXISTS idx_support_tickets_updated_at;
DROP INDEX IF EXISTS idx_support_tickets_priority;
DROP INDEX IF EXISTS idx_support_tickets_assignee_id;
DROP INDEX IF EXISTS idx_support_tickets_email_thread_id;
DROP INDEX IF EXISTS idx_support_tickets_sla_deadline;

-- Genopret kun de unikke, nødvendige indeks
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email_final ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_final ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at_final ON support_tickets(updated_at DESC);

-- Samme for ticket_messages
DROP INDEX IF EXISTS idx_ticket_messages_ticket_id;
DROP INDEX IF EXISTS idx_ticket_messages_created_at;
DROP INDEX IF EXISTS idx_ticket_messages_sender_email;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id_final ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at_final ON ticket_messages(created_at DESC);

-- Final ANALYZE for alle berørte tabeller
ANALYZE support_tickets;
ANALYZE ticket_messages;
ANALYZE customers;
ANALYZE leads;
ANALYZE authorized_emails;
ANALYZE integration_secrets;
ANALYZE kanban_columns;
ANALYZE ticket_tags;
ANALYZE email_sync_log;
ANALYZE facebook_leads_processed;
ANALYZE monitored_mailboxes;
ANALYZE service_detection_patterns;
ANALYZE rate_limits;
ANALYZE enhanced_rate_limits;