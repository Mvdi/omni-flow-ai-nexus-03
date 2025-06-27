
-- Fix database overflow issues and missing fields in orders table
ALTER TABLE orders 
  ALTER COLUMN estimated_duration TYPE INTEGER;

-- Add missing expected_completion_time field
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS expected_completion_time TIME WITHOUT TIME ZONE;

-- Fix precision issues with other numeric fields
ALTER TABLE orders 
  ALTER COLUMN price TYPE DECIMAL(10,2);

-- Ensure latitude/longitude have proper precision for GPS coordinates
ALTER TABLE orders 
  ALTER COLUMN latitude TYPE DECIMAL(10,6),
  ALTER COLUMN longitude TYPE DECIMAL(10,6);

-- Fix employees table numeric fields
ALTER TABLE employees 
  ALTER COLUMN latitude TYPE DECIMAL(10,6),
  ALTER COLUMN longitude TYPE DECIMAL(10,6),
  ALTER COLUMN hourly_rate TYPE DECIMAL(10,2),
  ALTER COLUMN work_radius_km TYPE DECIMAL(8,2);

-- Fix routes table numeric fields
ALTER TABLE routes 
  ALTER COLUMN estimated_distance_km TYPE DECIMAL(10,2),
  ALTER COLUMN actual_distance_km TYPE DECIMAL(10,2),
  ALTER COLUMN estimated_duration_hours TYPE DECIMAL(8,2),
  ALTER COLUMN actual_duration_hours TYPE DECIMAL(8,2),
  ALTER COLUMN total_revenue TYPE DECIMAL(10,2),
  ALTER COLUMN fuel_cost_estimate TYPE DECIMAL(8,2),
  ALTER COLUMN optimization_score TYPE DECIMAL(5,2);

-- Add indexes for better performance on route optimization queries
CREATE INDEX IF NOT EXISTS idx_orders_coordinates ON orders(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_unscheduled ON orders(status, assigned_employee_id) WHERE status = 'Ikke planlagt' OR assigned_employee_id IS NULL;
