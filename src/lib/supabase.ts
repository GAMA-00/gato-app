
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are provided
if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('Missing Supabase URL. Please set the VITE_SUPABASE_URL environment variable.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('Missing Supabase Anon Key. Please set the VITE_SUPABASE_ANON_KEY environment variable.');
}

// Create a placeholder client if values are missing to avoid runtime errors
const url = supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' 
  ? supabaseUrl 
  : 'https://placeholder-url.supabase.co';
  
const key = supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' 
  ? supabaseAnonKey 
  : 'placeholder-key';

export const supabase = createClient(url, key);
