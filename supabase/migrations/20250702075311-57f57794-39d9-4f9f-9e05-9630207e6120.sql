-- Clean up duplicate Facebook leads (keep only the oldest one per email)
DELETE FROM leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id 
  FROM leads 
  WHERE kilde = 'Facebook Lead'
  ORDER BY email, created_at ASC
) AND kilde = 'Facebook Lead';