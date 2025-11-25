import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

async function initSupabase(): Promise<SupabaseClient | null> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    const response = await fetch('/api/config/supabase');
    if (!response.ok) {
      console.error('Failed to fetch Supabase config:', response.status);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid response type from Supabase config');
      return null;
    }
    
    const config = await response.json();
    
    if (!config.url || !config.anonKey) {
      console.error('Missing Supabase config');
      return null;
    }

    if (!config.url.startsWith('https://')) {
      console.error('Invalid Supabase URL');
      return null;
    }
    
    supabaseInstance = createClient(config.url, config.anonKey);
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
}

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!initPromise) {
    initPromise = initSupabase();
  }
  return initPromise;
}
