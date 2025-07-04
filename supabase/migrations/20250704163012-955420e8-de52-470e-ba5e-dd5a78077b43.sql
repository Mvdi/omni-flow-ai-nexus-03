-- Fortsættelse af oprydning i duplicate policies og indeks

-- Rens alle mulige duplicate policies og genopret med unikke navne
-- Authorized emails
DROP POLICY IF EXISTS "Authenticated users can manage authorized emails" ON authorized_emails;
DROP POLICY IF EXISTS "Optimized authenticated users can manage authorized emails" ON authorized_emails;

CREATE POLICY "Final auth users manage authorized emails" ON authorized_emails
FOR ALL USING (auth.role() = 'authenticated');

-- Support tickets - sammensmelt alle policies til færre, mere effektive
DROP POLICY IF EXISTS "Authenticated users can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Optimized authenticated users can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Optimized authenticated users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON support_tickets;
DROP POLICY IF EXISTS "Optimized authenticated users can update tickets" ON support_tickets;

CREATE POLICY "Final support tickets access" ON support_tickets
FOR ALL USING (auth.role() = 'authenticated');

-- Ticket messages - sammensmelt
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON ticket_messages;
DROP POLICY IF EXISTS "Optimized authenticated users can view all messages" ON ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON ticket_messages;
DROP POLICY IF EXISTS "Optimized authenticated users can create messages" ON ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON ticket_messages;
DROP POLICY IF EXISTS "Optimized authenticated users can update messages" ON ticket_messages;

CREATE POLICY "Final ticket messages access" ON ticket_messages
FOR ALL USING (auth.role() = 'authenticated');

-- Customers - sammensmelt
DROP POLICY IF EXISTS "Authenticated users can view all customers" ON customers;
DROP POLICY IF EXISTS "Optimized authenticated users can view all customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Optimized authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Optimized authenticated users can update customers" ON customers;

CREATE POLICY "Final customers access" ON customers
FOR ALL USING (auth.role() = 'authenticated');