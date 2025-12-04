import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

async function initSupabase(): Promise<SupabaseClient | null> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    const response = await fetch('/api/config/auth');
    if (!response.ok) {
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }
    
    const config = await response.json();
    
    if (!config.url || !config.anonKey) {
      return null;
    }

    if (!config.url.startsWith('https://')) {
      return null;
    }
    
    supabaseInstance = createClient(config.url, config.anonKey);
    return supabaseInstance;
  } catch (error) {
    return null;
  }
}

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!initPromise) {
    initPromise = initSupabase();
  }
  return initPromise;
}
