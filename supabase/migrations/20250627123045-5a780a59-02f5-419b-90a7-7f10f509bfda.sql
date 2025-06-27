
-- Add coordinate fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS bfe_number VARCHAR(50);

-- Add coordinate fields to orders table  
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS bfe_number VARCHAR(50);

-- Create index for geographical searches
CREATE INDEX IF NOT EXISTS idx_employees_coordinates ON employees(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_orders_coordinates ON orders(latitude, longitude);
