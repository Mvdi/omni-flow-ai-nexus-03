-- Remove moba@mmmultipartner.dk from monitored mailboxes since it should not be monitored
DELETE FROM monitored_mailboxes WHERE email_address = 'moba@mmmultipartner.dk';