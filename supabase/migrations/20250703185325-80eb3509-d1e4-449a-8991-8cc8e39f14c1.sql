-- Add PRP-required fields to orders table for enhanced Fenster-style planning
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS edited_manually BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS optimization_run_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS distance_from_previous_km NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fuel_cost_estimate NUMERIC DEFAULT NULL;

-- Add PRP fields to routes table for OR-Tools style optimization
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS or_tools_solution JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS optimization_method TEXT DEFAULT 'intelligent_auto',
ADD COLUMN IF NOT EXISTS capacity_constraints JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS distance_matrix JSONB DEFAULT NULL;

-- Create optimization_runs table to track optimization sessions
CREATE TABLE IF NOT EXISTS public.optimization_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  run_type TEXT NOT NULL DEFAULT 'weekly',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  orders_optimized INTEGER DEFAULT 0,
  total_distance_km NUMERIC DEFAULT NULL,
  fuel_savings_estimate NUMERIC DEFAULT NULL,
  error_details TEXT DEFAULT NULL,
  optimization_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on optimization_runs
ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for optimization_runs
CREATE POLICY "Users can view their own optimization runs" 
ON public.optimization_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own optimization runs" 
ON public.optimization_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization runs" 
ON public.optimization_runs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to automatically update optimization_run_id when orders are edited
CREATE OR REPLACE FUNCTION public.mark_order_as_manually_edited()
RETURNS TRIGGER AS $$
BEGIN
  -- If scheduled_date, scheduled_time, or assigned_employee_id changed, mark as manually edited
  IF (OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date) OR 
     (OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time) OR 
     (OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id) THEN
    NEW.edited_manually := TRUE;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic manual edit detection
DROP TRIGGER IF EXISTS trigger_mark_order_edited ON public.orders;
CREATE TRIGGER trigger_mark_order_edited
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_order_as_manually_edited();

-- Update existing orders to have proper initial values
UPDATE public.orders 
SET edited_manually = FALSE 
WHERE edited_manually IS NULL;