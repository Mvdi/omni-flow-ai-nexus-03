-- Fortsættelse af RLS optimering - del 2

-- Optimér customers policies
DROP POLICY IF EXISTS "Authenticated users can view all customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;

CREATE POLICY "Optimized authenticated users can view all customers" ON customers
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can create customers" ON customers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can update customers" ON customers
FOR UPDATE USING (auth.role() = 'authenticated');

-- Optimér leads policies
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

CREATE POLICY "Optimized authenticated users can view all leads" ON leads
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can create leads" ON leads
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can update leads" ON leads
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can delete leads" ON leads
FOR DELETE USING (auth.role() = 'authenticated');

-- Optimér integration_secrets policies
DROP POLICY IF EXISTS "Authenticated users can manage integration secrets" ON integration_secrets;
DROP POLICY IF EXISTS "Authenticated users can view integration secrets" ON integration_secrets;

CREATE POLICY "Optimized authenticated users can manage integration secrets" ON integration_secrets
FOR ALL USING (auth.role() = 'authenticated');

-- Optimér kanban_columns policies
DROP POLICY IF EXISTS "Authenticated users can manage columns" ON kanban_columns;
DROP POLICY IF EXISTS "Authenticated users can view columns" ON kanban_columns;

CREATE POLICY "Optimized authenticated users can manage columns" ON kanban_columns
FOR ALL USING (auth.role() = 'authenticated');

-- Optimér ticket_tags policies
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON ticket_tags;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON ticket_tags;

CREATE POLICY "Optimized authenticated users can manage tags" ON ticket_tags
FOR ALL USING (auth.role() = 'authenticated');