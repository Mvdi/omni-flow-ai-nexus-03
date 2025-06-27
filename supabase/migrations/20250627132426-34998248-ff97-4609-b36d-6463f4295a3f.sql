
-- Create work_schedules table for flexible work hours per employee
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(employee_id, day_of_week)
);

-- Create blocked_time_slots table for blocking specific times
CREATE TABLE public.blocked_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies for work_schedules
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own work schedules" 
  ON public.work_schedules 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own work schedules" 
  ON public.work_schedules 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work schedules" 
  ON public.work_schedules 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work schedules" 
  ON public.work_schedules 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for blocked_time_slots
ALTER TABLE public.blocked_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocked time slots" 
  ON public.blocked_time_slots 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blocked time slots" 
  ON public.blocked_time_slots 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blocked time slots" 
  ON public.blocked_time_slots 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked time slots" 
  ON public.blocked_time_slots 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create triggers for automatic updated_at timestamps
CREATE TRIGGER update_work_schedules_updated_at
    BEFORE UPDATE ON public.work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocked_time_slots_updated_at
    BEFORE UPDATE ON public.blocked_time_slots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
