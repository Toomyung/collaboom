import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, ArrowLeft, Search, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">Collaboom</span>
          </div>
          
          <h1 className="text-8xl font-bold text-muted-foreground/30">404</h1>
          
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
          
          <p className="text-muted-foreground">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild variant="default" data-testid="button-go-home">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
          
          <Button asChild variant="outline" data-testid="button-browse-campaigns">
            <Link href="/campaigns">
              <Search className="h-4 w-4 mr-2" />
              Browse Campaigns
            </Link>
          </Button>
        </div>

        <div className="pt-8">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a 
              href="mailto:hello@collaboom.io" 
              className="text-primary hover:underline"
              data-testid="link-contact-support"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
