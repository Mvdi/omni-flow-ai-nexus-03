-- Løsning af de resterende 47 fejl

-- Først fjerner vi duplicate policies for email_sync_log
DROP POLICY IF EXISTS "Authenticated users can view email sync logs" ON email_sync_log;
DROP POLICY IF EXISTS "Optimized authenticated users can view email sync logs" ON email_sync_log;
DROP POLICY IF EXISTS "Service role can manage email sync logs" ON email_sync_log;
DROP POLICY IF EXISTS "Optimized service role can manage email sync logs" ON email_sync_log;

-- Opret kun én optimeret policy for hver type
CREATE POLICY "Final optimized email sync logs select" ON email_sync_log
FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Final optimized email sync logs manage" ON email_sync_log
FOR ALL USING (auth.role() = 'service_role');

-- Fjern duplicate policies for facebook_leads_processed
DROP POLICY IF EXISTS "Authenticated users can view facebook leads processed" ON facebook_leads_processed;
DROP POLICY IF EXISTS "Optimized authenticated users can view facebook leads processed" ON facebook_leads_processed;
DROP POLICY IF EXISTS "Service role can manage facebook leads processed" ON facebook_leads_processed;
DROP POLICY IF EXISTS "Optimized service role can manage facebook leads processed" ON facebook_leads_processed;

-- Opret kun én optimeret policy for hver type
CREATE POLICY "Final optimized facebook leads select" ON facebook_leads_processed
FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Final optimized facebook leads manage" ON facebook_leads_processed
FOR ALL USING (auth.role() = 'service_role');

-- Fjern mulige duplicate indeks
DROP INDEX IF EXISTS idx_customers_email;
DROP INDEX IF EXISTS idx_customers_navn;
DROP INDEX IF EXISTS idx_customers_postnummer;
DROP INDEX IF EXISTS idx_customers_email_unique;

-- Genopret kun de nødvendige indeks
CREATE INDEX IF NOT EXISTS idx_customers_email_final ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_navn_final ON customers(navn);
CREATE INDEX IF NOT EXISTS idx_customers_postnummer_final ON customers(postnummer);