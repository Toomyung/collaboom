import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Connecting to Google...");
  const { signInWithGoogle, isAuthenticated, supabaseReady, supabaseError } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    if (!supabaseReady) {
      toast({
        title: "Authentication unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage("Connecting to Google...");
    
    try {
      await signInWithGoogle((attempt) => {
        setLoadingMessage(`Retrying connection... (${attempt}/2)`);
      });
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      setLoadingMessage("Connecting to Google...");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative w-full max-w-md">
        <Link href="/">
          <Button variant="ghost" className="absolute -top-16 left-0" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to Collaboom</CardTitle>
            <CardDescription>
              Sign in with Google to start collaborating with top brands
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {supabaseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Authentication service is temporarily unavailable. Please try again later.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>Access to exclusive brand campaigns</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>Free products shipped to your door</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>Build your creator score</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-base"
              disabled={isLoading || !supabaseReady}
              data-testid="button-google-signin"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {loadingMessage}
                </>
              ) : (
                <>
                  <SiGoogle className="h-5 w-5 mr-2" />
                  Continue with Google
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Admin?</span>
              </div>
            </div>
            
            <Link href="/admin/login">
              <Button variant="outline" className="w-full" data-testid="link-admin-login">
                Admin Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
