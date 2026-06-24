
-- =====================================================
-- FIX 1: team_members - Remove public access
-- =====================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view all team members" ON public.team_members;

-- Create a new policy that only allows providers to view their own team members
CREATE POLICY "Providers can view their own team members"
ON public.team_members
FOR SELECT
USING (auth.uid() = provider_id);

-- =====================================================
-- FIX 2: users - Tighten the viewing policy
-- =====================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Unified: Users can view profiles" ON public.users;

-- Create a new, properly scoped policy:
-- 1. Admins can view all profiles
-- 2. Users can view their own profile
-- 3. Providers can view clients ONLY for active appointments (pending, confirmed)
-- 4. Clients can view their provider's profile for their appointments
CREATE POLICY "Unified: Users can view profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Admins can view all
  has_role(auth.uid(), 'admin')
  
  -- Users can view their own profile
  OR (auth.uid() = id)
  
  -- For viewing other profiles, use more restrictive checks via the existing policy
  -- "Providers can view appointment clients" handles provider->client visibility
);

-- Note: The "Providers can view appointment clients" policy already handles
-- the provider viewing client profiles for valid appointments.
-- We just need to ensure the main policy doesn't override it with broader access.
