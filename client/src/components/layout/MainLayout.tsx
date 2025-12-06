import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, LayoutDashboard, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { SuspensionAppealDialog } from "@/components/SuspensionAppealDialog";
import { BlockedUserDialog } from "@/components/BlockedUserDialog";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isAuthenticated, isAdmin, influencer, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);

  const isLanding = location === "/";
  const isInfluencer = isAuthenticated && !isAdmin;

  useEffect(() => {
    // Blocked takes priority over suspended
    if (isInfluencer && influencer?.blocked) {
      setShowBlockedDialog(true);
      setShowSuspensionDialog(false);
    } else if (isInfluencer && influencer?.suspended && !influencer?.appealSubmitted) {
      // Only show suspension dialog if suspended AND haven't submitted an appeal yet
      setShowSuspensionDialog(true);
    }
  }, [isInfluencer, influencer?.blocked, influencer?.suspended, influencer?.appealSubmitted]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/">
              <a className="flex items-center gap-2 font-bold text-xl" data-testid="link-home">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Collaboom
                </span>
              </a>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/campaigns">
                <Button
                  variant={location === "/campaigns" ? "secondary" : "ghost"}
                  data-testid="link-campaigns"
                >
                  Campaigns
                </Button>
              </Link>
              {isInfluencer && (
                <>
                  <Link href="/dashboard">
                    <Button
                      variant={location === "/dashboard" ? "secondary" : "ghost"}
                      data-testid="link-dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button
                      variant={location === "/profile" ? "secondary" : "ghost"}
                      data-testid="link-profile"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin">
                  <Button
                    variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                    data-testid="link-admin-dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Welcome,</span>{" "}
                    <span className="font-medium">{user?.name || user?.email}</span>
                    {isInfluencer && influencer && !influencer.profileCompleted && (
                      <span className="ml-2 text-xs text-amber-500 font-medium">
                        (Profile incomplete)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logout()}
                    data-testid="button-logout"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" data-testid="link-login">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button data-testid="link-register">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="flex flex-col p-4 gap-2">
              <Link href="/campaigns">
                <Button
                  variant={location === "/campaigns" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Campaigns
                </Button>
              </Link>
              {isAuthenticated ? (
                <>
                  {isInfluencer && (
                    <>
                      <Link href="/dashboard">
                        <Button
                          variant={location === "/dashboard" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link href="/profile">
                        <Button
                          variant={location === "/profile" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                      </Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link href="/admin">
                      <Button
                        variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full" onClick={() => setMobileMenuOpen(false)}>
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {!isLanding && (
        <footer className="border-t py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Collaboom by TooMyung</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">
                  Terms
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacy
                </a>
                <a href="mailto:support@collaboom.com" className="hover:text-foreground transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {isInfluencer && influencer?.suspended && (
        <SuspensionAppealDialog
          open={showSuspensionDialog}
          onClose={() => setShowSuspensionDialog(false)}
          influencerName={influencer.name || user?.name || ""}
        />
      )}

      {isInfluencer && influencer?.blocked && (
        <BlockedUserDialog
          open={showBlockedDialog}
          influencerName={influencer.name || user?.name || ""}
        />
      )}
    </div>
  );
}
