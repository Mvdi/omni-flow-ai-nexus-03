
-- First, let's drop the existing constraint that's causing the issue
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add the correct status constraint with all allowed values
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'));
