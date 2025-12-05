import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Influencer, Admin } from "@shared/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "influencer" | "admin";
  profileImageUrl?: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  influencer: Influencer | null;
  admin: Admin | null;
  supabaseUser: User | null;
  isLoading: boolean;
};

async function getCurrentUser(): Promise<AuthState> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      return { user: null, influencer: null, admin: null, supabaseUser: null, isLoading: false };
    }
    const data = await res.json();
    return { ...data, isLoading: false };
  } catch {
    return { user: null, influencer: null, admin: null, supabaseUser: null, isLoading: false };
  }
}

async function loginAdmin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || "Login failed" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

async function logoutUser(): Promise<void> {
  try {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Silent error handling
  }
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let mounted = true;

    // Handle popup auth messages
    function handleAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'AUTH_SUCCESS') {
        console.log('[Auth] Popup auth success, refreshing session...');
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
        // Navigate to dashboard
        window.location.href = '/dashboard';
      } else if (event.data?.type === 'AUTH_ERROR') {
        console.error('[Auth] Popup auth error:', event.data.error);
      }
    }
    
    window.addEventListener('message', handleAuthMessage);

    async function initAuth() {
      try {
        const supabase = await getSupabase();
        
        if (!mounted) return;
        
        if (!supabase) {
          setSupabaseError("Authentication service unavailable");
          setSupabaseLoading(false);
          setSupabaseReady(false);
          return;
        }

        setSupabaseReady(true);
        setSupabaseError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSupabaseUser(session?.user ?? null);
          setSupabaseLoading(false);
        }

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          setSupabaseUser(session?.user ?? null);
          
          // Note: SIGNED_IN from OAuth redirects is handled by AuthCallbackPage
          // This handler only catches token refreshes and existing session changes
          if (event === 'TOKEN_REFRESHED' && session) {
            // Just invalidate the cache - don't call callback again
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          }
          
          if (event === 'SIGNED_OUT') {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          }
        });

        subscription = sub;
      } catch {
        if (mounted) {
          setSupabaseError("Failed to initialize authentication");
          setSupabaseLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      window.removeEventListener('message', handleAuthMessage);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [queryClient]);

  const { data: authState, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });

  const signInWithGoogle = async () => {
    const supabase = await getSupabase();
    if (!supabase) {
      throw new Error("Authentication service unavailable");
    }
    
    // Try popup mode first for faster UX (no page reload)
    // Falls back to redirect if popup is blocked
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true, // Don't auto-redirect, we'll handle it
      },
    });
    
    if (error) {
      throw error;
    }
    
    if (data?.url) {
      // Open Google OAuth in a popup window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );
      
      // If popup was blocked, fall back to redirect
      if (!popup || popup.closed) {
        window.location.href = data.url;
      }
    }
  };

  const adminLoginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await loginAdmin(email, password);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      }
      return result;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
  });

  return {
    user: authState?.user ?? null,
    influencer: authState?.influencer ?? null,
    admin: authState?.admin ?? null,
    supabaseUser,
    isLoading: isLoading || supabaseLoading || authState?.isLoading,
    isAuthenticated: !!authState?.user,
    isInfluencer: authState?.user?.role === "influencer",
    isAdmin: authState?.user?.role === "admin",
    supabaseReady,
    supabaseError,
    signInWithGoogle,
    loginAdmin: adminLoginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    adminLoginPending: adminLoginMutation.isPending,
  };
}
