import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Megaphone,
  Users,
  Clock,
  Upload,
  Search,
  Plus,
  TrendingUp,
  Package,
  DollarSign,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  activeCampaigns: number;
  pendingApplicants: number;
  shippingPending: number;
  uploadPending: number;
  openIssues: number;
  pendingPayouts: number;
  openTickets: number;
  unreadChats: number;
}

interface RecentActivity {
  id: string;
  type: 'application' | 'upload' | 'payout' | 'ticket' | 'chat';
  message: string;
  timestamp: string;
  link?: string;
}

const activityTypeConfig: Record<string, { icon: typeof Users; color: string; bgColor: string }> = {
  application: { icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  upload: { icon: Upload, color: "text-green-500", bgColor: "bg-green-500/10" },
  payout: { icon: DollarSign, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  ticket: { icon: HelpCircle, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  chat: { icon: MessageSquare, color: "text-purple-500", bgColor: "bg-purple-500/10" },
};

export default function AdminDashboardPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/admin/activity"],
    enabled: isAuthenticated && isAdmin,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/admin/influencers?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  const primaryStats = [
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns ?? 0,
      icon: Megaphone,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      link: "/admin/campaigns",
    },
    {
      title: "Pending Applications",
      value: stats?.pendingApplicants ?? 0,
      icon: Users,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      link: "/admin/campaigns?tab=applicants",
      urgent: (stats?.pendingApplicants ?? 0) > 0,
    },
    {
      title: "Awaiting Shipment",
      value: stats?.shippingPending ?? 0,
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      link: "/admin/campaigns?tab=shipping",
      urgent: (stats?.shippingPending ?? 0) > 5,
    },
    {
      title: "Upload Verification",
      value: stats?.uploadPending ?? 0,
      icon: Upload,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      link: "/admin/campaigns?tab=uploads",
      urgent: (stats?.uploadPending ?? 0) > 0,
    },
  ];

  const secondaryStats = [
    {
      title: "Pending Payouts",
      value: stats?.pendingPayouts ?? 0,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      link: "/admin/payouts",
      urgent: (stats?.pendingPayouts ?? 0) > 0,
    },
    {
      title: "Open Tickets",
      value: stats?.openTickets ?? 0,
      icon: HelpCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      link: "/admin/support",
      urgent: (stats?.openTickets ?? 0) > 0,
    },
    {
      title: "Unread Messages",
      value: stats?.unreadChats ?? 0,
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      link: "/admin/influencers",
      urgent: false, // Not urgent - admin reads messages in influencer detail to clear
    },
    {
      title: "Shipping Issues",
      value: stats?.openIssues ?? 0,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      link: "/admin/issues",
      urgent: (stats?.openIssues ?? 0) > 0,
    },
  ];

  const urgentItems = [
    ...primaryStats.filter(s => s.urgent && s.value > 0),
    ...secondaryStats.filter(s => s.urgent && s.value > 0),
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Campaign operations at a glance</p>
          </div>
          <Link href="/admin/campaigns/new">
            <Button data-testid="button-new-campaign">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Urgent Actions Alert */}
        {urgentItems.length > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-orange-700 dark:text-orange-400">Actions Required</p>
                  <p className="text-sm text-muted-foreground">{urgentItems.length} items need your attention</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {urgentItems.map((item, i) => (
                  <Link key={i} href={item.link}>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-orange-500/10 border-orange-500/30"
                      data-testid={`alert-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="h-3 w-3 mr-1" />
                      {item.value} {item.title}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primary Stats - Campaign Pipeline */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Campaign Pipeline</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {primaryStats.map((stat, i) => (
              <Link key={i} href={stat.link}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className="text-2xl font-bold">{stat.value}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                      </div>
                      {stat.urgent && stat.value > 0 && (
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Secondary Stats - Support & Payments */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Support & Payments</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {secondaryStats.map((stat, i) => (
              <Link key={i} href={stat.link}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className="text-2xl font-bold">{stat.value}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                      </div>
                      {stat.urgent && stat.value > 0 && (
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Search and Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Global Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Influencers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, email, or TikTok handle..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Button type="submit" data-testid="button-search">
                    Search
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/campaigns?tab=applicants">
                <Button variant="outline" className="w-full justify-between" data-testid="link-review-applications">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Review Applications
                  </span>
                  {(stats?.pendingApplicants ?? 0) > 0 && (
                    <Badge variant="secondary">{stats?.pendingApplicants}</Badge>
                  )}
                </Button>
              </Link>
              <Link href="/admin/campaigns?tab=uploads">
                <Button variant="outline" className="w-full justify-between" data-testid="link-verify-uploads">
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Uploads
                  </span>
                  {(stats?.uploadPending ?? 0) > 0 && (
                    <Badge variant="secondary">{stats?.uploadPending}</Badge>
                  )}
                </Button>
              </Link>
              <Link href="/admin/payouts">
                <Button variant="outline" className="w-full justify-between" data-testid="link-process-payouts">
                  <span className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payouts
                  </span>
                  {(stats?.pendingPayouts ?? 0) > 0 && (
                    <Badge variant="secondary">{stats?.pendingPayouts}</Badge>
                  )}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((activity) => {
                  const config = activityTypeConfig[activity.type] || activityTypeConfig.application;
                  const IconComponent = config.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className={`h-9 w-9 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      {activity.link && (
                        <Link href={activity.link}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`activity-link-${activity.id}`}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending items at the moment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
