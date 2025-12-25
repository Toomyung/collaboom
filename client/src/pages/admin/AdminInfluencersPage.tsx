import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Influencer } from "@shared/schema";
import { Redirect, useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import {
  Search,
  Star,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldX,
  Ban,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InfluencerDetailSheet } from "@/components/admin/InfluencerDetailSheet";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";

type InfluencerWithStats = Influencer & {
  appliedCount: number;
  acceptedCount: number;
  completedCount: number;
  unreadChatCount?: number;
};

type PaginatedResponse = {
  items: InfluencerWithStats[];
  totalCount: number;
  page: number;
  pageSize: number;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function AdminInfluencersPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [, params] = useRoute("/admin/influencers/:id");
  const [, setLocation] = useLocation();
  const influencerIdFromUrl = params?.id;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<"all" | "suspended" | "blocked">("all");

  const influencersQueryUrl = `/api/admin/influencers?page=${currentPage}&pageSize=${itemsPerPage}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}${statusFilter !== "all" ? `&status=${statusFilter}` : ''}`;
  
  const { data: paginatedData, isLoading } = useQuery<PaginatedResponse>({
    queryKey: [influencersQueryUrl],
    enabled: isAuthenticated && isAdmin,
  });
  
  useEffect(() => {
    if (influencerIdFromUrl && !selectedInfluencerId) {
      setSelectedInfluencerId(influencerIdFromUrl);
    }
  }, [influencerIdFromUrl, selectedInfluencerId]);

  const invalidateInfluencersQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/admin/influencers');
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const influencers = paginatedData?.items || [];
  const totalItems = paginatedData?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenDrawer = (inf: InfluencerWithStats) => {
    setSelectedInfluencerId(inf.id);
  };

  const handleCloseDrawer = () => {
    setSelectedInfluencerId(null);
    if (influencerIdFromUrl) {
      setLocation("/admin/influencers");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Influencers</h1>
          <p className="text-muted-foreground">Manage creator accounts and scores</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or TikTok..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20" data-testid="select-items-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "suspended" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("suspended"); setCurrentPage(1); }}
              className={statusFilter === "suspended" ? "bg-orange-500 hover:bg-orange-600" : ""}
              data-testid="button-filter-suspended"
            >
              <Ban className="h-3 w-3 mr-1" />
              Suspended
            </Button>
            <Button
              variant={statusFilter === "blocked" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("blocked"); setCurrentPage(1); }}
              className={statusFilter === "blocked" ? "bg-red-600 hover:bg-red-700" : ""}
              data-testid="button-filter-blocked"
            >
              <ShieldX className="h-3 w-3 mr-1" />
              Blocked
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : influencers && influencers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Influencer</TableHead>
                    <TableHead>TikTok</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Penalty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {influencers.map((inf) => (
                    <TableRow
                      key={inf.id}
                      className={cn(
                        "cursor-pointer",
                        inf.unreadChatCount && inf.unreadChatCount > 0 && "bg-red-50 dark:bg-red-950/20"
                      )}
                      onClick={() => handleOpenDrawer(inf)}
                      data-testid={`row-influencer-${inf.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {inf.unreadChatCount && inf.unreadChatCount > 0 && (
                            <div className="relative flex-shrink-0">
                              <MessageCircle className="h-4 w-4 text-red-500" />
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-3.5 min-w-[14px] flex items-center justify-center px-0.5">
                                {inf.unreadChatCount}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-primary hover:underline">{getInfluencerDisplayName(inf, "Unnamed")}</p>
                            <p className="text-xs text-muted-foreground">{inf.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inf.tiktokHandle ? `@${inf.tiktokHandle}` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-x-1">
                          <span>{inf.appliedCount} applied</span>
                          <span>·</span>
                          <span>{inf.acceptedCount} accepted</span>
                          <span>·</span>
                          <span className="text-green-600">{inf.completedCount} completed</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="font-medium">{inf.score ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(inf.penalty && inf.penalty > 0 && "text-red-500")}>
                          {inf.penalty ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {inf.blocked ? (
                          <Badge className="bg-red-600 text-white border-red-700">
                            <ShieldX className="h-3 w-3 mr-1" />
                            Blocked
                          </Badge>
                        ) : inf.suspended ? (
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            <Ban className="h-3 w-3 mr-1" />
                            Suspended
                          </Badge>
                        ) : inf.restricted ? (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            <Lock className="h-3 w-3 mr-1" />
                            Restricted
                          </Badge>
                        ) : inf.profileCompleted ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Incomplete</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inf.createdAt
                          ? format(new Date(inf.createdAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No influencers found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {totalItems > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p data-testid="text-pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} influencers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(pageNum)}
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <InfluencerDetailSheet
        open={!!selectedInfluencerId}
        onClose={handleCloseDrawer}
        influencerId={selectedInfluencerId}
        onDataChange={invalidateInfluencersQueries}
      />
    </AdminLayout>
  );
}
