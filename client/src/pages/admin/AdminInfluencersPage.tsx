import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Influencer } from "@shared/schema";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SiTiktok, SiInstagram } from "react-icons/si";

export default function AdminInfluencersPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);

  const { data: influencers, isLoading } = useQuery<Influencer[]>({
    queryKey: ["/api/admin/influencers"],
    enabled: isAuthenticated && isAdmin,
  });

  const adjustScoreMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/score`, { delta, reason: "admin_manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/influencers"] });
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
      toast({ title: "Account unlocked" });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Influencers</h1>
          <p className="text-muted-foreground">Manage creator accounts and scores</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or TikTok..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredInfluencers && filteredInfluencers.length > 0 ? (
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
                  {filteredInfluencers.map((inf) => (
                    <TableRow
                      key={inf.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedInfluencer(inf)}
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
      </div>

      {/* Influencer Detail Sheet */}
      <Sheet open={!!selectedInfluencer} onOpenChange={(open) => !open && setSelectedInfluencer(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedInfluencer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedInfluencer.name || "Influencer Details"}</SheetTitle>
                <SheetDescription>{selectedInfluencer.email}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                {selectedInfluencer.restricted && (
                  <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
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

                {/* Profile Info */}
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

                {/* Address */}
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

                {/* Score & Penalty */}
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

                {/* Quick Info */}
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
