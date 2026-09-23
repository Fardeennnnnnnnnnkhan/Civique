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
export const supabaseServerKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV !== 'production' ? process.env.SUPABASE_ANON_KEY || '' : '');

export const supabase = createClient(supabaseUrl, supabaseServerKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function createSignedMediaUrl(storagePath: string, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage.from('report-images').createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error('SIGNED_MEDIA_UNAVAILABLE');
  return data.signedUrl;
}
