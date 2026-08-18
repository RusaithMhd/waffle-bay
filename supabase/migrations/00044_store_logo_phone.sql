-- 00044_store_logo_phone.sql
BEGIN;

-- Add new columns to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

-- Create the store-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) for the bucket
-- Allow public read access to store assets
CREATE POLICY "Public Read Access Store Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

-- Allow authenticated users to upload store assets
CREATE POLICY "Authenticated Upload Access Store Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets');

-- Allow authenticated users to update store assets
CREATE POLICY "Authenticated Update Access Store Assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-assets');

-- Allow authenticated users to delete store assets
CREATE POLICY "Authenticated Delete Access Store Assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets');

COMMIT;
