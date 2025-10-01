-- Add address field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.users.address IS 'User billing address, persisted from checkout for future use';