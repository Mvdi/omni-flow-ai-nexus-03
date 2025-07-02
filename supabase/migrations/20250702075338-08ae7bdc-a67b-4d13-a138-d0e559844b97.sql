-- First, delete the facebook_leads_processed entries that reference duplicate leads
DELETE FROM facebook_leads_processed 
WHERE lead_id IN (
  SELECT id FROM leads 
  WHERE id NOT IN (
    SELECT DISTINCT ON (email) id 
    FROM leads 
    WHERE kilde = 'Facebook Lead'
    ORDER BY email, created_at ASC
  ) AND kilde = 'Facebook Lead'
);

-- Then clean up duplicate Facebook leads (keep only the oldest one per email)
DELETE FROM leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id 
  FROM leads 
  WHERE kilde = 'Facebook Lead'
  ORDER BY email, created_at ASC
) AND kilde = 'Facebook Lead';