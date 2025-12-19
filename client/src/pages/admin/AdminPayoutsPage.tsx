import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { InfluencerDetailSheet } from "@/components/admin/InfluencerDetailSheet";
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
import {
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { PayoutRequestWithDetails } from "@shared/schema";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";
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

type PayoutStatus = "pending" | "processing" | "completed" | "rejected" | "all";

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("pending");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: payoutRequests, isLoading } = useQuery<PayoutRequestWithDetails[]>({
    queryKey: ["/api/admin/payout-requests"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/payout-requests/${id}`, { status, adminNote });
      if (!res.ok) throw new Error("Failed to update payout request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payout-requests"] });
      toast({
        title: "Payout Updated",
        description: "The payout request status has been updated.",
      });
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleExpand = (requestId: string) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
  };

  const filteredRequests = payoutRequests?.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    
    if (!searchTerm) return matchesStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const influencerName = getInfluencerDisplayName(request.influencer, "").toLowerCase();
    const matchesSearch = 
      influencerName.includes(searchLower) ||
      request.influencer?.email?.toLowerCase().includes(searchLower) ||
      request.influencer?.tiktokHandle?.toLowerCase().includes(searchLower) ||
      request.influencer?.paypalEmail?.toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  }) || [];

  const pendingCount = payoutRequests?.filter(r => r.status === "pending").length || 0;
  const processingCount = payoutRequests?.filter(r => r.status === "processing").length || 0;
  const completedCount = payoutRequests?.filter(r => r.status === "completed").length || 0;
  const rejectedCount = payoutRequests?.filter(r => r.status === "rejected").length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600" data-testid="badge-status-pending">Pending</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600" data-testid="badge-status-processing">Processing</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600" data-testid="badge-status-completed">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive" data-testid="badge-status-rejected">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPendingAmount = payoutRequests
    ?.filter(r => r.status === "pending" || r.status === "processing")
    .reduce((sum, r) => sum + r.amount, 0) || 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payout Requests</h1>
            <p className="text-muted-foreground">Manage influencer payout requests</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Pending Payouts</p>
            <p className="text-2xl font-bold text-emerald-600">${totalPendingAmount}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, TikTok, or PayPal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-payouts"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PayoutStatus)}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({payoutRequests?.length || 0})</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="processing">Processing ({processingCount})</SelectItem>
              <SelectItem value="completed">Completed ({completedCount})</SelectItem>
              <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium text-lg mb-1">No payout requests found</h3>
              <p className="text-muted-foreground text-sm">
                {statusFilter === "pending" 
                  ? "No pending payout requests at this time."
                  : "Try adjusting your search or filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const isExpanded = expandedRequests.has(request.id);
              return (
                <Card key={request.id} className="overflow-hidden" data-testid={`card-payout-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedInfluencerId(request.influencerId)}
                              className="font-medium hover:underline text-left"
                              data-testid={`link-influencer-${request.id}`}
                            >
                              {getInfluencerDisplayName(request.influencer, "Unknown")}
                            </button>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              @{request.influencer?.tiktokHandle || "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-600">${request.amount}</p>
                          <p className="text-xs text-muted-foreground">PayPal: {request.influencer?.paypalEmail || "Not set"}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(request.id)}
                          data-testid={`button-expand-${request.id}`}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p className="font-medium">{request.influencer?.email || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">PayPal Email</p>
                            <p className="font-medium">{request.influencer?.paypalEmail || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Requested At</p>
                            <p className="font-medium">
                              {request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy h:mm a") : "N/A"}
                            </p>
                          </div>
                          {request.processedAt && (
                            <div>
                              <p className="text-muted-foreground">Processed At</p>
                              <p className="font-medium">
                                {format(new Date(request.processedAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          )}
                        </div>

                        {request.adminNote && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Admin Notes</p>
                            <p className="text-sm">{request.adminNote}</p>
                          </div>
                        )}

                        {(request.status === "pending" || request.status === "processing") && (
                          <div className="flex gap-2 pt-2">
                            {request.status === "pending" && (
                              <Button
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ id: request.id, status: "processing" })}
                                disabled={updateStatusMutation.isPending}
                                data-testid={`button-mark-processing-${request.id}`}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Mark Processing
                              </Button>
                            )}
                            <Button
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: "completed" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-mark-completed-${request.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Completed
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => setRejectingId(request.id)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
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

      <InfluencerDetailSheet
        influencerId={selectedInfluencerId}
        open={!!selectedInfluencerId}
        onClose={() => setSelectedInfluencerId(null)}
      />

      <AlertDialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payout Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this payout request? The influencer's balance will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1"
              data-testid="input-reject-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rejectingId) {
                  updateStatusMutation.mutate({
                    id: rejectingId,
                    status: "rejected",
                    adminNote: rejectReason || undefined,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reject"
            >
              Reject Payout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
