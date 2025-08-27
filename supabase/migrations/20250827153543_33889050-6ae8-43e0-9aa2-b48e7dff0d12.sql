-- Add has_certifications column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_certifications boolean DEFAULT false;