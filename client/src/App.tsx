import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const CampaignListPage = lazy(() => import("@/pages/CampaignListPage"));
const CampaignDetailPage = lazy(() => import("@/pages/CampaignDetailPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminCampaignListPage = lazy(() => import("@/pages/admin/AdminCampaignListPage"));
const AdminCampaignDetailPage = lazy(() => import("@/pages/admin/AdminCampaignDetailPage"));
const AdminCampaignFormPage = lazy(() => import("@/pages/admin/AdminCampaignFormPage"));
const AdminInfluencersPage = lazy(() => import("@/pages/admin/AdminInfluencersPage"));
const AdminIssuesPage = lazy(() => import("@/pages/admin/AdminIssuesPage"));
const AdminSupportTicketsPage = lazy(() => import("@/pages/admin/AdminSupportTicketsPage"));

const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/auth/callback" component={AuthCallbackPage} />
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
        
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
