-- Fix Facebook leads with incorrect customer data
-- Extract correct customer data from email content and update leads

-- Create a temporary function to parse Facebook lead data
CREATE OR REPLACE FUNCTION parse_facebook_lead_data(content TEXT)
RETURNS TABLE(
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT
) AS $$
DECLARE
  lines TEXT[];
  line TEXT;
  name_found TEXT := '';
  email_found TEXT := '';
  phone_found TEXT := '';
  address_parts TEXT[] := ARRAY[]::TEXT[];
  i INTEGER;
BEGIN
  -- Split content into lines and clean them
  lines := string_to_array(content, E'\n');
  
  FOR i IN 1..LEAST(array_length(lines, 1), 10) LOOP
    line := TRIM(lines[i]);
    
    -- Skip empty lines
    IF length(line) < 2 THEN
      CONTINUE;
    END IF;
    
    -- Check for email (contains @ and valid format)
    IF line ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND email_found = '' THEN
      email_found := line;
      CONTINUE;
    END IF;
    
    -- Check for phone (Danish format)
    IF line ~ '^(\+45\s?)?[\d\s\-\(\)]{8,}$' AND phone_found = '' THEN
      phone_found := line;
      CONTINUE;
    END IF;
    
    -- Check for name (letters, spaces, Danish chars, reasonable length)
    IF line ~ '^[A-Za-zæøåÆØÅ\s]{2,50}$' AND name_found = '' AND email_found = '' AND phone_found = '' THEN
      name_found := line;
      CONTINUE;
    END IF;
    
    -- Collect address parts (after we have other data)
    IF line ~ '^[A-Za-zæøåÆØÅ\d\s\-,\.]{2,100}$' AND (name_found != '' OR email_found != '') THEN
      address_parts := array_append(address_parts, line);
    END IF;
  END LOOP;
  
  -- Return the parsed data
  RETURN QUERY SELECT 
    name_found,
    email_found,
    phone_found,
    array_to_string(address_parts, ', ');
END;
$$ LANGUAGE plpgsql;

-- Update leads with correct customer data
WITH lead_updates AS (
  SELECT 
    l.id as lead_id,
    flp.original_email_content,
    parsed.*
  FROM leads l
  JOIN facebook_leads_processed flp ON l.id = flp.lead_id
  CROSS JOIN LATERAL parse_facebook_lead_data(flp.original_email_content) as parsed
  WHERE l.kilde = 'Facebook Lead' 
    AND l.email = 'moba@mmmultipartner.dk'
    AND parsed.customer_email IS NOT NULL 
    AND parsed.customer_email != ''
)
UPDATE leads 
SET 
  navn = COALESCE(lead_updates.customer_name, leads.navn),
  email = COALESCE(lead_updates.customer_email, leads.email),
  telefon = COALESCE(lead_updates.customer_phone, leads.telefon),
  adresse = COALESCE(lead_updates.customer_address, leads.adresse),
  updated_at = now(),
  noter = REPLACE(leads.noter, 
    'Fra: Morten Baslund <moba@mmmultipartner.dk>', 
    'Fra: ' || COALESCE(lead_updates.customer_name, 'Morten Baslund') || ' <' || COALESCE(lead_updates.customer_email, 'moba@mmmultipartner.dk') || '>'
  )
FROM lead_updates
WHERE leads.id = lead_updates.lead_id;

-- Drop the temporary function
DROP FUNCTION parse_facebook_lead_data(TEXT);