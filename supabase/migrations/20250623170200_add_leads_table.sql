-- Create leads table for CRM
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  navn TEXT NOT NULL,
  telefon TEXT,
  email TEXT NOT NULL,
  adresse TEXT,
  postnummer TEXT,
  by TEXT,
  virksomhed TEXT,
  vaerdi INTEGER,
  prioritet TEXT CHECK (prioritet IN ('Høj', 'Medium', 'Lav')) DEFAULT 'Medium',
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost')) DEFAULT 'new',
  sidste_kontakt TIMESTAMP WITH TIME ZONE,
  noter TEXT,
  uploads JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads table
CREATE POLICY "Users can view all leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Users can create leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Users can delete leads" ON public.leads FOR DELETE USING (true);

-- Index for email for fast lookup
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads(email); 