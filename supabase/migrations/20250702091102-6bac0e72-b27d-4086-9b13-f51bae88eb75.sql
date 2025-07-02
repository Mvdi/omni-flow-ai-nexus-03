-- Fix Facebook lead creation function to use correct status values that match the database constraint
CREATE OR REPLACE FUNCTION public.create_facebook_lead(email_content text, sender_email text, sender_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  lead_id UUID;
  detected_service TEXT;
  customer_data JSONB := '{}';
  phone_match TEXT;
  address_match TEXT;
BEGIN
  -- Detecter service type fra email content
  SELECT service_name INTO detected_service
  FROM service_detection_patterns sdp
  WHERE EXISTS (
    SELECT 1 FROM unnest(sdp.detection_patterns) AS pattern
    WHERE email_content ILIKE '%' || pattern || '%'
  )
  ORDER BY priority
  LIMIT 1;

  -- Extract telefonnummer (improved pattern for Danish phone numbers)
  phone_match := (SELECT (regexp_matches(email_content, '(\+45\s?)?[\d\s\-\(\)]{8,}', 'g'))[1]);
  
  -- Extract adresse (improved pattern)
  address_match := (SELECT (regexp_matches(email_content, '[A-Za-zæøåÆØÅ\.\s]+\d+[A-Za-zæøåÆØÅ\d\s\.,]*', 'g'))[1]);

  -- Byg customer data
  customer_data := jsonb_build_object(
    'extracted_phone', phone_match,
    'extracted_address', address_match,
    'source_email', sender_email,
    'detected_service', detected_service
  );

  -- Opret lead med korrekt status værdi ('new' i stedet for 'Ny')
  INSERT INTO leads (
    navn,
    email,
    telefon,
    adresse,
    status,
    kilde,
    noter,
    ai_enriched_data,
    sidste_kontakt
  ) VALUES (
    COALESCE(sender_name, split_part(sender_email, '@', 1)),
    sender_email,
    phone_match,
    address_match,
    'new',  -- Changed from 'Ny' to 'new' to match constraint
    'Facebook Lead',
    'Automatisk oprettet fra Facebook lead email: ' || substr(email_content, 1, 500),
    customer_data,
    'Email modtaget: ' || now()::TEXT
  ) RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$function$;