-- Create product/service lines table for reusable quote items
CREATE TABLE quote_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'stk',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own products" 
ON quote_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" 
ON quote_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON quote_products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON quote_products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_quote_products_updated_at
BEFORE UPDATE ON quote_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update quote_templates to use text content instead of HTML
ALTER TABLE quote_templates 
DROP COLUMN template_content,
ADD COLUMN template_text TEXT NOT NULL DEFAULT '';

-- Add some example products
INSERT INTO quote_products (user_id, name, description, default_price, unit, category) 
SELECT 
  auth.uid(),
  'Vinduesvask - Almindelig bolig',
  'Standard vinduesvask for almindelig bolig, indvendigt og udvendigt',
  1500.00,
  'job',
  'Vinduesvask'
WHERE auth.uid() IS NOT NULL;