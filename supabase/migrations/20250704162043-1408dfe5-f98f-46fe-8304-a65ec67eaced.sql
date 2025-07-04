-- Fortsættelse af RLS policy optimering - del 2

-- Drop og genopret policies for routes
DROP POLICY IF EXISTS "Users can view their own routes" ON routes;
DROP POLICY IF EXISTS "Users can insert their own routes" ON routes;
DROP POLICY IF EXISTS "Users can update their own routes" ON routes;
DROP POLICY IF EXISTS "Users can delete their own routes" ON routes;

CREATE POLICY "Optimized users can view their own routes" ON routes
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can insert their own routes" ON routes
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own routes" ON routes
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own routes" ON routes  
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;

CREATE POLICY "Optimized users can view their own subscriptions" ON subscriptions
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can insert their own subscriptions" ON subscriptions
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own subscriptions" ON subscriptions
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own subscriptions" ON subscriptions
FOR DELETE USING (user_id = public.get_current_user_id());

-- Drop og genopret policies for blocked_time_slots
DROP POLICY IF EXISTS "Users can view their own blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Users can create their own blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Users can update their own blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Users can delete their own blocked time slots" ON blocked_time_slots;

CREATE POLICY "Optimized users can view their own blocked time slots" ON blocked_time_slots
FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can create their own blocked time slots" ON blocked_time_slots
FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can update their own blocked time slots" ON blocked_time_slots
FOR UPDATE USING (user_id = public.get_current_user_id());

CREATE POLICY "Optimized users can delete their own blocked time slots" ON blocked_time_slots
FOR DELETE USING (user_id = public.get_current_user_id());