-- Fix foreign key constraint to allow cascade delete
ALTER TABLE facebook_leads_processed 
DROP CONSTRAINT IF EXISTS facebook_leads_processed_lead_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE facebook_leads_processed 
ADD CONSTRAINT facebook_leads_processed_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;