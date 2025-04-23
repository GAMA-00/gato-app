
-- Asegurarse de que la tabla profiles tiene seguridad a nivel de fila habilitada
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Crear política que permite a los usuarios ver su propio perfil
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
CREATE POLICY "Users can view their own profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Crear política que permite a los usuarios actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
CREATE POLICY "Users can update their own profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Política especial para permitir insertar nuevos perfiles durante el registro
-- Esta es la política clave para solucionar el problema
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users only" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Política para permitir al servicio insertar perfiles
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
CREATE POLICY "Service role can manage all profiles" 
  ON public.profiles 
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);
