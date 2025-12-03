import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ShippingIssueWithDetails } from "@shared/schema";

type IssueStatus = "open" | "resolved" | "dismissed" | "all";

function getApplicationStatusLabel(status?: string): string {
  switch (status) {
    case "pending": return "Pending Review";
    case "approved": return "Approved";
    case "shipped": return "Shipped";
    case "delivered": return "Delivered";
    case "uploaded": return "Content Uploaded";
    case "completed": return "Completed";
    case "verified": return "Verified";
    case "rejected": return "Not Selected";
    case "deadline_missed": return "Deadline Missed";
    default: return status || "Unknown";
  }
}

function getApplicationStatusColor(status?: string): string {
  switch (status) {
    case "pending": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "approved": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "shipped": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "delivered": return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    case "uploaded": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "completed": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "verified": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "rejected": return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    case "deadline_missed": return "bg-red-500/10 text-red-600 border-red-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

export default function AdminIssuesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<IssueStatus>("open");
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAction, setReplyAction] = useState<"resolve" | "dismiss">("resolve");

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
        title: "Reply Sent",
        description: "Your response has been sent and the comment is now resolved.",
      });
      setReplyingTo(null);
      setReplyText("");
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
        title: "Comment Dismissed",
        description: "The comment has been dismissed.",
      });
      setReplyingTo(null);
      setReplyText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReply = (issueId: string) => {
    if (replyAction === "resolve") {
      resolveMutation.mutate({ id: issueId, response: replyText || undefined });
    } else {
      dismissMutation.mutate({ id: issueId, response: replyText || undefined });
    }
  };

  const toggleExpand = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
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

  const getIssueStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive" data-testid="badge-status-open">Awaiting Reply</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-status-resolved">Replied</Badge>;
      case "dismissed":
        return <Badge variant="secondary" data-testid="badge-status-dismissed">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <MessageSquare className="h-6 w-6 text-primary" />
            Influencer Comments
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and respond to questions and comments from influencers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("open")} data-testid="card-open-issues">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-sm text-muted-foreground">Awaiting Reply</p>
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
                  <p className="text-sm text-muted-foreground">Replied</p>
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
                  <SelectItem value="all">All Comments</SelectItem>
                  <SelectItem value="open">Awaiting Reply</SelectItem>
                  <SelectItem value="resolved">Replied</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading comments...</p>
            </CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No comments found</h3>
              <p className="text-muted-foreground mt-1">
                {statusFilter === "open" 
                  ? "All caught up! No comments awaiting reply."
                  : "No comments match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => {
              const isExpanded = expandedIssues.has(issue.id);
              const isReplying = replyingTo === issue.id;
              
              return (
                <Card key={issue.id} className="overflow-visible" data-testid={`issue-card-${issue.id}`}>
                  <CardContent className="pt-6">
                    <div 
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => toggleExpand(issue.id)}
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium" data-testid={`issue-influencer-name-${issue.id}`}>
                            {issue.influencer?.name || "Unknown"}
                          </span>
                          {getIssueStatusBadge(issue.status)}
                          <Badge 
                            variant="outline" 
                            className={`${getApplicationStatusColor(issue.applicationStatus)} text-xs`}
                          >
                            {getApplicationStatusLabel(issue.applicationStatus)}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {issue.campaign?.name || "Unknown Campaign"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, yyyy") : "Unknown"}
                          </span>
                        </div>
                        
                        <p className={`text-sm ${!isExpanded ? "line-clamp-2" : ""}`} data-testid={`issue-message-${issue.id}`}>
                          {issue.message}
                        </p>
                      </div>
                      
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 ml-14 space-y-4">
                        <div className="flex flex-wrap gap-4 text-sm border-t pt-4">
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
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`issue-tiktok-${issue.id}`}
                              >
                                @{issue.influencer.tiktokHandle}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </div>
                          <Link 
                            href={`/admin/campaigns/${issue.campaignId}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-primary hover:underline inline-flex items-center gap-1">
                              View Campaign
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </Link>
                          <Link 
                            href={`/admin/influencers?search=${encodeURIComponent(issue.influencer?.email || "")}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-primary hover:underline inline-flex items-center gap-1">
                              View Influencer Profile
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </Link>
                        </div>
                        
                        {issue.adminResponse && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-primary">Collaboom Team</span>
                              {issue.resolvedAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(issue.resolvedAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap ml-10" data-testid={`issue-admin-response-${issue.id}`}>
                              {issue.adminResponse}
                            </p>
                          </div>
                        )}
                        
                        {issue.status === "open" && (
                          <div className="border-t pt-4">
                            {!isReplying ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingTo(issue.id);
                                    setReplyAction("resolve");
                                  }}
                                  data-testid={`button-reply-${issue.id}`}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Reply
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissMutation.mutate({ id: issue.id });
                                  }}
                                  disabled={dismissMutation.isPending}
                                  data-testid={`button-dismiss-${issue.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-medium text-sm">Reply as Collaboom Team</span>
                                </div>
                                <Textarea
                                  placeholder="Type your reply to the influencer..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={3}
                                  className="ml-10"
                                  data-testid="textarea-admin-response"
                                />
                                <div className="flex items-center gap-2 ml-10">
                                  <Select 
                                    value={replyAction} 
                                    onValueChange={(v) => setReplyAction(v as "resolve" | "dismiss")}
                                  >
                                    <SelectTrigger className="w-[180px]" data-testid="select-reply-action">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="resolve">
                                        <span className="flex items-center gap-2">
                                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                          Mark as Replied
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="dismiss">
                                        <span className="flex items-center gap-2">
                                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                          Dismiss
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleReply(issue.id)}
                                    disabled={resolveMutation.isPending || dismissMutation.isPending}
                                    data-testid="button-send-reply"
                                  >
                                    {(resolveMutation.isPending || dismissMutation.isPending) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-1" />
                                        Send Reply
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText("");
                                    }}
                                    data-testid="button-cancel-reply"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
