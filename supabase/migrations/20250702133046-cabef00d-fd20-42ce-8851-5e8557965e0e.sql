-- Create table for price calculator widget
CREATE TABLE IF NOT EXISTS public.tilbud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn TEXT NOT NULL,
  adresse TEXT NOT NULL,
  telefon TEXT NOT NULL,
  email TEXT NOT NULL,
  interval TEXT NOT NULL,
  vedligeholdelse BOOLEAN NOT NULL,
  beregnet_pris TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tilbud ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert for public API access
CREATE POLICY "Allow insert for anon"
ON public.tilbud
FOR INSERT
TO anon
WITH CHECK (true);