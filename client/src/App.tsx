import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, SESSION_EXPIRED_EVENT } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SocketProvider } from "./lib/socket";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const CampaignListPage = lazy(() => import("@/pages/CampaignListPage"));
const CampaignDetailPage = lazy(() => import("@/pages/CampaignDetailPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ScoreTierPage = lazy(() => import("@/pages/ScoreTierPage"));
const CampaignTypesPage = lazy(() => import("@/pages/CampaignTypesPage"));

const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminCampaignListPage = lazy(() => import("@/pages/admin/AdminCampaignListPage"));
const AdminCampaignDetailPage = lazy(() => import("@/pages/admin/AdminCampaignDetailPage"));
const AdminCampaignFormPage = lazy(() => import("@/pages/admin/AdminCampaignFormPage"));
const AdminInfluencersPage = lazy(() => import("@/pages/admin/AdminInfluencersPage"));
const AdminIssuesPage = lazy(() => import("@/pages/admin/AdminIssuesPage"));
const AdminSupportTicketsPage = lazy(() => import("@/pages/admin/AdminSupportTicketsPage"));
const AdminPayoutsPage = lazy(() => import("@/pages/admin/AdminPayoutsPage"));
const AdminChatPage = lazy(() => import("@/pages/admin/AdminChatPage"));

const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function SessionExpiredHandler() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleSessionExpired = () => {
      // Invalidate all auth-dependent queries
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/influencer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setLocation("/login");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [toast, setLocation]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/auth/callback" component={AuthCallbackPage} />
        <Route path="/score-tier" component={ScoreTierPage} />
        <Route path="/campaign-types" component={CampaignTypesPage} />
        <Route path="/campaigns" component={CampaignListPage} />
        <Route path="/campaigns/:id" component={CampaignDetailPage} />
        
        {/* Influencer routes */}
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/profile" component={ProfilePage} />
        
        {/* Admin routes */}
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin" component={AdminDashboardPage} />
        <Route path="/admin/campaigns" component={AdminCampaignListPage} />
        <Route path="/admin/campaigns/finished" component={AdminCampaignListPage} />
        <Route path="/admin/campaigns/archived" component={AdminCampaignListPage} />
        <Route path="/admin/campaigns/new" component={AdminCampaignFormPage} />
        <Route path="/admin/campaigns/:id/edit" component={AdminCampaignFormPage} />
        <Route path="/admin/campaigns/:id" component={AdminCampaignDetailPage} />
        <Route path="/admin/influencers" component={AdminInfluencersPage} />
        <Route path="/admin/influencers/:id" component={AdminInfluencersPage} />
        <Route path="/admin/issues" component={AdminIssuesPage} />
        <Route path="/admin/support-tickets" component={AdminSupportTicketsPage} />
        <Route path="/admin/payouts" component={AdminPayoutsPage} />
        <Route path="/admin/chat" component={AdminChatPage} />
        
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <TooltipProvider>
          <SessionExpiredHandler />
          <Toaster />
          <Router />
        </TooltipProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
