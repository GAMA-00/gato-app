-- ============================================
-- CRITICAL SECURITY FIX: Implement Proper RBAC System
-- ============================================

-- 1. Create app_role enum type (if not exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'provider', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table with proper security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create SECURITY DEFINER function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Create helper function to get user's primary role (for backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'provider' THEN 2
      WHEN 'client' THEN 3
    END
  LIMIT 1
$$;

-- 5. Migrate existing roles from users table to user_roles table
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, role::app_role, created_at
FROM public.users
WHERE role IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = users.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Drop and recreate RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX PUBLIC DATA EXPOSURE: Secure appointments table
-- ============================================

-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Allow public read access to appointments for availability" ON public.appointments;
DROP POLICY IF EXISTS "Allow public read access for availability" ON public.appointments;

-- Update existing admin policies to use has_role
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
CREATE POLICY "Admins can update all appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX PUBLIC DATA EXPOSURE: Secure users table
-- ============================================

-- Drop dangerous public read policies on users
DROP POLICY IF EXISTS "Allow public read access to providers" ON public.users;
DROP POLICY IF EXISTS "Allow users to read all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create secure policy: users can only view their own full profile
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create secure policy: admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create a public view for provider discovery (ONLY non-sensitive data)
CREATE OR REPLACE VIEW public.provider_public_profiles AS
SELECT 
  u.id,
  u.name,
  u.avatar_url,
  u.about_me,
  u.experience_years,
  u.certification_files,
  COALESCE(
    (SELECT AVG(rating)::numeric(3,2) 
     FROM provider_ratings 
     WHERE provider_id = u.id), 
    0
  ) as average_rating,
  -- NO email, NO phone, NO address, NO house_number
  u.created_at
FROM public.users u
WHERE u.role = 'provider';

-- Allow public read on the safe provider view
GRANT SELECT ON public.provider_public_profiles TO anon, authenticated;

-- ============================================
-- Update other admin-related policies to use has_role
-- ============================================

-- Update email_logs policy
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update onvopay_payments policy
DROP POLICY IF EXISTS "Admins can view all payments" ON public.onvopay_payments;
CREATE POLICY "Admins can view all payments"
  ON public.onvopay_payments
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Create function to check if user is admin (for backward compatibility)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- ============================================
-- Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================
-- Add trigger to prevent role column updates on users table
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_role_column_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow inserts and updates that don't change the role
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Direct role updates are not allowed. Use the user_roles table instead.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_updates ON public.users;
CREATE TRIGGER prevent_role_updates
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_column_update();