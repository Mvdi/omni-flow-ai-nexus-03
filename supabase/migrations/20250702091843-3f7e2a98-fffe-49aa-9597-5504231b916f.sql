-- Add missing moba@mmmultipartner.dk mailbox to monitored mailboxes
-- This is the mailbox where Karen Tambo Facebook lead email was sent
INSERT INTO monitored_mailboxes (email_address, is_active, created_at, updated_at)
VALUES ('moba@mmmultipartner.dk', true, now(), now())
ON CONFLICT (email_address) DO UPDATE SET 
  is_active = true,
  updated_at = now();