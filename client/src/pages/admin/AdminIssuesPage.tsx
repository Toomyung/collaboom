import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Package,
  MessageSquare,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ShippingIssueWithDetails } from "@shared/schema";

type IssueStatus = "open" | "resolved" | "dismissed" | "all";

export default function AdminIssuesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<IssueStatus>("open");
  const [selectedIssue, setSelectedIssue] = useState<ShippingIssueWithDetails | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "dismiss" | null>(null);
  const [adminResponse, setAdminResponse] = useState("");

  const { data: issues, isLoading } = useQuery<ShippingIssueWithDetails[]>({
    queryKey: ["/api/admin/issues"],
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response?: string }) => {
      const res = await apiRequest("POST", `/api/admin/issues/${id}/resolve`, { response });
      if (!res.ok) throw new Error("Failed to resolve issue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"] });
      toast({
        title: "Issue Resolved",
        description: "The issue has been marked as resolved.",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response?: string }) => {
      const res = await apiRequest("POST", `/api/admin/issues/${id}/dismiss`, { response });
      if (!res.ok) throw new Error("Failed to dismiss issue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"] });
      toast({
        title: "Issue Dismissed",
        description: "The issue has been dismissed.",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeDialog = () => {
    setSelectedIssue(null);
    setActionType(null);
    setAdminResponse("");
  };

  const handleAction = () => {
    if (!selectedIssue || !actionType) return;
    
    if (actionType === "resolve") {
      resolveMutation.mutate({ id: selectedIssue.id, response: adminResponse || undefined });
    } else {
      dismissMutation.mutate({ id: selectedIssue.id, response: adminResponse || undefined });
    }
  };

  const filteredIssues = issues?.filter((issue) => {
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    
    if (!searchTerm) return matchesStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      issue.influencer?.name?.toLowerCase().includes(searchLower) ||
      issue.influencer?.email?.toLowerCase().includes(searchLower) ||
      issue.influencer?.tiktokHandle?.toLowerCase().includes(searchLower) ||
      issue.campaign?.name?.toLowerCase().includes(searchLower) ||
      issue.campaign?.brandName?.toLowerCase().includes(searchLower) ||
      issue.message?.toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  }) || [];

  const openCount = issues?.filter(i => i.status === "open").length || 0;
  const resolvedCount = issues?.filter(i => i.status === "resolved").length || 0;
  const dismissedCount = issues?.filter(i => i.status === "dismissed").length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive" data-testid="badge-status-open">Open</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-status-resolved">Resolved</Badge>;
      case "dismissed":
        return <Badge variant="secondary" data-testid="badge-status-dismissed">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <AlertCircle className="h-6 w-6 text-destructive" />
            Reported Issues
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage issues reported by influencers
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("open")} data-testid="card-open-issues">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-sm text-muted-foreground">Open Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("resolved")} data-testid="card-resolved-issues">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedCount}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("dismissed")} data-testid="card-dismissed-issues">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dismissedCount}</p>
                  <p className="text-sm text-muted-foreground">Dismissed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by influencer name, email, TikTok, campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-issues"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IssueStatus)}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading issues...</p>
            </CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No issues found</h3>
              <p className="text-muted-foreground mt-1">
                {statusFilter === "open" 
                  ? "Great! There are no open issues to review."
                  : "No issues match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => (
              <Card key={issue.id} className="hover-elevate" data-testid={`issue-card-${issue.id}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Issue Info */}
                    <div className="flex-1 space-y-4">
                      {/* Header Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(issue.status)}
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
                        </span>
                      </div>

                      {/* Influencer Info */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Influencer</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <Link href={`/admin/influencers?search=${encodeURIComponent(issue.influencer?.email || "")}`}>
                              <span className="font-medium text-primary hover:underline" data-testid={`issue-influencer-name-${issue.id}`}>
                                {issue.influencer?.name || "Unknown"}
                              </span>
                            </Link>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span className="font-medium" data-testid={`issue-influencer-email-${issue.id}`}>
                              {issue.influencer?.email || "Unknown"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">TikTok: </span>
                            {issue.influencer?.tiktokHandle ? (
                              <a 
                                href={`https://tiktok.com/@${issue.influencer.tiktokHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                                data-testid={`issue-tiktok-${issue.id}`}
                              >
                                @{issue.influencer.tiktokHandle}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Campaign Info */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Campaign</span>
                        </div>
                        <div className="text-sm">
                          <Link href={`/admin/campaigns/${issue.campaignId}`}>
                            <span className="font-medium text-primary hover:underline" data-testid={`issue-campaign-name-${issue.id}`}>
                              {issue.campaign?.name || "Unknown Campaign"}
                            </span>
                          </Link>
                          {issue.campaign?.brandName && (
                            <span className="text-muted-foreground ml-2">
                              by {issue.campaign.brandName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Issue Message */}
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Issue Report</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" data-testid={`issue-message-${issue.id}`}>
                          {issue.message}
                        </p>
                      </div>

                      {/* Admin Response (if exists) */}
                      {issue.adminResponse && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-600">Admin Response</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap" data-testid={`issue-admin-response-${issue.id}`}>
                            {issue.adminResponse}
                          </p>
                          {issue.resolvedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Responded on {format(new Date(issue.resolvedAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {issue.status === "open" && (
                      <div className="flex lg:flex-col gap-2 lg:w-32">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 lg:w-full"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setActionType("resolve");
                          }}
                          data-testid={`button-resolve-${issue.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 lg:w-full"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setActionType("dismiss");
                          }}
                          data-testid={`button-dismiss-${issue.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedIssue && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "resolve" ? "Resolve Issue" : "Dismiss Issue"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "resolve" 
                ? "Mark this issue as resolved and optionally add a response."
                : "Dismiss this issue and optionally explain why."}
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Issue from {selectedIssue.influencer?.name}:</p>
                <p className="text-muted-foreground">{selectedIssue.message}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Response (optional)
                </label>
                <Textarea
                  placeholder={actionType === "resolve" 
                    ? "Explain how the issue was resolved..."
                    : "Explain why this issue was dismissed..."}
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                  data-testid="textarea-admin-response"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-action">
              Cancel
            </Button>
            <Button
              variant={actionType === "resolve" ? "default" : "secondary"}
              onClick={handleAction}
              disabled={resolveMutation.isPending || dismissMutation.isPending}
              data-testid="button-confirm-action"
            >
              {(resolveMutation.isPending || dismissMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionType === "resolve" ? "Resolve Issue" : "Dismiss Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
