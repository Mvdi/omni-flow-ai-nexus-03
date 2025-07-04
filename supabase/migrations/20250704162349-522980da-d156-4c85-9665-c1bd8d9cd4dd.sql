-- Fortsættelse af RLS optimering for de resterende tabeller med warnings

-- Optimér profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Optimized users can view their own profile" ON profiles
FOR SELECT USING (id = public.get_current_user_id());

CREATE POLICY "Optimized users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own profile" ON profiles
FOR UPDATE USING (id = public.get_current_user_id());

-- Optimér authorized_emails policies - disse skal kun være for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage authorized emails" ON authorized_emails;
DROP POLICY IF EXISTS "Authenticated users can view authorized emails" ON authorized_emails;

CREATE POLICY "Optimized authenticated users can manage authorized emails" ON authorized_emails
FOR ALL USING (auth.role() = 'authenticated');

-- Optimér support_tickets policies - disse skal kun være for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON support_tickets;

CREATE POLICY "Optimized authenticated users can view all support tickets" ON support_tickets
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can create tickets" ON support_tickets
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can update tickets" ON support_tickets
FOR UPDATE USING (auth.role() = 'authenticated');

-- Optimér ticket_messages policies
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON ticket_messages;

CREATE POLICY "Optimized authenticated users can view all messages" ON ticket_messages
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can create messages" ON ticket_messages
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Optimized authenticated users can update messages" ON ticket_messages
FOR UPDATE USING (auth.role() = 'authenticated');