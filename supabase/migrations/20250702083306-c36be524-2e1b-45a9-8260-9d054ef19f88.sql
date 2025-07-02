-- Tilføj services felt til leads tabellen
ALTER TABLE public.leads ADD COLUMN services TEXT;

-- Opdater eksisterende Facebook leads med service fra noter/emne
UPDATE public.leads 
SET services = CASE 
  WHEN lower(noter) LIKE '%vinduesvask%' OR lower(noter) LIKE '%vindues%' THEN 'Vinduesvask'
  WHEN lower(noter) LIKE '%fliserens%' OR lower(noter) LIKE '%flise%' THEN 'Fliserens' 
  WHEN lower(noter) LIKE '%algebehandling%' OR lower(noter) LIKE '%alge%' THEN 'Algebehandling'
  WHEN lower(noter) LIKE '%rengøring%' THEN 'Rengøring'
  WHEN lower(noter) LIKE '%havearbejde%' OR lower(noter) LIKE '%have%' THEN 'Havearbejde'
  ELSE NULL
END
WHERE kilde = 'Facebook Lead' AND services IS NULL;