import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Influencer, AdminNote, ScoreEvent, PenaltyEvent, Application, Campaign } from "@shared/schema";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search,
  Star,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  Minus,
  User,
  FileText,
  History,
  MessageSquare,
  Send,
  TrendingUp,
  TrendingDown,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SiTiktok, SiInstagram } from "react-icons/si";

type ApplicationWithCampaign = Application & { campaign?: Campaign };

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function AdminInfluencersPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [newNote, setNewNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: influencers, isLoading } = useQuery<Influencer[]>({
    queryKey: ["/api/admin/influencers"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: notes } = useQuery<AdminNote[]>({
    queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "notes"],
    enabled: !!selectedInfluencer,
  });

  const { data: scoreEvents } = useQuery<ScoreEvent[]>({
    queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "score-events"],
    enabled: !!selectedInfluencer,
  });

  const { data: penaltyEvents } = useQuery<PenaltyEvent[]>({
    queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "penalty-events"],
    enabled: !!selectedInfluencer,
  });

  const { data: applications } = useQuery<ApplicationWithCampaign[]>({
    queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "applications"],
    enabled: !!selectedInfluencer,
  });

  const adjustScoreMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/score`, { delta, reason: "admin_manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "score-events"] });
      toast({ title: "Score updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const adjustPenaltyMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/penalty`, { delta, reason: "admin_manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "penalty-events"] });
      toast({ title: "Penalty updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/unlock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "penalty-events"] });
      toast({ title: "Account unlocked" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/notes`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers", selectedInfluencer?.id, "notes"] });
      setNewNote("");
      toast({ title: "Note added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

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

  const filteredInfluencers = influencers?.filter((inf) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      inf.name?.toLowerCase().includes(query) ||
      inf.email.toLowerCase().includes(query) ||
      inf.tiktokHandle?.toLowerCase().includes(query)
    );
  });

  const totalItems = filteredInfluencers?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInfluencers = filteredInfluencers?.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleOpenDrawer = (inf: Influencer) => {
    setSelectedInfluencer(inf);
    setActiveTab("profile");
  };

  const handleCloseDrawer = () => {
    setSelectedInfluencer(null);
    setNewNote("");
  };

  const handleAddNote = () => {
    if (selectedInfluencer && newNote.trim()) {
      addNoteMutation.mutate({ id: selectedInfluencer.id, note: newNote.trim() });
    }
  };

  const combinedHistory = [
    ...(scoreEvents || []).map(e => ({ ...e, type: 'score' as const })),
    ...(penaltyEvents || []).map(e => ({ ...e, type: 'penalty' as const })),
  ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Influencers</h1>
          <p className="text-muted-foreground">Manage creator accounts and scores</p>
        </div>

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

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : paginatedInfluencers && paginatedInfluencers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Influencer</TableHead>
                    <TableHead>TikTok</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Penalty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInfluencers.map((inf) => (
                    <TableRow
                      key={inf.id}
                      className="cursor-pointer"
                      onClick={() => handleOpenDrawer(inf)}
                      data-testid={`row-influencer-${inf.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{inf.name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{inf.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inf.tiktokHandle ? `@${inf.tiktokHandle}` : "-"}
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
                        {inf.restricted ? (
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
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} influencers
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

      <Sheet open={!!selectedInfluencer} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedInfluencer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedInfluencer.name || "Influencer Details"}</SheetTitle>
                <SheetDescription>{selectedInfluencer.email}</SheetDescription>
              </SheetHeader>

              {selectedInfluencer.restricted && (
                <div className="flex items-center gap-3 p-3 mt-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600">Account Restricted</p>
                    <p className="text-sm text-muted-foreground">
                      Penalty count: {selectedInfluencer.penalty}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unlockMutation.mutate(selectedInfluencer.id)}
                    disabled={unlockMutation.isPending}
                    data-testid="button-unlock"
                  >
                    <Unlock className="h-4 w-4 mr-1" />
                    Unlock
                  </Button>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile" data-testid="tab-profile">
                    <User className="h-4 w-4 mr-1" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">
                    <History className="h-4 w-4 mr-1" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Notes
                    {notes && notes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {notes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" data-testid="tab-campaigns">
                    <Package className="h-4 w-4 mr-1" />
                    Campaigns
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-4 space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-medium">Profile</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">TikTok</p>
                        <p className="flex items-center gap-1">
                          <SiTiktok className="h-3 w-3" />
                          @{selectedInfluencer.tiktokHandle || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Instagram</p>
                        <p className="flex items-center gap-1">
                          <SiInstagram className="h-3 w-3" />
                          @{selectedInfluencer.instagramHandle || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p>{selectedInfluencer.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">PayPal</p>
                        <p className="truncate">{selectedInfluencer.paypalEmail || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Shipping Address</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedInfluencer.addressLine1 || "No address"}
                      {selectedInfluencer.addressLine2 && (
                        <>
                          <br />
                          {selectedInfluencer.addressLine2}
                        </>
                      )}
                      {selectedInfluencer.city && (
                        <>
                          <br />
                          {selectedInfluencer.city}, {selectedInfluencer.state}{" "}
                          {selectedInfluencer.zipCode}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <Star className="h-4 w-4 text-yellow-500" />
                        </div>
                        <p className="text-2xl font-bold">{selectedInfluencer.score ?? 0}</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              adjustScoreMutation.mutate({
                                id: selectedInfluencer.id,
                                delta: -5,
                              })
                            }
                            data-testid="button-score-minus"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              adjustScoreMutation.mutate({
                                id: selectedInfluencer.id,
                                delta: 5,
                              })
                            }
                            data-testid="button-score-plus"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Penalty</p>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-2xl font-bold">{selectedInfluencer.penalty ?? 0}</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              adjustPenaltyMutation.mutate({
                                id: selectedInfluencer.id,
                                delta: -1,
                              })
                            }
                            data-testid="button-penalty-minus"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              adjustPenaltyMutation.mutate({
                                id: selectedInfluencer.id,
                                delta: 1,
                              })
                            }
                            data-testid="button-penalty-plus"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>
                      Profile:{" "}
                      {selectedInfluencer.profileCompleted ? "Complete" : "Incomplete"}
                    </p>
                    <p>
                      Joined:{" "}
                      {selectedInfluencer.createdAt
                        ? format(new Date(selectedInfluencer.createdAt), "MMMM d, yyyy")
                        : "-"}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">Score & Penalty History</h3>
                    {combinedHistory.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {combinedHistory.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border",
                              event.type === 'score'
                                ? event.delta > 0
                                  ? "bg-green-500/5 border-green-500/20"
                                  : "bg-orange-500/5 border-orange-500/20"
                                : "bg-red-500/5 border-red-500/20"
                            )}
                          >
                            <div className={cn(
                              "rounded-full p-1.5",
                              event.type === 'score'
                                ? event.delta > 0 ? "bg-green-500/10" : "bg-orange-500/10"
                                : "bg-red-500/10"
                            )}>
                              {event.type === 'score' ? (
                                event.delta > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-orange-600" />
                                )
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  event.type === 'score'
                                    ? event.delta > 0 ? "text-green-600" : "text-orange-600"
                                    : "text-red-600"
                                )}>
                                  {event.delta > 0 ? "+" : ""}{event.delta}
                                  {event.type === 'score' ? " Score" : " Penalty"}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {event.reason}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.createdAt
                                  ? format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No history yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note about this influencer..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 resize-none"
                        rows={2}
                        data-testid="input-note"
                      />
                      <Button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addNoteMutation.isPending}
                        data-testid="button-add-note"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {notes && notes.length > 0 ? (
                        notes
                          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                          .map((note) => (
                            <div
                              key={note.id}
                              className="p-3 rounded-lg border bg-muted/30"
                            >
                              <p className="text-sm">{note.note}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {note.createdAt
                                  ? format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")
                                  : "-"}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No notes yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="campaigns" className="mt-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">Campaign History</h3>
                    {applications && applications.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {applications.map((app) => (
                          <div
                            key={app.id}
                            className="p-3 rounded-lg border"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {app.campaign?.name || "Unknown Campaign"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {app.campaign?.brandName}
                                </p>
                              </div>
                              <Badge
                                className={cn(
                                  app.status === "completed"
                                    ? "bg-green-500/10 text-green-600"
                                    : app.status === "rejected" || app.status === "deadline_missed"
                                    ? "bg-red-500/10 text-red-600"
                                    : app.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-600"
                                    : "bg-blue-500/10 text-blue-600"
                                )}
                              >
                                {app.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Applied:{" "}
                              {app.appliedAt
                                ? format(new Date(app.appliedAt), "MMM d, yyyy")
                                : "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No campaign applications</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
