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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Headphones,
  Search,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  Mail,
  ExternalLink,
  MapPin,
  Phone,
  Star,
  AlertTriangle,
} from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SupportTicketWithDetails, Influencer } from "@shared/schema";

type TicketStatus = "open" | "resolved" | "closed" | "all";

export default function AdminSupportTicketsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus>("open");
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<"resolved" | "closed">("resolved");
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);

  const { data: tickets, isLoading } = useQuery<SupportTicketWithDetails[]>({
    queryKey: ["/api/admin/support-tickets"],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response, status }: { id: string; response: string; status: string }) => {
      const res = await apiRequest("POST", `/api/admin/support-tickets/${id}/respond`, { response, status });
      if (!res.ok) throw new Error("Failed to respond to ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      toast({
        title: "Response Sent",
        description: "Your response has been sent to the influencer.",
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

  const handleReply = (ticketId: string) => {
    if (!replyText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a response message.",
        variant: "destructive",
      });
      return;
    }
    respondMutation.mutate({ id: ticketId, response: replyText, status: replyStatus });
  };

  const toggleExpand = (ticketId: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    if (!searchTerm) return matchesStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      ticket.influencer?.name?.toLowerCase().includes(searchLower) ||
      ticket.influencer?.email?.toLowerCase().includes(searchLower) ||
      ticket.influencer?.tiktokHandle?.toLowerCase().includes(searchLower) ||
      ticket.subject?.toLowerCase().includes(searchLower) ||
      ticket.message?.toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  }) || [];

  const openCount = tickets?.filter(t => t.status === "open").length || 0;
  const resolvedCount = tickets?.filter(t => t.status === "resolved").length || 0;
  const closedCount = tickets?.filter(t => t.status === "closed").length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive" data-testid="badge-status-open">Awaiting Reply</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-status-resolved">Resolved</Badge>;
      case "closed":
        return <Badge variant="secondary" data-testid="badge-status-closed">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Headphones className="h-6 w-6 text-primary" />
            Support Tickets
          </h1>
          <p className="text-muted-foreground mt-1">
            General questions and support requests from influencers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("open")} data-testid="card-open-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Headphones className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-sm text-muted-foreground">Awaiting Reply</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("resolved")} data-testid="card-resolved-tickets">
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

          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("closed")} data-testid="card-closed-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{closedCount}</p>
                  <p className="text-sm text-muted-foreground">Closed</p>
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
                  placeholder="Search by influencer name, email, subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-tickets"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus)}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Awaiting Reply</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading support tickets...</p>
            </CardContent>
          </Card>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Headphones className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No support tickets found</h3>
              <p className="text-muted-foreground mt-1">
                {statusFilter === "open" 
                  ? "All caught up! No tickets awaiting reply."
                  : "No tickets match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedTickets.has(ticket.id);
              const isReplying = replyingTo === ticket.id;
              
              return (
                <Card key={ticket.id} className="overflow-visible" data-testid={`ticket-card-${ticket.id}`}>
                  <CardContent className="pt-6">
                    <div 
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => toggleExpand(ticket.id)}
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="font-medium text-primary hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (ticket.influencer) {
                                  setSelectedInfluencer(ticket.influencer);
                                }
                              }}
                              data-testid={`button-influencer-name-${ticket.id}`}
                            >
                              {ticket.influencer?.name || "Unknown Influencer"}
                            </button>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {ticket.createdAt && format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-primary mt-1">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {ticket.message}
                        </p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{ticket.influencer?.email}</span>
                          </div>
                          {ticket.influencer?.tiktokHandle && (
                            <a 
                              href={`https://tiktok.com/@${ticket.influencer.tiktokHandle.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="h-auto py-0 px-2">
                                @{ticket.influencer.tiktokHandle.replace("@", "")}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </a>
                          )}
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm font-medium mb-2">Full Message</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {ticket.message}
                          </p>
                        </div>

                        {ticket.adminResponse && (
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-sm font-medium text-primary mb-2">Admin Response</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {ticket.adminResponse}
                            </p>
                            {ticket.resolvedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Responded on {format(new Date(ticket.resolvedAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            )}
                          </div>
                        )}

                        {ticket.status === "open" && (
                          <>
                            {!isReplying ? (
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingTo(ticket.id);
                                }}
                                data-testid={`button-reply-${ticket.id}`}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Reply
                              </Button>
                            ) : (
                              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                <Textarea
                                  placeholder="Type your response..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[100px]"
                                  data-testid={`textarea-reply-${ticket.id}`}
                                />
                                <div className="flex items-center gap-2">
                                  <Select value={replyStatus} onValueChange={(v) => setReplyStatus(v as "resolved" | "closed")}>
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="resolved">Mark Resolved</SelectItem>
                                      <SelectItem value="closed">Mark Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button 
                                    onClick={() => handleReply(ticket.id)}
                                    disabled={respondMutation.isPending}
                                    data-testid={`button-send-reply-${ticket.id}`}
                                  >
                                    {respondMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Send Response
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText("");
                                    }}
                                    data-testid={`button-cancel-reply-${ticket.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
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

      <Sheet open={!!selectedInfluencer} onOpenChange={(open) => !open && setSelectedInfluencer(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedInfluencer && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Influencer Profile
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedInfluencer.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedInfluencer.restricted ? "destructive" : "default"}>
                        {selectedInfluencer.restricted ? "Restricted" : "Active"}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{selectedInfluencer.score ?? 0}</span>
                      </div>
                      {(selectedInfluencer.penalty ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{selectedInfluencer.penalty}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedInfluencer.email}</span>
                      </div>
                      {selectedInfluencer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedInfluencer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Social Media</h4>
                    <div className="space-y-2">
                      {selectedInfluencer.tiktokHandle && (
                        <a
                          href={`https://tiktok.com/@${selectedInfluencer.tiktokHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <SiTiktok className="h-4 w-4" />
                          @{selectedInfluencer.tiktokHandle.replace("@", "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {selectedInfluencer.instagramHandle && (
                        <a
                          href={`https://instagram.com/${selectedInfluencer.instagramHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <SiInstagram className="h-4 w-4" />
                          @{selectedInfluencer.instagramHandle.replace("@", "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {(selectedInfluencer.addressLine1 || selectedInfluencer.city) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Shipping Address</h4>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          {selectedInfluencer.addressLine1 && <div>{selectedInfluencer.addressLine1}</div>}
                          {selectedInfluencer.addressLine2 && <div>{selectedInfluencer.addressLine2}</div>}
                          {(selectedInfluencer.city || selectedInfluencer.state || selectedInfluencer.zipCode) && (
                            <div>
                              {selectedInfluencer.city}{selectedInfluencer.city && selectedInfluencer.state ? ", " : ""}
                              {selectedInfluencer.state} {selectedInfluencer.zipCode}
                            </div>
                          )}
                          {selectedInfluencer.country && <div>{selectedInfluencer.country}</div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedInfluencer.createdAt && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Member Since</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(selectedInfluencer.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
