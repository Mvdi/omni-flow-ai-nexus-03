
-- Create orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_type VARCHAR(100) NOT NULL,
    customer VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    scheduled_week INTEGER,
    scheduled_date DATE,
    scheduled_time TIME,
    status VARCHAR(50) NOT NULL DEFAULT 'Planlagt',
    comment TEXT,
    address TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'Normal',
    estimated_duration DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" ON orders
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_scheduled_week ON orders(scheduled_week);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_scheduled_date ON orders(scheduled_date);
