import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your login...");
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    const startTime = performance.now();

    async function handleAuthCallback() {
      try {
        console.log(`[Auth] Starting callback...`);
        
        const t1 = performance.now();
        const supabase = await getSupabase();
        console.log(`[Auth] getSupabase: ${(performance.now() - t1).toFixed(0)}ms`);
        
        if (!supabase) {
          throw new Error("Authentication service unavailable");
        }

        // Check for PKCE flow (code in query params)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        // Handle OAuth errors from provider
        if (errorParam) {
          throw new Error(errorDescription || `OAuth error: ${errorParam}`);
        }
        
        // If we have a code, exchange it for a session (PKCE flow)
        if (code) {
          const t2 = performance.now();
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.log(`[Auth] exchangeCodeForSession: ${(performance.now() - t2).toFixed(0)}ms`);
          
          if (error) throw error;
          if (data.session) {
            const t3 = performance.now();
            await syncWithBackend(data.session);
            console.log(`[Auth] syncWithBackend: ${(performance.now() - t3).toFixed(0)}ms`);
            
            if (mounted) {
              setStatus("success");
              setMessage("Login successful! Redirecting...");
              // Invalidate cache - don't wait for refetch
              queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
              console.log(`[Auth] TOTAL: ${(performance.now() - startTime).toFixed(0)}ms`);
              // Redirect immediately
              setLocation("/dashboard");
            }
            return;
          }
        }

        // Get the session from the URL hash (Supabase puts tokens there for implicit flow)
        const t4 = performance.now();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log(`[Auth] getSession: ${(performance.now() - t4).toFixed(0)}ms`);
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // Try to exchange the hash for a session (implicit flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            const t5 = performance.now();
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            console.log(`[Auth] setSession: ${(performance.now() - t5).toFixed(0)}ms`);
            
            if (error) throw error;
            if (!data.session) throw new Error("Failed to establish session");
            
            // Sync with backend
            const t6 = performance.now();
            await syncWithBackend(data.session);
            console.log(`[Auth] syncWithBackend: ${(performance.now() - t6).toFixed(0)}ms`);
          } else {
            throw new Error("No authentication tokens found. Please try signing in again.");
          }
        } else {
          // Session already exists, sync with backend
          const t7 = performance.now();
          await syncWithBackend(session);
          console.log(`[Auth] syncWithBackend: ${(performance.now() - t7).toFixed(0)}ms`);
        }

        if (mounted) {
          setStatus("success");
          setMessage("Login successful! Redirecting...");
          
          // Invalidate cache - don't wait for refetch
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          console.log(`[Auth] TOTAL: ${(performance.now() - startTime).toFixed(0)}ms`);
          // Redirect immediately
          setLocation("/dashboard");
        }
      } catch (error) {
        console.error(`[Auth] Error:`, error);
        if (mounted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Authentication failed");
          
          setTimeout(() => {
            if (mounted) {
              setLocation("/login");
            }
          }, 2000);
        }
      }
    }

    async function syncWithBackend(session: { user: any; access_token: string }) {
      const res = await fetch("/api/auth/supabase/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user: session.user,
          accessToken: session.access_token,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to sync with server");
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [setLocation, queryClient]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        )}
        {status === "success" && (
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        )}
        {status === "error" && (
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        )}
        <h2 className="text-xl font-semibold">
          {status === "loading" && "Signing you in..."}
          {status === "success" && "Welcome!"}
          {status === "error" && "Oops!"}
        </h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
