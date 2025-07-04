-- Performance optimering del 3 - statistikker og oprydning

-- Opdater statistikker for bedre query planning
ANALYZE support_tickets;
ANALYZE ticket_messages;
ANALYZE customers;
ANALYZE leads;
ANALYZE orders;
ANALYZE employees;
ANALYZE quotes;

-- Sørg for at tabeller har korrekt REPLICA IDENTITY for realtime
ALTER TABLE support_tickets REPLICA IDENTITY FULL;
ALTER TABLE ticket_messages REPLICA IDENTITY FULL;