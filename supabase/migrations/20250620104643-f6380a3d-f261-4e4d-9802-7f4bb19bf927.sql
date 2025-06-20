
-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  content TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Høj', 'Medium', 'Lav')),
  status TEXT NOT NULL DEFAULT 'Åben' CHECK (status IN ('Åben', 'I gang', 'Afventer kunde', 'Løst', 'Lukket')),
  assignee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_response_at TIMESTAMP WITH TIME ZONE,
  response_time_hours INTEGER
);

-- Create ticket messages/conversations table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  message_content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Create ticket tags table for categorization
CREATE TABLE public.ticket_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

-- Policies for support_tickets
CREATE POLICY "Users can view all tickets" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tickets" ON public.support_tickets FOR UPDATE USING (true);

-- Policies for ticket_messages
CREATE POLICY "Users can view all ticket messages" ON public.ticket_messages FOR SELECT USING (true);
CREATE POLICY "Users can create ticket messages" ON public.ticket_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update ticket messages" ON public.ticket_messages FOR UPDATE USING (true);

-- Policies for ticket_tags
CREATE POLICY "Users can view all ticket tags" ON public.ticket_tags FOR SELECT USING (true);
CREATE POLICY "Users can create ticket tags" ON public.ticket_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete ticket tags" ON public.ticket_tags FOR DELETE USING (true);

-- Create function to auto-generate ticket numbers (fixed)
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  generated_ticket_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(st.ticket_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM support_tickets st
  WHERE st.ticket_number LIKE 'T-%';
  
  generated_ticket_number := 'T-' || LPAD(next_number::TEXT, 3, '0');
  RETURN generated_ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Insert some sample data
INSERT INTO support_tickets (subject, content, customer_email, customer_name, priority, status) VALUES
('Problem med installation af software', 'Jeg kan ikke få installeret den nye software version. Får fejlmeddelelse om manglende rettigheder.', 'jens@example.com', 'Jens Hansen', 'Høj', 'Åben'),
('Faktura spørgsmål - månedlig abonnement', 'Jeg har spørgsmål til min sidste faktura. Der er nogle poster jeg ikke forstår.', 'info@nielsen.dk', 'Nielsen & Co', 'Medium', 'I gang'),
('Anmodning om feature tilføjelse', 'Vil det være muligt at tilføje export til Excel funktion i rapporten?', 'admin@techsolutions.dk', 'Tech Solutions', 'Lav', 'Afventer kunde');
