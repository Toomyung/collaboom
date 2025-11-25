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
  } catch (e) {
    console.error("Supabase signout error:", e);
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

    async function initAuth() {
      try {
        const supabase = await getSupabase();
        
        if (!mounted) return;
        
        if (!supabase) {
          setSupabaseError("Supabase not configured");
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
          
          if (event === 'SIGNED_IN' && session) {
            try {
              const res = await fetch("/api/auth/supabase/callback", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  user: session.user,
                  accessToken: session.access_token,
                }),
                credentials: "include",
              });
              
              if (res.ok) {
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
              }
            } catch (error) {
              console.error("Failed to sync Supabase auth with backend:", error);
            }
          }
          
          if (event === 'SIGNED_OUT') {
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          }
        });

        subscription = sub;
      } catch (error) {
        console.error("Failed to initialize Supabase auth:", error);
        if (mounted) {
          setSupabaseError("Failed to initialize authentication");
          setSupabaseLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
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
      throw new Error("Supabase not configured");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Google sign-in error:", error);
      throw error;
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
