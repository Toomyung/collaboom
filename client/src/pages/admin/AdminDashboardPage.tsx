import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, Redirect } from "wouter";
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
} from "lucide-react";
import { useState } from "react";

interface DashboardStats {
  activeCampaigns: number;
  pendingApplicants: number;
  shippingPending: number;
  uploadPending: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export default function AdminDashboardPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: recentActivity } = useQuery<RecentActivity[]>({
    queryKey: ["/api/admin/activity"],
    enabled: isAuthenticated && isAdmin,
  });

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

  const statCards = [
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns ?? 0,
      icon: Megaphone,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Applicants",
      value: stats?.pendingApplicants ?? 0,
      icon: Users,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Shipping Pending",
      value: stats?.shippingPending ?? 0,
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Upload Verification",
      value: stats?.uploadPending ?? 0,
      icon: Upload,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your campaign operations</p>
          </div>
          <Link href="/admin/campaigns/new">
            <Button data-testid="button-new-campaign">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stat.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Global Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Influencers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or TikTok handle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              {searchQuery && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Press Enter to search for "{searchQuery}"
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/campaigns">
                <Button variant="outline" className="w-full justify-start" data-testid="link-manage-campaigns">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Manage Campaigns
                </Button>
              </Link>
              <Link href="/admin/campaigns?tab=applicants">
                <Button variant="outline" className="w-full justify-start" data-testid="link-review-applications">
                  <Users className="h-4 w-4 mr-2" />
                  Review Applications
                  {stats?.pendingApplicants ? (
                    <Badge className="ml-auto" variant="secondary">
                      {stats.pendingApplicants}
                    </Badge>
                  ) : null}
                </Button>
              </Link>
              <Link href="/admin/influencers">
                <Button variant="outline" className="w-full justify-start" data-testid="link-influencers">
                  <Users className="h-4 w-4 mr-2" />
                  Influencer Directory
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
