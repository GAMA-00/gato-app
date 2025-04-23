
import { createClient } from '@supabase/supabase-js';

// These are safe to expose in the frontend as they're public
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
