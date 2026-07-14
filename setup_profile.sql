-- 1. Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  email TEXT PRIMARY KEY,
  display_name TEXT,
  mobile_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the avatars storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow public read access to avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 4. Allow authenticated uploads to avatars
CREATE POLICY "Enable insert for authenticated users" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Enable update for authenticated users"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' );
