-- Remove check constraints on priority and status in support_tickets
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check; 