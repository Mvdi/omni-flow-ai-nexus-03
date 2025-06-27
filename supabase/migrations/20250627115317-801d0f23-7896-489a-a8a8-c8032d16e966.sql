
-- Update orders table to clarify that estimated_duration is in minutes
COMMENT ON COLUMN orders.estimated_duration IS 'Estimated duration in minutes';

-- Add new columns to employees table for better route optimization
ALTER TABLE employees ADD COLUMN IF NOT EXISTS start_location TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_radius_km DECIMAL(8,2) DEFAULT 50.0;

-- Update routes table to store more optimization data
ALTER TABLE routes ADD COLUMN IF NOT EXISTS mapbox_route_data JSONB;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS total_travel_time_minutes INTEGER;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS fuel_cost_estimate DECIMAL(8,2);

-- Add indexes for better performance on route optimization queries
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, scheduled_date) WHERE status = 'Ikke planlagt';
CREATE INDEX IF NOT EXISTS idx_employees_specialties ON employees USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_employees_areas ON employees USING GIN(preferred_areas);
