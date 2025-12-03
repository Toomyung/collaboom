import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ShippingIssue } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ConversationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  influencerName: string;
  campaignName: string;
}

export function ConversationSheet({
  open,
  onOpenChange,
  applicationId,
  influencerName,
  campaignName,
}: ConversationSheetProps) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyAction, setReplyAction] = useState<"resolve" | "dismiss">("resolve");

  const { data: issues, isLoading } = useQuery<ShippingIssue[]>({
    queryKey: ["/api/admin/applications", applicationId, "issues"],
    enabled: open && !!applicationId,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response?: string }) => {
      const res = await apiRequest("POST", `/api/admin/issues/${id}/resolve`, { response });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"] });
      toast({
        title: "Reply sent",
        description: "Your response has been sent to the influencer.",
      });
      setReplyingTo(null);
      setReplyText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response?: string }) => {
      const res = await apiRequest("POST", `/api/admin/issues/${id}/dismiss`, { response });
      if (!res.ok) throw new Error("Failed to dismiss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"] });
      toast({
        title: "Comment dismissed",
        description: "The comment has been dismissed.",
      });
      setReplyingTo(null);
      setReplyText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to dismiss",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitReply = (issueId: string) => {
    if (replyAction === "resolve") {
      resolveMutation.mutate({ id: issueId, response: replyText || undefined });
    } else {
      dismissMutation.mutate({ id: issueId, response: replyText || undefined });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Reply
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Replied
          </Badge>
        );
      case "dismissed":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Dismissed
          </Badge>
        );
      default:
        return null;
    }
  };

  // Sort issues by date, newest first
  const sortedIssues = issues?.slice().sort((a, b) => 
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  const openIssuesCount = issues?.filter(i => i.status === "open").length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation with {influencerName}
          </SheetTitle>
          <SheetDescription>
            {campaignName}
            {openIssuesCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {openIssuesCount} awaiting reply
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : sortedIssues && sortedIssues.length > 0 ? (
            sortedIssues.map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  "rounded-lg border p-4 space-y-3",
                  issue.status === "open" && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {/* Influencer's message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{influencerName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {issue.createdAt && format(new Date(issue.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm pl-8">{issue.message}</p>
                </div>

                {/* Admin response - only show if there's an actual response */}
                {issue.adminResponse && (
                  <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">C</span>
                        </div>
                        <span className="text-sm font-medium">Collaboom Team</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {issue.resolvedAt && format(new Date(issue.resolvedAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm pl-8">{issue.adminResponse}</p>
                  </div>
                )}

                {/* Status badge and reply form for open issues */}
                <div className="flex items-center justify-between pt-2">
                  {getStatusBadge(issue.status)}
                  
                  {issue.status === "open" && (
                    replyingTo === issue.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText("");
                        }}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingTo(issue.id)}
                        className="text-xs"
                        data-testid={`button-reply-${issue.id}`}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    )
                  )}
                </div>

                {/* Reply form */}
                {replyingTo === issue.id && (
                  <div className="space-y-3 pt-2 border-t">
                    <Textarea
                      placeholder="Type your response..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="text-sm min-h-[80px]"
                      data-testid={`textarea-reply-${issue.id}`}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setReplyAction("resolve");
                          handleSubmitReply(issue.id);
                        }}
                        disabled={resolveMutation.isPending || dismissMutation.isPending}
                        className="flex-1"
                        data-testid={`button-send-reply-${issue.id}`}
                      >
                        {resolveMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        Send Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyAction("dismiss");
                          handleSubmitReply(issue.id);
                        }}
                        disabled={resolveMutation.isPending || dismissMutation.isPending}
                        data-testid={`button-dismiss-${issue.id}`}
                      >
                        {dismissMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">When {influencerName} sends a comment, it will appear here.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
