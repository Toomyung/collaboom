import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Campaign } from "@shared/schema";
import { Link, Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Archive,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getCampaignThumbnail } from "@/lib/imageUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PaginatedCampaignsResponse {
  items: Campaign[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;

type ViewMode = "active" | "finished" | "archived";

export default function AdminCampaignListPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  
  // Dialog states
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Determine view mode from URL
  const viewMode: ViewMode = location.includes("/archived") 
    ? "archived" 
    : location.includes("/finished") 
      ? "finished" 
      : "active";

  // Get page config based on view mode
  const pageConfig = {
    active: {
      title: "Active Campaigns",
      description: "Manage your active product campaigns",
      statuses: ["draft", "active", "full"],
      showNewButton: true,
    },
    finished: {
      title: "Finished Campaigns",
      description: "View completed campaigns",
      statuses: ["closed"],
      showNewButton: false,
    },
    archived: {
      title: "Archived Campaigns",
      description: "View archived campaigns that are hidden from influencers",
      statuses: ["archived"],
      showNewButton: false,
    },
  }[viewMode];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when view mode changes
  useEffect(() => {
    setPage(1);
    setStatusFilter("all");
  }, [viewMode]);

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    
    // Apply status filter based on view mode
    if (viewMode === "active") {
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      } else {
        params.set("statuses", "draft,active,full");
      }
    } else if (viewMode === "finished") {
      params.set("status", "closed");
    } else if (viewMode === "archived") {
      params.set("status", "archived");
    }
    
    return `/api/admin/campaigns?${params.toString()}`;
  };

  const { data, isLoading, refetch } = useQuery<PaginatedCampaignsResponse>({
    queryKey: ["/api/admin/campaigns", viewMode, page, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      const res = await fetch(buildQueryUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("POST", `/api/admin/campaigns/${campaignId}/archive`);
    },
    onSuccess: () => {
      toast({ title: "Campaign archived", description: "The campaign has been archived." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      setArchiveDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to archive campaign", variant: "destructive" });
    },
  });

  // Restore mutation (unarchive)
  const restoreMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("POST", `/api/admin/campaigns/${campaignId}/restore`);
    },
    onSuccess: () => {
      toast({ title: "Campaign restored", description: "The campaign has been restored." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to restore campaign", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("DELETE", `/api/admin/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      toast({ title: "Campaign deleted", description: "The campaign has been permanently deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete campaign", variant: "destructive" });
    },
  });

  const handleArchive = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setArchiveDialogOpen(true);
  };

  const handleDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteDialogOpen(true);
  };

  const campaigns = data?.items;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
      active: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
      full: { label: "Full", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      closed: { label: "Closed", className: "bg-red-500/10 text-red-600 border-red-500/20" },
      archived: { label: "Archived", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
    };
    const config = configs[status] || configs.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{pageConfig.title}</h1>
            <p className="text-muted-foreground">{pageConfig.description}</p>
          </div>
          {pageConfig.showNewButton && (
            <Link href="/admin/campaigns/new">
              <Button data-testid="button-new-campaign">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          {viewMode === "active" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Slots</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getCampaignThumbnail(campaign.imageUrls, campaign.imageUrl) ? (
                            <img
                              src={getCampaignThumbnail(campaign.imageUrls, campaign.imageUrl)!}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted" />
                          )}
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {campaign.brandName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {campaign.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{campaign.approvedCount ?? 0}</span>
                        <span className="text-muted-foreground"> / {campaign.inventory}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(campaign.deadline), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`menu-${campaign.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/admin/campaigns/${campaign.id}`}>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/campaigns/${campaign.id}/edit`}>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {viewMode === "archived" ? (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => restoreMutation.mutate(campaign.id)}
                                  data-testid={`restore-${campaign.id}`}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(campaign)}
                                  data-testid={`delete-${campaign.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem 
                                className="text-orange-600"
                                onClick={() => handleArchive(campaign)}
                                data-testid={`archive-${campaign.id}`}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
                <p className="text-muted-foreground mb-4">
                  {debouncedSearch || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first campaign to get started"}
                </p>
                <Link href="/admin/campaigns/new">
                  <Button>Create Campaign</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} campaigns
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-8 h-8 p-0"
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{selectedCampaign?.name}"? 
              This will hide the campaign from influencers but keep all data for records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCampaign && archiveMutation.mutate(selectedCampaign.id)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{selectedCampaign?.name}"? 
              This action cannot be undone. All associated data including applications, 
              shipping info, and uploads will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCampaign && deleteMutation.mutate(selectedCampaign.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
