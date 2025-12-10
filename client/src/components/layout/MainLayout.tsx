import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, LayoutDashboard, User, LogOut, Menu, Trophy, Layers } from "lucide-react";
import { SuspensionAppealDialog } from "@/components/SuspensionAppealDialog";
import { BlockedUserDialog } from "@/components/BlockedUserDialog";
import { PointsAwardPopup } from "@/components/PointsAwardPopup";
import { useUnseenPoints } from "@/hooks/useUnseenPoints";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isAuthenticated, isAdmin, influencer, logout } = useAuth();
  const [location] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);

  const isLanding = location === "/";
  const isInfluencer = isAuthenticated && !isAdmin;
  
  const { currentEvent, markCurrentAsSeen } = useUnseenPoints(isInfluencer);

  useEffect(() => {
    if (isInfluencer && influencer?.blocked) {
      setShowBlockedDialog(true);
      setShowSuspensionDialog(false);
    } else if (isInfluencer && influencer?.suspended && !influencer?.appealSubmitted) {
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

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11"
                  data-testid="button-hamburger-menu"
                  aria-label="Open menu"
                >
                  <Menu className="h-7 w-7" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <SheetHeader className="text-left pb-6 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      Collaboom
                    </span>
                  </SheetTitle>
                  {isAuthenticated && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-foreground">
                        {isInfluencer 
                          ? getInfluencerDisplayName(influencer, user?.name || "Influencer")
                          : user?.name || "Admin"
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  )}
                </SheetHeader>

                <nav className="flex flex-col py-6 gap-1">
                  <Link href="/score-tier">
                    <Button
                      variant={location === "/score-tier" ? "secondary" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={() => setSheetOpen(false)}
                      data-testid="menu-score-tier"
                    >
                      <Trophy className="h-5 w-5 mr-3" />
                      Score & Tier
                    </Button>
                  </Link>
                  <Link href="/campaign-types">
                    <Button
                      variant={location === "/campaign-types" ? "secondary" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={() => setSheetOpen(false)}
                      data-testid="menu-campaign-types"
                    >
                      <Layers className="h-5 w-5 mr-3" />
                      Campaign Types
                    </Button>
                  </Link>

                  <div className="border-b my-4" />

                  {isAuthenticated ? (
                    <>
                      {isInfluencer && (
                        <>
                          <Link href="/dashboard">
                            <Button
                              variant={location === "/dashboard" ? "secondary" : "ghost"}
                              className="w-full justify-start h-12 text-base"
                              onClick={() => setSheetOpen(false)}
                              data-testid="menu-dashboard"
                            >
                              <LayoutDashboard className="h-5 w-5 mr-3" />
                              Dashboard
                            </Button>
                          </Link>
                          <Link href="/profile">
                            <Button
                              variant={location === "/profile" ? "secondary" : "ghost"}
                              className="w-full justify-start h-12 text-base"
                              onClick={() => setSheetOpen(false)}
                              data-testid="menu-profile"
                            >
                              <User className="h-5 w-5 mr-3" />
                              Profile
                            </Button>
                          </Link>
                        </>
                      )}
                      {isAdmin && (
                        <Link href="/admin">
                          <Button
                            variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                            className="w-full justify-start h-12 text-base"
                            onClick={() => setSheetOpen(false)}
                            data-testid="menu-admin"
                          >
                            <LayoutDashboard className="h-5 w-5 mr-3" />
                            Admin Dashboard
                          </Button>
                        </Link>
                      )}

                      <div className="border-b my-4" />

                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-base text-destructive hover:text-destructive"
                        onClick={() => {
                          logout();
                          setSheetOpen(false);
                        }}
                        data-testid="menu-signout"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-base"
                          onClick={() => setSheetOpen(false)}
                          data-testid="menu-signin"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button
                          className="w-full h-12 text-base mt-2"
                          onClick={() => setSheetOpen(false)}
                          data-testid="menu-getstarted"
                        >
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
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

      {isInfluencer && currentEvent && (
        <PointsAwardPopup
          points={currentEvent.delta}
          reason={currentEvent.reason}
          open={true}
          onClose={markCurrentAsSeen}
        />
      )}
    </div>
  );
}
