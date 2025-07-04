-- Fortsættelse af RLS policy optimering - del 3

-- Drop og genopret policies for quote_templates
DROP POLICY IF EXISTS "Users can view their own templates" ON quote_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON quote_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON quote_templates;

CREATE POLICY "Optimized users can view their own templates" ON quote_templates
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own templates" ON quote_templates
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own templates" ON quote_templates
FOR UPDATE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for quote_products
DROP POLICY IF EXISTS "Users can view their own products" ON quote_products;
DROP POLICY IF EXISTS "Users can create their own products" ON quote_products;
DROP POLICY IF EXISTS "Users can update their own products" ON quote_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON quote_products;

CREATE POLICY "Optimized users can view their own products" ON quote_products
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own products" ON quote_products
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own products" ON quote_products
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own products" ON quote_products
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for work_schedules  
DROP POLICY IF EXISTS "Users can view their own work schedules" ON work_schedules;
DROP POLICY IF EXISTS "Users can create their own work schedules" ON work_schedules;
DROP POLICY IF EXISTS "Users can update their own work schedules" ON work_schedules;
DROP POLICY IF EXISTS "Users can delete their own work schedules" ON work_schedules;

CREATE POLICY "Optimized users can view their own work schedules" ON work_schedules
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own work schedules" ON work_schedules
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own work schedules" ON work_schedules
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own work schedules" ON work_schedules
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for ticket_reminders
DROP POLICY IF EXISTS "Users can view their own reminders" ON ticket_reminders;
DROP POLICY IF EXISTS "Users can create their own reminders" ON ticket_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON ticket_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON ticket_reminders;

CREATE POLICY "Optimized users can view their own reminders" ON ticket_reminders
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own reminders" ON ticket_reminders
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own reminders" ON ticket_reminders
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own reminders" ON ticket_reminders
FOR DELETE USING (user_id = public.get_current_user_id());