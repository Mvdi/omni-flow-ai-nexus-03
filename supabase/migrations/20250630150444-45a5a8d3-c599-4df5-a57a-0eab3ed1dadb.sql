
-- Drop the existing source constraint
ALTER TABLE support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_source_check;

-- Add the updated constraint that includes 'office365'
ALTER TABLE support_tickets 
ADD CONSTRAINT support_tickets_source_check 
CHECK (source IN ('manual', 'email', 'phone', 'chat', 'form', 'office365'));
