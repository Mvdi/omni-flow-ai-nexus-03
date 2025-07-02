-- Make default_price nullable and remove requirement
ALTER TABLE quote_products 
ALTER COLUMN default_price DROP NOT NULL,
ALTER COLUMN default_price SET DEFAULT NULL;