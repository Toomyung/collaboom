import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Star,
  AlertTriangle,
  Plus,
  Minus,
  Unlock,
  History,
  FileText,
  Package,
  MessageSquare,
  Send,
  TrendingUp,
  TrendingDown,
  Trophy,
  DollarSign,
  AlertCircle,
  LayoutDashboard,
  Clock,
  CheckCircle,
  Truck,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  X,
  ArrowLeft,
} from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Influencer, AdminNote, ScoreEvent, PenaltyEvent, Application, Campaign, ShippingIssue, Shipping } from "@shared/schema";

type ApplicationWithDetails = Application & { 
  campaign?: Campaign;
  issues?: ShippingIssue[];
  shipping?: Shipping | null;
};

type InfluencerWithStats = Influencer & {
  appliedCount?: number;
  acceptedCount?: number;
  completedCount?: number;
};

interface DashboardStats {
  influencer: Influencer;
  stats: {
    score: number;
    penalty: number;
    completedCount: number;
    missedCount: number;
    cashEarned: number;
    totalPointsFromCampaigns: number;
    totalApplications: number;
  };
  recentApplications: ApplicationWithDetails[];
  scoreEventsCount: number;
  penaltyEventsCount: number;
}

interface InfluencerDetailSheetProps {
  open: boolean;
  onClose: () => void;
  influencerId: string | null;
  initialInfluencer?: Influencer | null;
  onDataChange?: () => void;
}

const statusConfig: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  textColor: string;
  icon: typeof Clock;
  description: string;
  step: number;
}> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    bgColor: "bg-yellow-500/10 border border-yellow-500/20",
    textColor: "text-yellow-700",
    icon: Clock,
    description: "Awaiting approval from our team",
    step: 1,
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    bgColor: "bg-green-500/10 border border-green-500/20",
    textColor: "text-green-700",
    icon: CheckCircle,
    description: "Application approved. Shipping will begin soon.",
    step: 2,
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    bgColor: "bg-gray-500/10 border border-gray-500/20",
    textColor: "text-gray-600",
    icon: AlertCircle,
    description: "Application was not selected for this campaign.",
    step: 0,
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    bgColor: "bg-blue-500/10 border border-blue-500/20",
    textColor: "text-blue-700",
    icon: Truck,
    description: "Package is on the way!",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    bgColor: "bg-purple-500/10 border border-purple-500/20",
    textColor: "text-purple-700",
    icon: Package,
    description: "Package delivered. Awaiting content upload.",
    step: 4,
  },
  uploaded: {
    label: "Content Uploaded",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    bgColor: "bg-emerald-500/10 border border-emerald-500/20",
    textColor: "text-emerald-700",
    icon: Upload,
    description: "Content has been verified and uploaded.",
    step: 5,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    bgColor: "bg-emerald-500/10 border border-emerald-500/20",
    textColor: "text-emerald-700",
    icon: CheckCircle,
    description: "Campaign completed successfully!",
    step: 5,
  },
  deadline_missed: {
    label: "Deadline Missed",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    bgColor: "bg-red-500/10 border border-red-500/20",
    textColor: "text-red-600",
    icon: AlertCircle,
    description: "The upload deadline has passed.",
    step: 0,
  },
};

const progressSteps = [
  { label: "Applied", icon: Clock },
  { label: "Approved", icon: CheckCircle },
  { label: "Shipped", icon: Truck },
  { label: "Delivered", icon: Package },
  { label: "Uploaded", icon: Upload },
];

type DetailView = "score" | "completed" | "missed" | "cash" | null;

export function InfluencerDetailSheet({
  open,
  onClose,
  influencerId,
  initialInfluencer,
  onDataChange,
}: InfluencerDetailSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newNote, setNewNote] = useState("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
  const [detailView, setDetailView] = useState<DetailView>(null);

  const { data: influencer } = useQuery<InfluencerWithStats>({
    queryKey: ["/api/admin/influencers", influencerId],
    enabled: !!influencerId && open,
  });

  const selectedInfluencer = influencer || initialInfluencer;

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/influencers", influencerId, "dashboard-stats"],
    enabled: !!influencerId && open,
  });

  const { data: notes } = useQuery<AdminNote[]>({
    queryKey: ["/api/admin/influencers", influencerId, "notes"],
    enabled: !!influencerId && open,
  });

  const { data: scoreEvents } = useQuery<ScoreEvent[]>({
    queryKey: ["/api/admin/influencers", influencerId, "score-events"],
    enabled: !!influencerId && open,
  });

  const { data: penaltyEvents } = useQuery<PenaltyEvent[]>({
    queryKey: ["/api/admin/influencers", influencerId, "penalty-events"],
    enabled: !!influencerId && open,
  });

  const { data: applications } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/admin/influencers", influencerId, "applications"],
    enabled: !!influencerId && open,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/admin/influencers');
      }
    });
    onDataChange?.();
  };

  const adjustScoreMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/score`, { delta, reason: "admin_manual" });
    },
    onSuccess: () => {
      invalidateQueries();
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
      invalidateQueries();
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
      invalidateQueries();
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
      invalidateQueries();
      setNewNote("");
      toast({ title: "Note added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (influencerId && newNote.trim()) {
      addNoteMutation.mutate({ id: influencerId, note: newNote.trim() });
    }
  };

  const handleClose = () => {
    setNewNote("");
    setActiveTab("dashboard");
    setExpandedCampaigns([]);
    setDetailView(null);
    onClose();
  };

  type HistoryEvent = {
    id: string;
    type: 'score' | 'penalty';
    delta: number;
    reason: string;
    createdAt: Date | null;
  };

  const combinedHistory: HistoryEvent[] = [
    ...(scoreEvents || []).map((e) => ({
      id: e.id,
      type: 'score' as const,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
    ...(penaltyEvents || []).map((e) => ({
      id: e.id,
      type: 'penalty' as const,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
  ].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = dashboardStats?.stats;

  const completedApps = dashboardStats?.recentApplications?.filter(
    (a) => a.status === "uploaded" || a.status === "completed"
  ) || [];

  const missedApps = dashboardStats?.recentApplications?.filter(
    (a) => a.status === "deadline_missed"
  ) || [];

  const cashApps = completedApps.filter(
    (a) => a.campaign?.rewardType === "gift_paid" && (a.campaign?.rewardAmount || 0) > 0
  );

  const renderProgressBar = (status: string) => {
    const currentStep = statusConfig[status]?.step || 0;
    if (status === "rejected" || status === "deadline_missed") return null;

    return (
      <div className="flex items-center gap-1 w-full mt-3">
        {progressSteps.map((step, index) => {
          const stepNum = index + 1;
          const isComplete = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={step.label} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    isComplete ? "bg-primary" : "bg-muted"
                  )}
                />
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <step.icon
                  className={cn(
                    "h-2.5 w-2.5",
                    isComplete ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[9px]",
                    isCurrent ? "text-primary font-medium" : isComplete ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderApplicationDetails = (app: ApplicationWithDetails) => {
    const campaign = app.campaign;
    const status = statusConfig[app.status] || statusConfig.pending;
    const issues = app.issues || [];

    return (
      <div className="space-y-3 pt-2">
        {renderProgressBar(app.status)}

        <div className={cn("rounded-lg p-3 mt-3", status.bgColor)}>
          <p className={cn("text-xs", status.textColor)}>
            {app.status === "uploaded" && app.pointsAwarded && app.pointsAwarded > 0
              ? `Content verified! +${app.pointsAwarded} points awarded.`
              : status.description}
          </p>
        </div>

        {app.shipping && (app.status === "shipped" || app.status === "delivered") && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Shipping Info</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {app.shipping.courier && <span>Courier: {app.shipping.courier}</span>}
              {app.shipping.trackingNumber && (
                <span className="ml-2">Tracking: {app.shipping.trackingNumber}</span>
              )}
            </div>
            {app.shipping.trackingUrl && (
              <a
                href={app.shipping.trackingUrl.startsWith('http') 
                  ? app.shipping.trackingUrl 
                  : `https://${app.shipping.trackingUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                Track Package
              </a>
            )}
          </div>
        )}

        {app.status === "uploaded" && app.contentUrl && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Upload className="h-3 w-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">Uploaded Video</span>
              </div>
              {app.pointsAwarded && app.pointsAwarded > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                  +{app.pointsAwarded} pts
                </Badge>
              )}
            </div>
            <a
              href={app.contentUrl.startsWith('http') ? app.contentUrl : `https://${app.contentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              View TikTok Video
            </a>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Comment History</p>
            {issues.map((issue) => (
              <div 
                key={issue.id} 
                className={cn(
                  "rounded-lg p-2 space-y-1.5 text-xs",
                  issue.status === "open" 
                    ? "bg-amber-500/5 border border-amber-500/20" 
                    : issue.status === "resolved"
                    ? "bg-green-500/5 border border-green-500/20"
                    : "bg-gray-500/5 border border-gray-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className={cn(
                      "h-3 w-3",
                      issue.status === "open" ? "text-amber-600" : 
                      issue.status === "resolved" ? "text-green-600" : "text-gray-500"
                    )} />
                    <span className="font-medium">Influencer Comment</span>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-[10px] h-4",
                      issue.status === "resolved" && "bg-green-500/10 text-green-600"
                    )}
                  >
                    {issue.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{issue.message}</p>
                <p className="text-[10px] text-muted-foreground">
                  {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, yyyy") : ""}
                </p>
                
                {issue.adminResponse && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2 mt-1">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="h-2.5 w-2.5 text-blue-600" />
                      <span className="text-[10px] font-medium text-blue-600">Admin Reply</span>
                    </div>
                    <p className="text-muted-foreground">{issue.adminResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground pt-1 border-t">
          <p>Applied: {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "-"}</p>
          {campaign?.deadline && (
            <p>Deadline: {format(new Date(campaign.deadline), "MMM d, yyyy")}</p>
          )}
        </div>
      </div>
    );
  };

  const renderDetailView = () => {
    if (!detailView) return null;

    const getTitle = () => {
      switch (detailView) {
        case "score": return "Score History";
        case "completed": return "Completed Campaigns";
        case "missed": return "Missed Deadlines";
        case "cash": return "Cash Earned";
      }
    };

    const getIcon = () => {
      switch (detailView) {
        case "score": return <Star className="h-5 w-5 text-primary" />;
        case "completed": return <Trophy className="h-5 w-5 text-green-500" />;
        case "missed": return <AlertCircle className="h-5 w-5 text-red-500" />;
        case "cash": return <DollarSign className="h-5 w-5 text-emerald-500" />;
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setDetailView(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="font-semibold">{getTitle()}</h3>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {detailView === "score" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                <p className="text-sm">
                  Total Score: <span className="font-bold text-primary">{stats?.score ?? 0}</span>
                </p>
              </div>
              {scoreEvents && scoreEvents.length > 0 ? (
                scoreEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      event.delta > 0 
                        ? "bg-green-500/5 border-green-500/20" 
                        : "bg-orange-500/5 border-orange-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {event.delta > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                        )}
                        <span className={cn(
                          "font-medium",
                          event.delta > 0 ? "text-green-600" : "text-orange-600"
                        )}>
                          {event.delta > 0 ? "+" : ""}{event.delta} points
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.reason}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a") : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No score history yet</p>
                </div>
              )}
            </div>
          )}

          {detailView === "completed" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20 mb-4">
                <p className="text-sm">
                  Total Completed: <span className="font-bold text-green-600">{completedApps.length}</span>
                </p>
              </div>
              {completedApps.length > 0 ? (
                completedApps.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.campaign?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                      </div>
                      <Badge className="bg-green-500/10 text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                    {app.pointsAwarded && app.pointsAwarded > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <Star className="h-3 w-3 fill-amber-500" />
                        +{app.pointsAwarded} points earned
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Completed: {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No completed campaigns yet</p>
                </div>
              )}
            </div>
          )}

          {detailView === "missed" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 mb-4">
                <p className="text-sm">
                  Total Missed: <span className="font-bold text-red-600">{missedApps.length}</span>
                </p>
              </div>
              {missedApps.length > 0 ? (
                missedApps.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.campaign?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                      </div>
                      <Badge className="bg-red-500/10 text-red-600 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Missed
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Deadline: {app.campaign?.deadline ? format(new Date(app.campaign.deadline), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>No missed deadlines!</p>
                </div>
              )}
            </div>
          )}

          {detailView === "cash" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 mb-4">
                <p className="text-sm">
                  Total Cash Earned: <span className="font-bold text-emerald-600">${stats?.cashEarned ?? 0}</span>
                </p>
              </div>
              {cashApps.length > 0 ? (
                cashApps.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.campaign?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">
                        <DollarSign className="h-3 w-3 mr-0.5" />
                        ${app.campaign?.rewardAmount || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Reward Type: Gift + Paid</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No cash earnings yet</p>
                  <p className="text-xs mt-1">Complete "Gift + Paid" campaigns to earn cash!</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
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

            {detailView ? (
              <div className="mt-6">
                {renderDetailView()}
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="profile" data-testid="tab-profile">
                    <User className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">
                    <History className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">
                    <MessageSquare className="h-4 w-4" />
                    {notes && notes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                        {notes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" data-testid="tab-campaigns">
                    <Package className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("score")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Star className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">{stats?.score ?? selectedInfluencer.score ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Score</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("completed")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Trophy className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">{stats?.completedCount ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("missed")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">{stats?.missedCount ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Missed</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("cash")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">${stats?.cashEarned ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Cash Earned</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">Score</p>
                          <Star className="h-3 w-3 text-yellow-500" />
                        </div>
                        <p className="text-lg font-bold">{selectedInfluencer.score ?? 0}</p>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
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
                            className="h-7 w-7 p-0"
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
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">Penalty</p>
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        </div>
                        <p className="text-lg font-bold">{selectedInfluencer.penalty ?? 0}</p>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
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
                            className="h-7 w-7 p-0"
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

                  {dashboardStats?.recentApplications && dashboardStats.recentApplications.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recent Campaigns</h4>
                      <Accordion 
                        type="multiple" 
                        value={expandedCampaigns}
                        onValueChange={setExpandedCampaigns}
                        className="space-y-2"
                      >
                        {dashboardStats.recentApplications.map((app) => {
                          const status = statusConfig[app.status] || statusConfig.pending;
                          const StatusIcon = status.icon;
                          const hasComments = app.issues && app.issues.length > 0;

                          return (
                            <AccordionItem
                              key={app.id}
                              value={app.id}
                              className="border rounded-lg overflow-hidden bg-card"
                            >
                              <AccordionTrigger className="hover:no-underline px-3 py-2 [&>svg]:hidden">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="font-medium text-sm truncate">{app.campaign?.name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hasComments && (
                                      <MessageSquare className="h-3 w-3 text-amber-500" />
                                    )}
                                    <Badge
                                      variant="secondary"
                                      className={cn("text-xs", status.color)}
                                    >
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {status.label}
                                    </Badge>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                {renderApplicationDetails(app)}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p>Total Applications: {stats?.totalApplications ?? 0}</p>
                    <p>Points from Campaigns: {stats?.totalPointsFromCampaigns ?? 0}</p>
                    <p>
                      Joined:{" "}
                      {selectedInfluencer.createdAt
                        ? format(new Date(selectedInfluencer.createdAt), "MMMM d, yyyy")
                        : "-"}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="profile" className="mt-4 space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-medium">Contact Info</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">TikTok</p>
                        {selectedInfluencer.tiktokHandle ? (
                          <a
                            href={`https://tiktok.com/@${selectedInfluencer.tiktokHandle.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <SiTiktok className="h-3 w-3" />
                            @{selectedInfluencer.tiktokHandle.replace("@", "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="flex items-center gap-1">
                            <SiTiktok className="h-3 w-3" />
                            -
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Instagram</p>
                        {selectedInfluencer.instagramHandle ? (
                          <a
                            href={`https://instagram.com/${selectedInfluencer.instagramHandle.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <SiInstagram className="h-3 w-3" />
                            @{selectedInfluencer.instagramHandle.replace("@", "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="flex items-center gap-1">
                            <SiInstagram className="h-3 w-3" />
                            -
                          </p>
                        )}
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
                      {selectedInfluencer.country && (
                        <>
                          <br />
                          {selectedInfluencer.country}
                        </>
                      )}
                    </p>
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
                                  app.status === "completed" || app.status === "uploaded"
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
                            {app.pointsAwarded && app.pointsAwarded > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                                <Star className="h-3 w-3 fill-amber-500" />
                                +{app.pointsAwarded} points
                              </div>
                            )}
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
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
