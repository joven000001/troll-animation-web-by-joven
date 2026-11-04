import { supabase } from './supabase';

export async function ensureSupabaseIdentity() {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  if (sessionResult.data.session?.user) return sessionResult.data.session.user;
  const result = await supabase.auth.signInAnonymously();
  if (result.error) {
    throw new Error('Secure guest identity could not be created: ' + result.error.message + '. Enable Anonymous Sign-Ins in Supabase Authentication settings.');
  }
  if (!result.data.user) throw new Error('Supabase did not return an upload identity.');
  return result.data.user;
}

export async function getSupabaseIdentityId() {
  const result = await supabase.auth.getUser();
  if (result.error) throw result.error;
  return result.data.user?.id || null;
}
