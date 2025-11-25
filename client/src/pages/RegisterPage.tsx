import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle, isAuthenticated, supabaseReady, supabaseError, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (isAuthenticated) {
    setLocation("/dashboard");
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
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
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
            <CardTitle className="text-2xl">Join Collaboom</CardTitle>
            <CardDescription>
              Start receiving free products from top brands
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
              {[
                "Access to exclusive brand campaigns",
                "Free products shipped to your door",
                "Build your creator score",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-base"
              disabled={isLoading || authLoading || !supabaseReady}
              data-testid="button-google-signup"
            >
              {isLoading || authLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <SiGoogle className="h-5 w-5 mr-2" />
                  Sign up with Google
                </>
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-primary hover:underline cursor-pointer" data-testid="link-login">
                  Sign in
                </span>
              </Link>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
