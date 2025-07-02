-- Function to convert tilbud to leads automatically
CREATE OR REPLACE FUNCTION public.create_lead_from_tilbud()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into leads table
  INSERT INTO public.leads (
    navn,
    email,
    telefon,
    adresse,
    status,
    kilde,
    noter,
    vaerdi
  ) VALUES (
    NEW.navn,
    NEW.email,
    NEW.telefon,
    NEW.adresse,
    'new',  -- Set status to new lead
    'Prisberegner',  -- Source is price calculator
    FORMAT('Prisberegning fra widget: %s interval, vedligeholdelse: %s, beregnet pris: %s', 
           NEW.interval, 
           CASE WHEN NEW.vedligeholdelse THEN 'Ja' ELSE 'Nej' END,
           NEW.beregnet_pris),
    -- Try to extract numeric value from beregnet_pris for lead value
    CASE 
      WHEN NEW.beregnet_pris ~ '^[0-9,]+' THEN 
        CAST(REPLACE(REPLACE(REGEXP_REPLACE(NEW.beregnet_pris, '[^0-9,]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create leads from new tilbud
CREATE TRIGGER create_lead_from_tilbud_trigger
  AFTER INSERT ON public.tilbud
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_from_tilbud();