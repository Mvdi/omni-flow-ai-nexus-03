-- Create subscriptions table for recurring maintenance services
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_address TEXT,
    service_type VARCHAR(100) NOT NULL, -- 'Vinduespudsning', 'Fliserens', etc.
    interval_weeks INTEGER NOT NULL, -- Every X weeks
    price DECIMAL(10,2) NOT NULL,
    estimated_duration INTEGER NOT NULL, -- Minutes
    description TEXT,
    notes TEXT,
    images JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled'
    start_date DATE NOT NULL,
    last_order_date DATE,
    next_due_date DATE NOT NULL,
    auto_create_orders BOOLEAN DEFAULT true,
    send_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON public.subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Add subscription_id to orders table to track which orders came from subscriptions
ALTER TABLE public.orders ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_next_due_date ON public.subscriptions(next_due_date);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_orders_subscription_id ON public.orders(subscription_id);

-- Function to calculate next due date
CREATE OR REPLACE FUNCTION calculate_next_due_date(start_date DATE, interval_weeks INTEGER, last_order_date DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
    IF last_order_date IS NULL THEN
        RETURN start_date + (interval_weeks * 7);
    ELSE
        RETURN last_order_date + (interval_weeks * 7);
    END IF;
END;
$$;

-- Function to create orders from subscriptions
CREATE OR REPLACE FUNCTION create_subscription_orders()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    sub_record RECORD;
    order_date DATE;
    i INTEGER;
BEGIN
    -- Find subscriptions that need orders created (1 week before due date)
    FOR sub_record IN 
        SELECT * FROM public.subscriptions 
        WHERE status = 'active' 
        AND auto_create_orders = true
        AND next_due_date <= CURRENT_DATE + 7
        AND next_due_date > CURRENT_DATE
    LOOP
        -- Create the main order for the due date
        INSERT INTO public.orders (
            user_id,
            subscription_id,
            order_type,
            customer,
            customer_email,
            price,
            scheduled_date,
            status,
            comment,
            address,
            priority,
            estimated_duration
        ) VALUES (
            sub_record.user_id,
            sub_record.id,
            sub_record.service_type,
            sub_record.customer_name,
            sub_record.customer_email,
            sub_record.price,
            sub_record.next_due_date,
            'Ikke planlagt',
            CONCAT('Abonnement: ', sub_record.description, CASE WHEN sub_record.notes IS NOT NULL THEN E'\nNoter: ' || sub_record.notes ELSE '' END),
            sub_record.customer_address,
            'Normal',
            sub_record.estimated_duration
        );

        -- Create the next 3 orders for planning
        FOR i IN 1..3 LOOP
            order_date := sub_record.next_due_date + (sub_record.interval_weeks * 7 * i);
            
            INSERT INTO public.orders (
                user_id,
                subscription_id,
                order_type,
                customer,
                customer_email,
                price,
                scheduled_date,
                status,
                comment,
                address,
                priority,
                estimated_duration
            ) VALUES (
                sub_record.user_id,
                sub_record.id,
                sub_record.service_type,
                sub_record.customer_name,
                sub_record.customer_email,
                sub_record.price,
                order_date,
                'Ikke planlagt',
                CONCAT('Abonnement (fremtidig): ', sub_record.description, CASE WHEN sub_record.notes IS NOT NULL THEN E'\nNoter: ' || sub_record.notes ELSE '' END),
                sub_record.customer_address,
                'Normal',
                sub_record.estimated_duration
            );
        END LOOP;

        -- Update subscription with new next due date
        UPDATE public.subscriptions 
        SET 
            next_due_date = sub_record.next_due_date + (sub_record.interval_weeks * 7),
            last_order_date = sub_record.next_due_date,
            updated_at = NOW()
        WHERE id = sub_record.id;
    END LOOP;
END;
$$;