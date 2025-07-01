
-- Set all existing priority values to NULL to ensure clean slate
-- This removes all "default" priorities that were set automatically
UPDATE support_tickets 
SET priority = NULL 
WHERE priority IS NOT NULL;

-- Ensure the column allows NULL values (should already be the case)
ALTER TABLE support_tickets 
ALTER COLUMN priority DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN support_tickets.priority IS 'Priority should only be set when explicitly chosen by user, defaults to NULL';
