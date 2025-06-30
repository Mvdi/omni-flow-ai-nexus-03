
-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true);

-- Create RLS policies for ticket attachments
CREATE POLICY "Anyone can view ticket attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can upload ticket attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ticket attachments" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete ticket attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');
