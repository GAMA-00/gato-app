
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('client', 'provider', 'admin')),
  residencia_id UUID REFERENCES public.residencias(id),
  has_payment_method BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY IF NOT EXISTS "Users can view their own profiles"
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profiles"
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profiles"
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create trigger function to populate profiles from existing clients/providers
CREATE OR REPLACE FUNCTION public.populate_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert from clients
  INSERT INTO public.profiles (id, name, email, phone, role, residencia_id, has_payment_method)
  SELECT c.id, c.name, c.email, c.phone, 'client', c.residencia_id, c.has_payment_method
  FROM public.clients c
  LEFT JOIN public.profiles p ON c.id = p.id
  WHERE p.id IS NULL;

  -- Insert from providers
  INSERT INTO public.profiles (id, name, email, phone, role)
  SELECT p.id, p.name, p.email, p.phone, 'provider'
  FROM public.providers p
  LEFT JOIN public.profiles pr ON p.id = pr.id
  WHERE pr.id IS NULL;
END;
$$;

-- Run the function to populate profiles
SELECT public.populate_profiles();

-- Create function to update profiles from new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
