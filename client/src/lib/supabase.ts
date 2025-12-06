import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;
let initStartTime: number = 0;

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
    
    if (initStartTime > 0) {
      console.log(`[Supabase] Client initialized in ${(performance.now() - initStartTime).toFixed(0)}ms`);
    }
    
    return supabaseInstance;
  } catch (error) {
    console.error('[Supabase] Init failed:', error);
    return null;
  }
}

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!initPromise) {
    initStartTime = performance.now();
    initPromise = initSupabase();
  }
  return initPromise;
}

// Preload Supabase client immediately when this module is imported
// This ensures the client is ready before user interaction
export function preloadSupabase(): void {
  if (!initPromise) {
    initStartTime = performance.now();
    initPromise = initSupabase();
  }
}

// Start preloading immediately
preloadSupabase();
