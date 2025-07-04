-- Create storage bucket for company assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-assets', 'company-assets', true, 52428800, ARRAY['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for company assets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "Authenticated can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update" ON storage.objects FOR UPDATE USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete" ON storage.objects FOR DELETE USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');