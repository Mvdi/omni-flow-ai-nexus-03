-- Fortsættelse af RLS optimering - del 3

-- Optimér email_sync_log policies
DROP POLICY IF EXISTS "Authenticated users can view email sync logs" ON email_sync_log;
DROP POLICY IF EXISTS "Service role can manage email sync logs" ON email_sync_log;

CREATE POLICY "Optimized authenticated users can view email sync logs" ON email_sync_log
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized service role can manage email sync logs" ON email_sync_log
FOR ALL USING (auth.role() = 'service_role');

-- Optimér facebook_leads_processed policies
DROP POLICY IF EXISTS "Authenticated users can view facebook leads processed" ON facebook_leads_processed;
DROP POLICY IF EXISTS "Service role can manage facebook leads processed" ON facebook_leads_processed;

CREATE POLICY "Optimized authenticated users can view facebook leads processed" ON facebook_leads_processed
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized service role can manage facebook leads processed" ON facebook_leads_processed
FOR ALL USING (auth.role() = 'service_role');

-- Optimér monitored_mailboxes policies
DROP POLICY IF EXISTS "Authenticated users can manage monitored mailboxes" ON monitored_mailboxes;
DROP POLICY IF EXISTS "Authenticated users can view monitored mailboxes" ON monitored_mailboxes;

CREATE POLICY "Optimized authenticated users can manage monitored mailboxes" ON monitored_mailboxes
FOR ALL USING (auth.role() = 'authenticated');

-- Optimér service_detection_patterns policies
DROP POLICY IF EXISTS "Authenticated users can manage service detection patterns" ON service_detection_patterns;
DROP POLICY IF EXISTS "Authenticated users can view service detection patterns" ON service_detection_patterns;

CREATE POLICY "Optimized authenticated users can manage service detection patterns" ON service_detection_patterns
FOR ALL USING (auth.role() = 'authenticated');

-- Optimér rate_limits policies (kun service role)
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;

CREATE POLICY "Optimized service role can manage rate limits" ON rate_limits
FOR ALL USING (auth.role() = 'service_role');

-- Optimér enhanced_rate_limits policies (kun service role)
DROP POLICY IF EXISTS "Service role can manage enhanced rate limits" ON enhanced_rate_limits;

CREATE POLICY "Optimized service role can manage enhanced rate limits" ON enhanced_rate_limits
FOR ALL USING (auth.role() = 'service_role');