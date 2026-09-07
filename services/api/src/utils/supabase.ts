import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = (): string => {
  const envUrl = process.env.SUPABASE_URL;
  if (envUrl && envUrl !== 'your_supabase_project_url' && envUrl.trim() !== '') {
    return envUrl;
  }

  // Fallback: Dynamically extract project ref from DATABASE_URL hostname
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/@db\.([a-z0-9]+)\.supabase/);
  if (match && match[1]) {
    return `https://${match[1]}.supabase.co`;
  }

  // Return a dummy placeholder to prevent crash during init
  return 'https://placeholder.supabase.co';
};

export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
