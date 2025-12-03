import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  LogOut,
  Sparkles,
  Menu,
  ExternalLink,
  Home,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  Archive,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: number;
  subItems?: { href: string; label: string; icon: any }[];
}

const getNavItems = (openIssuesCount?: number): NavItem[] => [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { 
    href: "/admin/campaigns", 
    label: "Campaigns", 
    icon: Megaphone,
    subItems: [
      { href: "/admin/campaigns", label: "Active", icon: PlayCircle },
      { href: "/admin/campaigns/finished", label: "Finished", icon: CheckCircle },
      { href: "/admin/campaigns/archived", label: "Archived", icon: Archive },
    ]
  },
  { href: "/admin/influencers", label: "Influencers", icon: Users },
  { href: "/admin/issues", label: "Reported Issues", icon: AlertCircle, badge: openIssuesCount },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Campaigns"]);

  // Fetch all issues and count only open ones for badge
  const { data: allIssues } = useQuery<any[]>({
    queryKey: ["/api/admin/issues"],
  });
  const openIssuesCount = allIssues?.filter((i: any) => i.status === "open").length || 0;
  const navItems = getNavItems(openIssuesCount > 0 ? openIssuesCount : undefined);

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    if (href === "/admin/campaigns" && !location.includes("/finished") && !location.includes("/archived")) {
      return location === "/admin/campaigns" || location.startsWith("/admin/campaigns/") && !location.includes("/finished") && !location.includes("/archived");
    }
    return location === href || location.startsWith(href + "/");
  };

  const isParentActive = (item: NavItem) => {
    if (item.subItems) {
      return item.subItems.some(sub => isActive(sub.href));
    }
    return isActive(item.href);
  };

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label) 
        : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo - Links to Home */}
          <Link href="/" className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors" data-testid="admin-link-home">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Collaboom Admin</span>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.href}>
                {item.subItems ? (
                  <>
                    <div className="flex items-center w-full">
                      <Link href={item.href} className="flex-1">
                        <Button
                          variant={isParentActive(item) ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3",
                            isParentActive(item) && "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                          onClick={() => setSidebarOpen(false)}
                          data-testid={`nav-${item.label.toLowerCase()}`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.label);
                        }}
                        data-testid={`nav-${item.label.toLowerCase()}-expand`}
                      >
                        {expandedItems.includes(item.label) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {expandedItems.includes(item.label) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.subItems.map((subItem) => (
                          <Link key={subItem.href} href={subItem.href}>
                            <Button
                              variant={isActive(subItem.href) ? "secondary" : "ghost"}
                              size="sm"
                              className={cn(
                                "w-full justify-start gap-3",
                                isActive(subItem.href) && "bg-sidebar-accent text-sidebar-accent-foreground"
                              )}
                              onClick={() => setSidebarOpen(false)}
                              data-testid={`nav-${item.label.toLowerCase()}-${subItem.label.toLowerCase()}`}
                            >
                              <subItem.icon className="h-3.5 w-3.5" />
                              {subItem.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                      onClick={() => setSidebarOpen(false)}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => logout()}
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-4 lg:px-6 border-b bg-background sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="admin-view-site">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Site
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
