-- Afsluttende oprydning af alle resterende duplicate policies

-- Leads - sammensmelt alle policies
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON leads;
DROP POLICY IF EXISTS "Optimized authenticated users can view all leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Optimized authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Optimized authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;
DROP POLICY IF EXISTS "Optimized authenticated users can delete leads" ON leads;

CREATE POLICY "Final leads access" ON leads
FOR ALL USING (auth.role() = 'authenticated');

-- Integration secrets - sammensmelt
DROP POLICY IF EXISTS "Authenticated users can manage integration secrets" ON integration_secrets;
DROP POLICY IF EXISTS "Optimized authenticated users can manage integration secrets" ON integration_secrets;

CREATE POLICY "Final integration secrets access" ON integration_secrets
FOR ALL USING (auth.role() = 'authenticated');

-- Kanban columns - sammensmelt
DROP POLICY IF EXISTS "Authenticated users can manage columns" ON kanban_columns;
DROP POLICY IF EXISTS "Optimized authenticated users can manage columns" ON kanban_columns;

CREATE POLICY "Final kanban columns access" ON kanban_columns
FOR ALL USING (auth.role() = 'authenticated');

-- Ticket tags - sammensmelt
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON ticket_tags;
DROP POLICY IF EXISTS "Optimized authenticated users can manage tags" ON ticket_tags;

CREATE POLICY "Final ticket tags access" ON ticket_tags
FOR ALL USING (auth.role() = 'authenticated');

-- Monitored mailboxes - sammensmelt
DROP POLICY IF EXISTS "Authenticated users can manage monitored mailboxes" ON monitored_mailboxes;
DROP POLICY IF EXISTS "Optimized authenticated users can manage monitored mailboxes" ON monitored_mailboxes;

CREATE POLICY "Final monitored mailboxes access" ON monitored_mailboxes
FOR ALL USING (auth.role() = 'authenticated');

-- Service detection patterns - samlensmelt
DROP POLICY IF EXISTS "Authenticated users can manage service detection patterns" ON service_detection_patterns;
DROP POLICY IF EXISTS "Optimized authenticated users can manage service detection patterns" ON service_detection_patterns;

CREATE POLICY "Final service detection patterns access" ON service_detection_patterns
FOR ALL USING (auth.role() = 'authenticated');