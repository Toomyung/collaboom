import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import CampaignListPage from "@/pages/CampaignListPage";
import CampaignDetailPage from "@/pages/CampaignDetailPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminCampaignListPage from "@/pages/admin/AdminCampaignListPage";
import AdminCampaignDetailPage from "@/pages/admin/AdminCampaignDetailPage";
import AdminCampaignFormPage from "@/pages/admin/AdminCampaignFormPage";
import AdminInfluencersPage from "@/pages/admin/AdminInfluencersPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
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
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
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
