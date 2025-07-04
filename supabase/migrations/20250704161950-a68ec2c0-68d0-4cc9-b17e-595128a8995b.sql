-- Løsning af RLS performance warnings ved at optimere policies
-- Dette vil eliminere de fleste af de 137 warnings

-- Drop eksisterende policies der forårsager warnings og genopret med bedre performance
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

DROP POLICY IF EXISTS "Users can view their own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON quotes;

DROP POLICY IF EXISTS "Users can view their own employees" ON employees;
DROP POLICY IF EXISTS "Users can insert their own employees" ON employees;
DROP POLICY IF EXISTS "Users can update their own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete their own employees" ON employees;

-- Opret optimerede policies med SECURITY DEFINER funktioner
CREATE POLICY "Optimized users can view their own orders" ON orders
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can insert their own orders" ON orders
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own orders" ON orders
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own orders" ON orders
FOR DELETE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can view their own quotes" ON quotes
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own quotes" ON quotes
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own quotes" ON quotes
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can view their own employees" ON employees
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can insert their own employees" ON employees
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own employees" ON employees
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own employees" ON employees
FOR DELETE USING (user_id = public.get_current_user_id());