-- Create table for ticket reminders
CREATE TABLE IF NOT EXISTS public.ticket_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ticket_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for ticket reminders
CREATE POLICY "Users can view their own reminders" 
ON public.ticket_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" 
ON public.ticket_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
ON public.ticket_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
ON public.ticket_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_ticket_reminders_updated_at
BEFORE UPDATE ON public.ticket_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();