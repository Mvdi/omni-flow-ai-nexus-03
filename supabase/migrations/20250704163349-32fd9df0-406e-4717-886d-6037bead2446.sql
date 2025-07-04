-- Del 2: Fortsættelse af Auth RLS Optimization

DROP POLICY IF EXISTS "Final kanban columns access" ON kanban_columns;
CREATE POLICY "Final kanban columns access" ON kanban_columns
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final ticket tags access" ON ticket_tags;
CREATE POLICY "Final ticket tags access" ON ticket_tags
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final monitored mailboxes access" ON monitored_mailboxes;
CREATE POLICY "Final monitored mailboxes access" ON monitored_mailboxes
FOR ALL USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Final service detection patterns access" ON service_detection_patterns;
CREATE POLICY "Final service detection patterns access" ON service_detection_patterns
FOR ALL USING ((select auth.role()) = 'authenticated');

-- Løs Multiple Permissive Policies problemerne ved at fjerne overlappende policies
-- Email sync log - fjern de overlappende policies og lav en enkelt effektiv policy
DROP POLICY IF EXISTS "Final optimized email sync logs select" ON email_sync_log;
DROP POLICY IF EXISTS "Final optimized email sync logs manage" ON email_sync_log;

CREATE POLICY "Final email sync log access" ON email_sync_log
FOR ALL USING ((select auth.role()) IN ('authenticated', 'service_role'));

-- Facebook leads processed - samme tilgang
DROP POLICY IF EXISTS "Final optimized facebook leads select" ON facebook_leads_processed;
DROP POLICY IF EXISTS "Final optimized facebook leads manage" ON facebook_leads_processed;

CREATE POLICY "Final facebook leads access" ON facebook_leads_processed
FOR ALL USING ((select auth.role()) IN ('authenticated', 'service_role'));