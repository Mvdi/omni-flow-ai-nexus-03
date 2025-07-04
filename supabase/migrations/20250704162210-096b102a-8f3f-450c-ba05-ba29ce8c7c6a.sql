-- Afslutning af RLS policy optimering - del 4

-- Drop og genopret policies for user_signatures
DROP POLICY IF EXISTS "Users can manage their own signatures" ON user_signatures;

CREATE POLICY "Optimized users can view their own signatures" ON user_signatures
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own signatures" ON user_signatures
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own signatures" ON user_signatures
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own signatures" ON user_signatures
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for quote_email_templates
DROP POLICY IF EXISTS "Users can view their own quote templates" ON quote_email_templates;
DROP POLICY IF EXISTS "Users can create their own quote templates" ON quote_email_templates;
DROP POLICY IF EXISTS "Users can update their own quote templates" ON quote_email_templates;
DROP POLICY IF EXISTS "Users can delete their own quote templates" ON quote_email_templates;

CREATE POLICY "Optimized users can view their own quote email templates" ON quote_email_templates
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own quote email templates" ON quote_email_templates
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own quote email templates" ON quote_email_templates
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own quote email templates" ON quote_email_templates
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for employee_customer_assignments
DROP POLICY IF EXISTS "Users can view their own assignments" ON employee_customer_assignments;
DROP POLICY IF EXISTS "Users can insert their own assignments" ON employee_customer_assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON employee_customer_assignments;
DROP POLICY IF EXISTS "Users can delete their own assignments" ON employee_customer_assignments;

CREATE POLICY "Optimized users can view their own assignments" ON employee_customer_assignments
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can insert their own assignments" ON employee_customer_assignments
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own assignments" ON employee_customer_assignments
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own assignments" ON employee_customer_assignments
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for optimization_runs
DROP POLICY IF EXISTS "Users can view their own optimization runs" ON optimization_runs;
DROP POLICY IF EXISTS "Users can create their own optimization runs" ON optimization_runs;
DROP POLICY IF EXISTS "Users can update their own optimization runs" ON optimization_runs;

CREATE POLICY "Optimized users can view their own optimization runs" ON optimization_runs
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own optimization runs" ON optimization_runs
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own optimization runs" ON optimization_runs
FOR UPDATE USING (user_id = public.get_current_user_id());