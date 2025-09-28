-- Fix user registration issues after database cleanup
-- Check and recreate user profile creation triggers

-- First, let's check if the create_user_profile function exists and works correctly
-- Drop and recreate the function to ensure it's working properly

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Create user profile in users table
  INSERT INTO public.users (
    id, 
    name, 
    email, 
    phone, 
    role,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    email = NEW.email,
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    role = COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- If it's a provider, also create provider record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'provider' THEN
    INSERT INTO public.providers (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- If it's a client, create client record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client' THEN
    INSERT INTO public.clients (id, residencia_id)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'residencia_id')::UUID)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure we have the missing tables (providers and clients)
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  residencia_id UUID REFERENCES public.residencias(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on these tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for providers
CREATE POLICY "Providers can view their own data" ON public.providers
  FOR ALL USING (auth.uid() = id);

-- Create basic RLS policies for clients  
CREATE POLICY "Clients can view their own data" ON public.clients
  FOR ALL USING (auth.uid() = id);

-- Test the function by checking if everything is set up correctly
SELECT 
  'trigger_exists' as check_name,
  EXISTS(
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) as result;

SELECT 
  'function_exists' as check_name,
  EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'handle_new_user'
  ) as result;