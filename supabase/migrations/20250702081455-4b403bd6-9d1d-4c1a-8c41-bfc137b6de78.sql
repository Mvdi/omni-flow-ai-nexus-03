-- Rens Facebook lead duplikater - behold kun det ældste lead per kunde email
DELETE FROM facebook_leads_processed 
WHERE lead_id IN (
  SELECT l.id 
  FROM leads l
  WHERE l.id NOT IN (
    SELECT DISTINCT ON (email) id 
    FROM leads 
    WHERE kilde = 'Facebook Lead'
    ORDER BY email, created_at ASC
  ) AND l.kilde = 'Facebook Lead'
);

-- Slet duplikate Facebook leads (behold kun det ældste per kunde email)
DELETE FROM leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id 
  FROM leads 
  WHERE kilde = 'Facebook Lead'
  ORDER BY email, created_at ASC
) AND kilde = 'Facebook Lead';