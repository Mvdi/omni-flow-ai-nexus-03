-- Add missing status values to support_tickets status constraint
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check 
CHECK (status = ANY (ARRAY['Åben'::text, 'I gang'::text, 'Afventer kunde'::text, 'Løst'::text, 'Lukket'::text, 'Nyt svar'::text]));

-- Update the default status value for support_tickets to match Danish convention
ALTER TABLE support_tickets ALTER COLUMN status SET DEFAULT 'Åben';