
-- Create employees table
CREATE TABLE employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    specialties TEXT[], -- Array of specialties like ['Vinduespolering', 'Facaderengøring']
    preferred_areas TEXT[], -- Array of preferred work areas
    max_hours_per_day DECIMAL(4,2) DEFAULT 8.0,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create routes table for route optimization
CREATE TABLE routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    route_date DATE NOT NULL,
    start_location TEXT,
    estimated_distance_km DECIMAL(8,2),
    estimated_duration_hours DECIMAL(4,2),
    actual_distance_km DECIMAL(8,2),
    actual_duration_hours DECIMAL(4,2),
    total_revenue DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Planlagt',
    ai_optimized BOOLEAN DEFAULT false,
    optimization_score DECIMAL(5,2), -- AI score for route efficiency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create employee_customer_assignments for tracking which employees handle which customers
CREATE TABLE employee_customer_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT true, -- Primary employee for this customer
    assignment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(employee_id, customer_email, user_id)
);

-- Add new columns to orders table for employee and route assignment
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id),
ADD COLUMN IF NOT EXISTS order_sequence INTEGER, -- Order within the route
ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER, -- Time to travel to this order
ADD COLUMN IF NOT EXISTS ai_suggested_time TIME; -- AI suggested optimal time

-- Enable RLS on new tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_customer_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees
CREATE POLICY "Users can view their own employees" ON employees
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own employees" ON employees
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own employees" ON employees
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own employees" ON employees
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for routes
CREATE POLICY "Users can view their own routes" ON routes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own routes" ON routes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routes" ON routes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routes" ON routes
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for employee_customer_assignments
CREATE POLICY "Users can view their own assignments" ON employee_customer_assignments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assignments" ON employee_customer_assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assignments" ON employee_customer_assignments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assignments" ON employee_customer_assignments
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_employee_date ON routes(employee_id, route_date);
CREATE INDEX idx_assignments_user_id ON employee_customer_assignments(user_id);
CREATE INDEX idx_assignments_employee ON employee_customer_assignments(employee_id);
CREATE INDEX idx_orders_employee ON orders(assigned_employee_id);
CREATE INDEX idx_orders_route ON orders(route_id);
