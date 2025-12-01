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

    async function handleAuthCallback() {
      try {
        const supabase = await getSupabase();
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
          console.log("[Auth] PKCE flow detected, exchanging code...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data.session) {
            await syncWithBackend(data.session);
            if (mounted) {
              setStatus("success");
              setMessage("Login successful! Redirecting...");
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
              await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
              setTimeout(() => {
                if (mounted) setLocation("/dashboard");
              }, 1000);
            }
            return;
          }
        }

        // Get the session from the URL hash (Supabase puts tokens there for implicit flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // Try to exchange the hash for a session (implicit flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            console.log("[Auth] Implicit flow detected, setting session...");
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) throw error;
            if (!data.session) throw new Error("Failed to establish session");
            
            // Sync with backend
            await syncWithBackend(data.session);
          } else {
            // Check if we're on a weird redirect
            console.error("[Auth] No tokens found. URL:", window.location.href);
            throw new Error("No authentication tokens found. Please try signing in again.");
          }
        } else {
          // Session already exists, sync with backend
          console.log("[Auth] Existing session found, syncing...");
          await syncWithBackend(session);
        }

        if (mounted) {
          setStatus("success");
          setMessage("Login successful! Redirecting...");
          
          // Invalidate and refetch auth state
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
          
          setTimeout(() => {
            if (mounted) {
              setLocation("/dashboard");
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        if (mounted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Authentication failed");
          
          setTimeout(() => {
            if (mounted) {
              setLocation("/login");
            }
          }, 3000);
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
