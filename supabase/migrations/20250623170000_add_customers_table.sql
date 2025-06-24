-- Create customers table for storing customer information
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  navn TEXT,
  telefon TEXT,
  adresse TEXT,
  postnummer TEXT,
  by TEXT,
  cvr TEXT,
  virksomhedsnavn TEXT,
  kundetype TEXT DEFAULT 'Ny' CHECK (kundetype IN ('Ny', 'Eksisterende')),
  noter TEXT,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
CREATE POLICY "Users can view all customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Users can create customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update customers" ON public.customers FOR UPDATE USING (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);

-- Create function to calculate customer score
CREATE OR REPLACE FUNCTION calculate_customer_score(customer_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  total_tickets INTEGER;
  resolved_tickets INTEGER;
  avg_response_time NUMERIC;
  high_priority_tickets INTEGER;
  score INTEGER;
BEGIN
  -- Get total tickets
  SELECT COUNT(*) INTO total_tickets
  FROM support_tickets
  WHERE customer_email = $1;
  
  -- Get resolved tickets
  SELECT COUNT(*) INTO resolved_tickets
  FROM support_tickets
  WHERE customer_email = $1 AND status IN ('Løst', 'Lukket');
  
  -- Get average response time
  SELECT COALESCE(AVG(response_time_hours), 0) INTO avg_response_time
  FROM support_tickets
  WHERE customer_email = $1 AND response_time_hours IS NOT NULL;
  
  -- Get high priority tickets
  SELECT COUNT(*) INTO high_priority_tickets
  FROM support_tickets
  WHERE customer_email = $1 AND priority = 'Høj';
  
  -- Calculate score (higher is better)
  score := 0;
  
  -- Base score from resolved tickets ratio
  IF total_tickets > 0 THEN
    score := score + (resolved_tickets * 100 / total_tickets);
  END IF;
  
  -- Bonus for good response time (lower is better)
  IF avg_response_time > 0 AND avg_response_time < 24 THEN
    score := score + 20;
  ELSIF avg_response_time >= 24 AND avg_response_time < 48 THEN
    score := score + 10;
  END IF;
  
  -- Penalty for high priority tickets
  score := score - (high_priority_tickets * 10);
  
  -- Ensure score is between 0 and 100
  score := GREATEST(0, LEAST(100, score));
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Create function to update customer type based on ticket history
CREATE OR REPLACE FUNCTION update_customer_type(customer_email TEXT)
RETURNS TEXT AS $$
DECLARE
  total_tickets INTEGER;
  customer_type TEXT;
BEGIN
  SELECT COUNT(*) INTO total_tickets
  FROM support_tickets
  WHERE customer_email = $1;
  
  IF total_tickets > 1 THEN
    customer_type := 'Eksisterende';
  ELSE
    customer_type := 'Ny';
  END IF;
  
  RETURN customer_type;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update customer score and type when tickets change
CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer score
  UPDATE customers 
  SET score = calculate_customer_score(NEW.customer_email),
      kundetype = update_customer_type(NEW.customer_email),
      updated_at = now()
  WHERE email = NEW.customer_email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_metrics
  AFTER INSERT OR UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_metrics(); 