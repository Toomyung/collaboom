import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationWithDetails, ShippingIssue, ScoreEvent, SupportTicket, PayoutRequest } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link, Redirect, useLocation } from "wouter";
import {
  Star,
  AlertTriangle,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Upload,
  XCircle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  MessageSquare,
  Eye,
  Sparkles,
  DollarSign,
  Trophy,
  ChevronRight,
  Headphones,
  Send,
  Crown,
  User,
  UserPlus,
  Store,
  Video,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatApiError } from "@/lib/queryClient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getCampaignThumbnail } from "@/lib/imageUtils";

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; textColor: string; icon: typeof Clock; description: string; step: number }
> = {
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
    description: "Your application has been approved! Shipping will begin soon.",
    step: 2,
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    bgColor: "bg-gray-500/10 border border-gray-500/20",
    textColor: "text-gray-600",
    icon: XCircle,
    description: "Unfortunately, due to the brand's circumstances, we couldn't work together on this campaign. We hope to collaborate with you on future opportunities!",
    step: 0,
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    bgColor: "bg-blue-500/10 border border-blue-500/20",
    textColor: "text-blue-700",
    icon: Truck,
    description: "Your package is on the way!",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    bgColor: "bg-purple-500/10 border border-purple-500/20",
    textColor: "text-purple-700",
    icon: Package,
    description: "Package delivered! Please create your TikTok video and submit the link below.",
    step: 4,
  },
  uploaded: {
    label: "Content Uploaded",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    bgColor: "bg-emerald-500/10 border border-emerald-500/20",
    textColor: "text-emerald-700",
    icon: Upload,
    description: "We've confirmed your video upload - thank you so much for participating! We'll be sharing your content with the brand. Please keep your video live for at least 6 weeks and avoid changing your TikTok handle during this period.",
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

const linkInBioProgressSteps = [
  { label: "Applied", icon: Clock },
  { label: "Approved", icon: CheckCircle },
  { label: "Shipped", icon: Truck },
  { label: "Delivered", icon: Package },
  { label: "Bio Link", icon: ExternalLink },
  { label: "Video", icon: Upload },
];

interface ScoreEventWithCampaign extends ScoreEvent {
  campaign?: {
    id: string;
    name: string;
    brandName: string;
  };
}

function getTierInfo(score: number, completedCampaigns: number) {
  // Tier definitions:
  // - Starting: completedCampaigns === 0 OR score < 50
  // - Standard: completedCampaigns >= 1 AND score >= 50 AND score < 85
  // - VIP: completedCampaigns >= 1 AND score >= 85
  if (completedCampaigns === 0 || score < 50) {
    return {
      name: "Starting",
      fullName: "Starting Influencer",
      color: "text-slate-600",
      bgColor: "bg-slate-500/10",
      icon: UserPlus,
    };
  }
  if (score >= 85) {
    return {
      name: "VIP",
      fullName: "VIP Influencer",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      icon: Crown,
    };
  }
  return {
    name: "Standard",
    fullName: "Standard Influencer",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    icon: User,
  };
}

export default function DashboardPage() {
  const { isAuthenticated, influencer, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueMessage, setIssueMessage] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [applicationToCancel, setApplicationToCancel] = useState<ApplicationWithDetails | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [applicationToDismiss, setApplicationToDismiss] = useState<ApplicationWithDetails | null>(null);
  
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [showCompletedSheet, setShowCompletedSheet] = useState(false);
  const [showMissedSheet, setShowMissedSheet] = useState(false);
  const [showCashSheet, setShowCashSheet] = useState(false);
  const [showSupportSheet, setShowSupportSheet] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [showTierUpgradeDialog, setShowTierUpgradeDialog] = useState(false);
  const [pendingTierUpgrade, setPendingTierUpgrade] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [location] = useLocation();
  const [showPayoutConfirmDialog, setShowPayoutConfirmDialog] = useState(false);
  const [showDeliveryConfirmDialog, setShowDeliveryConfirmDialog] = useState(false);
  const [applicationToConfirmDelivery, setApplicationToConfirmDelivery] = useState<ApplicationWithDetails | null>(null);

  // Function to scroll to a specific application by ID
  const scrollToApplication = (applicationId: string) => {
    // Expand the accordion item first
    setExpandedItems(prev => 
      prev.includes(applicationId) ? prev : [...prev, applicationId]
    );
    // Wait a bit for the element to be rendered, then scroll
    setTimeout(() => {
      const element = document.getElementById(`application-${applicationId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
      // Clear the hash from URL after scrolling
      window.history.replaceState(null, '', window.location.pathname);
    }, 300);
  };

  // Handle hash anchors from notifications (application or cash-earned)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#application-')) {
      const applicationId = hash.replace('#application-', '');
      scrollToApplication(applicationId);
    } else if (hash === '#cash-earned') {
      setShowCashSheet(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [location]);

  // Also listen for hashchange events (for when already on dashboard)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#application-')) {
        const applicationId = hash.replace('#application-', '');
        scrollToApplication(applicationId);
      } else if (hash === '#cash-earned') {
        setShowCashSheet(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const { data: applications, isLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications/detailed"],
    enabled: isAuthenticated,
  });

  const { data: allApplications } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications/all-history"],
    enabled: isAuthenticated,
  });

  const { data: scoreEvents } = useQuery<ScoreEventWithCampaign[]>({
    queryKey: ["/api/me/score-events"],
    enabled: isAuthenticated && showScoreSheet,
  });

  const { data: myIssues } = useQuery<ShippingIssue[]>({
    queryKey: ["/api/my-issues"],
    enabled: isAuthenticated,
  });

  const { data: mySupportTickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets/my"],
    enabled: isAuthenticated && showSupportSheet,
  });

  const { data: payoutData } = useQuery<{ requests: PayoutRequest[]; totalPayoutsRequested: number }>({
    queryKey: ["/api/payout-requests"],
    enabled: isAuthenticated && showCashSheet,
  });

  const submitSupportTicketMutation = useMutation({
    mutationFn: async ({ subject, message }: { subject: string; message: string }) => {
      await apiRequest("POST", "/api/support-tickets", { subject, message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets/my"] });
      toast({
        title: "Ticket submitted",
        description: "We'll get back to you as soon as possible.",
      });
      setSupportSubject("");
      setSupportMessage("");
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      await apiRequest("POST", "/api/payout-requests", { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      toast({
        title: "Payout request submitted",
        description: "Your payout request has been submitted and is pending admin review.",
      });
      setShowPayoutConfirmDialog(false);
    },
    onError: (error: Error) => {
      setShowPayoutConfirmDialog(false);
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  const issuesByApplicationId = myIssues?.reduce((acc, issue) => {
    if (!acc[issue.applicationId]) {
      acc[issue.applicationId] = [];
    }
    acc[issue.applicationId].push(issue);
    return acc;
  }, {} as Record<string, ShippingIssue[]>) || {};

  const cancelMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/applications/${applicationId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Application cancelled",
        description: "Your application has been cancelled. You can re-apply to this campaign if you change your mind.",
      });
      setShowCancelDialog(false);
      setApplicationToCancel(null);
    },
    onError: (error: Error) => {
      setShowCancelDialog(false);
      setApplicationToCancel(null);
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: async ({ applicationId, message }: { applicationId: string; message: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/report-issue`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-issues"] });
      toast({
        title: "Comment submitted",
        description: "The Collaboom team will respond as soon as possible.",
      });
      setShowIssueDialog(false);
      setIssueMessage("");
      setSelectedApplication(null);
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/applications/${applicationId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Campaign dismissed",
        description: "This campaign has been removed from your dashboard.",
      });
      setShowDismissDialog(false);
      setApplicationToDismiss(null);
    },
    onError: (error: Error) => {
      setShowDismissDialog(false);
      setApplicationToDismiss(null);
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  const handleDismiss = (application: ApplicationWithDetails) => {
    setApplicationToDismiss(application);
    setShowDismissDialog(true);
  };

  const confirmDismiss = () => {
    if (!applicationToDismiss) return;
    dismissMutation.mutate(applicationToDismiss.id);
  };

  const markRejectionViewedMutation = useMutation({
    mutationFn: async (applicationIds: string[]) => {
      await apiRequest("POST", `/api/applications/mark-rejection-viewed`, { applicationIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
    },
  });

  const clearTierUpgradeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/me/clear-tier-upgrade", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/applications/${applicationId}/confirm-delivery`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      toast({
        title: "Delivery confirmed!",
        description: "Thank you for confirming. Now it's time to create amazing content!",
      });
      setShowDeliveryConfirmDialog(false);
      setApplicationToConfirmDelivery(null);
    },
    onError: (error: Error) => {
      setShowDeliveryConfirmDialog(false);
      setApplicationToConfirmDelivery(null);
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  // Legacy: Purchase proof (no longer used for new campaigns)
  const [purchaseProofForms, setPurchaseProofForms] = useState<Record<string, { screenshotUrl: string; amazonOrderId: string }>>({});
  
  const submitPurchaseProofMutation = useMutation({
    mutationFn: async ({ applicationId, screenshotUrl, amazonOrderId }: { applicationId: string; screenshotUrl: string; amazonOrderId?: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/submit-purchase`, { screenshotUrl, amazonOrderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Purchase proof submitted",
        description: "We'll verify your purchase and send the reimbursement soon.",
      });
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  // Link in Bio: Submit bio link
  const [bioLinkForms, setBioLinkForms] = useState<Record<string, string>>({});
  
  const submitBioLinkMutation = useMutation({
    mutationFn: async ({ applicationId, bioLinkUrl }: { applicationId: string; bioLinkUrl: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/submit-bio-link`, { bioLinkUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Bio link submitted",
        description: "We'll verify your bio link shortly.",
      });
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  // Amazon Video Upload: Combined submission (storefront + video together)
  const [amazonCombinedForms, setAmazonCombinedForms] = useState<Record<string, { storefrontUrl: string; videoUrl: string }>>({});
  
  const submitAmazonCombinedMutation = useMutation({
    mutationFn: async ({ applicationId, amazonStorefrontUrl, videoUrl }: { applicationId: string; amazonStorefrontUrl: string; videoUrl: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/submit-amazon-combined`, { amazonStorefrontUrl, videoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Submission completed",
        description: "We'll verify your Amazon Storefront and TikTok video shortly.",
      });
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  // Link in Bio: Combined submission (bio link + video together)
  const [bioCombinedForms, setBioCombinedForms] = useState<Record<string, { bioLinkUrl: string; videoUrl: string }>>({});
  
  const submitBioCombinedMutation = useMutation({
    mutationFn: async ({ applicationId, bioLinkUrl, videoUrl }: { applicationId: string; bioLinkUrl: string; videoUrl: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/submit-bio-combined`, { bioLinkUrl, videoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Submission completed",
        description: "We'll verify your bio link and TikTok video shortly.",
      });
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  // Link in Bio: Submit video URL (after bio link verified)
  const [videoUrlForms, setVideoUrlForms] = useState<Record<string, string>>({});
  
  const submitVideoMutation = useMutation({
    mutationFn: async ({ applicationId, videoUrl }: { applicationId: string; videoUrl: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/submit-video`, { videoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      toast({
        title: "Video submitted",
        description: "We'll verify your video shortly.",
      });
    },
    onError: (error: Error) => {
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  useEffect(() => {
    if (applications) {
      const unviewedRejections = applications.filter(
        (app) => app.status === "rejected" && !app.rejectionViewedAt && !app.dismissedAt
      );
      if (unviewedRejections.length > 0) {
        markRejectionViewedMutation.mutate(unviewedRejections.map((app) => app.id));
      }
    }
  }, [applications]);

  // Pre-fill bio link and Amazon storefront forms with profile URLs or existing application data
  useEffect(() => {
    if (applications && influencer) {
      const newBioLinkForms: Record<string, string> = {};
      const newAmazonCombinedForms: Record<string, { storefrontUrl: string; videoUrl: string }> = {};
      const newBioCombinedForms: Record<string, { bioLinkUrl: string; videoUrl: string }> = {};
      
      applications.forEach((app) => {
        // Pre-fill bio link from profile if empty (legacy single-field form)
        if (app.status === "delivered" && !(app as any).bioLinkUrl && influencer.bioLinkProfileUrl) {
          if (!bioLinkForms[app.id]) {
            newBioLinkForms[app.id] = influencer.bioLinkProfileUrl;
          }
        }
        
        // Pre-fill Bio combined form
        // Case 1: New submission - pre-fill bio link URL from profile
        // Case 2: Legacy flow - bio link already submitted, pre-fill it so user can submit video
        if (["delivered", "uploaded"].includes(app.status) && !app.contentUrl) {
          if (!bioCombinedForms[app.id]) {
            const existingBioLink = (app as any).bioLinkUrl;
            const profileBioLink = influencer.bioLinkProfileUrl;
            
            if (existingBioLink || profileBioLink) {
              newBioCombinedForms[app.id] = { 
                bioLinkUrl: existingBioLink || profileBioLink || "", 
                videoUrl: "" 
              };
            }
          }
        }
        
        // Pre-fill Amazon combined form
        // Case 1: New submission - pre-fill storefront URL from profile
        // Case 2: Legacy flow - storefront already submitted, pre-fill it so user can submit video
        if (["delivered", "uploaded"].includes(app.status) && !app.contentUrl) {
          if (!amazonCombinedForms[app.id]) {
            const existingStorefront = (app as any).amazonStorefrontUrl;
            const profileStorefront = influencer.amazonStorefrontUrl;
            
            if (existingStorefront || profileStorefront) {
              newAmazonCombinedForms[app.id] = { 
                storefrontUrl: existingStorefront || profileStorefront || "", 
                videoUrl: "" 
              };
            }
          }
        }
      });
      
      if (Object.keys(newBioLinkForms).length > 0) {
        setBioLinkForms(prev => ({ ...prev, ...newBioLinkForms }));
      }
      if (Object.keys(newAmazonCombinedForms).length > 0) {
        setAmazonCombinedForms(prev => ({ ...prev, ...newAmazonCombinedForms }));
      }
      if (Object.keys(newBioCombinedForms).length > 0) {
        setBioCombinedForms(prev => ({ ...prev, ...newBioCombinedForms }));
      }
    }
  }, [applications, influencer]);

  // Check for pending tier upgrade and show celebration popup
  useEffect(() => {
    if (influencer?.pendingTierUpgrade) {
      setPendingTierUpgrade(influencer.pendingTierUpgrade);
      setShowTierUpgradeDialog(true);
    }
  }, [influencer?.pendingTierUpgrade]);

  const handleTierUpgradeAcknowledged = () => {
    setShowTierUpgradeDialog(false);
    clearTierUpgradeMutation.mutate();
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Redirect admin users to admin dashboard
  if (isAdmin) {
    return <Redirect to="/admin" />;
  }

  const visibleApplications = applications?.filter((app) => {
    if (app.dismissedAt) return false;
    if (app.status === "rejected") {
      if (app.rejectionViewedAt) {
        const viewedTime = new Date(app.rejectionViewedAt).getTime();
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (now - viewedTime > twentyFourHours) return false;
      }
    }
    return true;
  });

  const sortedApplications = visibleApplications?.sort((a, b) => {
    const statusOrder: Record<string, number> = {
      delivered: 1,
      shipped: 2,
      approved: 3,
      pending: 4,
      uploaded: 5,
      completed: 6,
      rejected: 7,
      deadline_missed: 8,
    };
    const orderA = statusOrder[a.status] || 99;
    const orderB = statusOrder[b.status] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.appliedAt!).getTime() - new Date(a.appliedAt!).getTime();
  });

  const getStatusCounts = () => {
    if (!visibleApplications) return {};
    return visibleApplications.reduce((acc, app) => {
      if (app.status === "rejected") {
        acc["pending"] = (acc["pending"] || 0) + 1;
        return acc;
      }
      const status = app.status === "completed" ? "uploaded" : app.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const statusCounts = getStatusCounts();

  const handleCancelApplication = (application: ApplicationWithDetails) => {
    setApplicationToCancel(application);
    setShowCancelDialog(true);
  };

  const confirmCancelApplication = () => {
    if (!applicationToCancel) return;
    cancelMutation.mutate(applicationToCancel.id);
  };

  const handleReportIssue = (application: ApplicationWithDetails) => {
    setSelectedApplication(application);
    setShowIssueDialog(true);
  };

  const submitIssueReport = () => {
    if (!selectedApplication || !issueMessage.trim()) return;
    reportIssueMutation.mutate({
      applicationId: selectedApplication.id,
      message: issueMessage,
    });
  };

  const renderProgressBar = (application: ApplicationWithDetails) => {
    const status = application.status;
    const campaign = application.campaign;
    const isLinkInBio = campaign.campaignType === "link_in_bio";
    const isAmazonVideoUpload = campaign.campaignType === "amazon_video_upload";
    const steps = (isLinkInBio || isAmazonVideoUpload) ? linkInBioProgressSteps : progressSteps;
    
    if (status === "rejected" || status === "deadline_missed") return null;

    // Calculate current step for Link in Bio and Amazon Video Upload campaigns
    let currentStep = statusConfig[status]?.step || 0;
    
    if (isLinkInBio) {
      // For Link in Bio: 1=Applied, 2=Approved, 3=Shipped, 4=Delivered, 5=Bio Link, 6=Video
      if (status === "pending") currentStep = 1;
      else if (status === "approved") currentStep = 2;
      else if (status === "shipped") currentStep = 3;
      else if (status === "delivered") {
        // Check progression: bio link → video
        if (application.contentUrl) {
          currentStep = 6; // Video uploaded (waiting for admin verification)
        } else if ((application as any).bioLinkVerifiedAt) {
          currentStep = 5; // Bio Link verified, ready for video upload
        } else if ((application as any).bioLinkUrl) {
          currentStep = 4.5; // Bio Link submitted but not verified
        } else {
          currentStep = 4; // Delivered, waiting for bio link
        }
      } else if (status === "uploaded" || status === "completed") {
        currentStep = 6; // Video verified/completed
      }
    } else if (isAmazonVideoUpload) {
      // For Amazon Video Upload: 1=Applied, 2=Approved, 3=Shipped, 4=Delivered, 5=Storefront, 6=Video
      if (status === "pending") currentStep = 1;
      else if (status === "approved") currentStep = 2;
      else if (status === "shipped") currentStep = 3;
      else if (status === "delivered") {
        // Check progression: amazon storefront → video
        if (application.contentUrl) {
          currentStep = 6; // Video uploaded (waiting for admin verification)
        } else if ((application as any).amazonStorefrontVerifiedAt) {
          currentStep = 5; // Amazon Storefront verified, ready for video upload
        } else if ((application as any).amazonStorefrontUrl) {
          currentStep = 4.5; // Amazon Storefront submitted but not verified
        } else {
          currentStep = 4; // Delivered, waiting for storefront link
        }
      } else if (status === "uploaded" || status === "completed") {
        currentStep = 6; // Video verified/completed
      }
    }

    return (
      <div className="flex items-center gap-1 w-full mt-4">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isComplete = stepNum <= currentStep;
          const isCurrent = stepNum === Math.ceil(currentStep);
          return (
            <div key={step.label} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                <div
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    isComplete ? "bg-primary" : "bg-muted"
                  )}
                />
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <step.icon
                  className={cn(
                    "h-3 w-3",
                    isComplete ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] hidden sm:inline",
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

  const renderApplicationDetails = (application: ApplicationWithDetails) => {
    const campaign = application.campaign;
    const status = statusConfig[application.status] || statusConfig.pending;
    const deadline = new Date(campaign.deadline);
    const isDeadlineSoon =
      application.status === "delivered" &&
      deadline.getTime() - Date.now() < 48 * 60 * 60 * 1000;
    const issues = issuesByApplicationId[application.id];

    return (
      <div className="space-y-4 pt-4">
        {renderProgressBar(application)}

        <div className={cn("rounded-lg p-4 mt-4", status.bgColor)}>
          <p className={cn("text-sm", status.textColor)}>
            {application.status === "uploaded" && application.pointsAwarded && application.pointsAwarded > 0
              ? `We've confirmed your video upload and you've earned +${application.pointsAwarded} points! Thank you so much for participating. We'll be sharing your content with the brand. Please keep your video live for at least 6 weeks and avoid changing your TikTok handle during this period.`
              : status.description}
          </p>
        </div>

        {isDeadlineSoon && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              Upload deadline: {format(deadline, "MMM d, h:mm a")} PST
            </span>
          </div>
        )}

        {/* Link in Bio: Combined Submission (Bio Link + Video together) */}
        {campaign.campaignType === "link_in_bio" && ["delivered", "uploaded", "completed"].includes(application.status) && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-emerald-600">Submission</span>
            </div>
            
            {/* Already submitted both - show both links */}
            {(application as any).bioLinkUrl && application.contentUrl ? (
              <div className="space-y-4">
                {/* Bio link status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Bio Link</span>
                    {(application as any).bioLinkVerifiedAt ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                    )}
                  </div>
                  <a 
                    href={(application as any).bioLinkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {(application as any).bioLinkUrl}
                  </a>
                </div>
                
                {/* Video status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">TikTok Video</span>
                    {(application as any).contentVerifiedAt ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                    )}
                  </div>
                  <a 
                    href={application.contentUrl.startsWith('http') ? application.contentUrl : `https://${application.contentUrl}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Your Video
                  </a>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Our team will verify both your bio link and TikTok video.
                </p>
              </div>
            ) : ["delivered", "uploaded"].includes(application.status) ? (
              /* Submission form - both fields required */
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Bio Link Requirements:
                  </p>
                  <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                    <li>Use a bio link service (such as Linktree, Beacons, etc.)</li>
                    <li>Add the product purchase link from campaign guidelines inside your bio link page</li>
                    <li>Your bio link must be visible in your TikTok profile bio to be verified</li>
                  </ul>
                </div>
                {influencer?.bioLinkProfileUrl && !bioCombinedForms[application.id]?.bioLinkUrl && (
                  <p className="text-xs text-emerald-600">
                    We've pre-filled your bio link URL from your profile.
                  </p>
                )}
                
                {/* Bio Link URL - show as read-only if already submitted */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Bio Link URL
                    {(application as any).bioLinkUrl && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">Submitted</Badge>
                    )}
                  </label>
                  {(application as any).bioLinkUrl ? (
                    <div className="text-sm p-2 bg-muted rounded-md">
                      <a 
                        href={(application as any).bioLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {(application as any).bioLinkUrl}
                      </a>
                    </div>
                  ) : (
                    <Input
                      placeholder="Your bio link URL (e.g., linktr.ee/yourhandle)"
                      value={bioCombinedForms[application.id]?.bioLinkUrl || ""}
                      onChange={(e) => setBioCombinedForms(prev => ({
                        ...prev,
                        [application.id]: { 
                          bioLinkUrl: e.target.value, 
                          videoUrl: prev[application.id]?.videoUrl || "" 
                        }
                      }))}
                      className="text-sm"
                      data-testid={`input-bio-link-${application.id}`}
                    />
                  )}
                </div>
                
                {/* TikTok Video URL */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    TikTok Video URL
                  </label>
                  <Input
                    placeholder="https://www.tiktok.com/@yourhandle/video/..."
                    value={bioCombinedForms[application.id]?.videoUrl || ""}
                    onChange={(e) => setBioCombinedForms(prev => ({
                      ...prev,
                      [application.id]: { 
                        bioLinkUrl: prev[application.id]?.bioLinkUrl || (application as any).bioLinkUrl || "", 
                        videoUrl: e.target.value 
                      }
                    }))}
                    className="text-sm"
                    data-testid={`input-bio-video-url-${application.id}`}
                  />
                </div>
                
                <Button
                  size="sm"
                  onClick={() => {
                    const form = bioCombinedForms[application.id];
                    // Always include existing bioLinkUrl from application if available (for legacy cases)
                    const bioLinkUrl = (application as any).bioLinkUrl || form?.bioLinkUrl;
                    const videoUrl = form?.videoUrl;
                    if (videoUrl) {
                      submitBioCombinedMutation.mutate({
                        applicationId: application.id,
                        bioLinkUrl: bioLinkUrl || "",
                        videoUrl: videoUrl
                      });
                    }
                  }}
                  disabled={
                    (!(application as any).bioLinkUrl && !bioCombinedForms[application.id]?.bioLinkUrl) || 
                    !bioCombinedForms[application.id]?.videoUrl || 
                    submitBioCombinedMutation.isPending
                  }
                  className="w-full"
                  data-testid={`button-submit-bio-combined-${application.id}`}
                >
                  {submitBioCombinedMutation.isPending ? "Submitting..." : 
                   (application as any).bioLinkUrl ? "Submit Video" : "Submit Both Links"}
                </Button>
                
                {!(application as any).bioLinkUrl && (
                  <p className="text-xs text-muted-foreground text-center">
                    Both fields are required to submit
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>Submission available after product delivery</span>
              </div>
            )}
          </div>
        )}

        {/* Link in Bio: Cash Reward Status */}
        {campaign.campaignType === "link_in_bio" && application.status === "completed" && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600">Cash Reward: $30</span>
            </div>
            {application.cashRewardSentAt ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Reward sent to your PayPal</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>Reward pending - we'll send it to your PayPal soon</span>
              </div>
            )}
          </div>
        )}

        {/* Amazon Video Upload: Combined Submission (Storefront + Video together) */}
        {campaign.campaignType === "amazon_video_upload" && ["delivered", "uploaded", "completed"].includes(application.status) && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-600">Submission</span>
            </div>
            
            {/* Already submitted both - show both links */}
            {(application as any).amazonStorefrontUrl && application.contentUrl ? (
              <div className="space-y-4">
                {/* Storefront status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Amazon Storefront</span>
                    {(application as any).amazonStorefrontVerifiedAt ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                    )}
                  </div>
                  <a 
                    href={(application as any).amazonStorefrontUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {(application as any).amazonStorefrontUrl}
                  </a>
                </div>
                
                {/* Video status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">TikTok Video</span>
                    {(application as any).contentVerifiedAt ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                    )}
                  </div>
                  <a 
                    href={application.contentUrl.startsWith('http') ? application.contentUrl : `https://${application.contentUrl}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Your Video
                  </a>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Our team will verify both your Amazon Storefront video and TikTok video.
                </p>
              </div>
            ) : ["delivered", "uploaded"].includes(application.status) ? (
              /* Submission form - both fields required */
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Amazon Storefront Requirements:
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                    <li>You must have an active Amazon Influencer Storefront</li>
                    <li>Upload the product video to your Amazon Storefront following the campaign guidelines</li>
                    <li>Submit your Storefront URL where the product video is visible</li>
                  </ul>
                </div>
                {influencer?.amazonStorefrontUrl && !amazonCombinedForms[application.id]?.storefrontUrl && (
                  <p className="text-xs text-amber-600">
                    We've pre-filled your storefront URL from your profile.
                  </p>
                )}
                
                {/* Amazon Storefront URL - show as read-only if already submitted */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Amazon Storefront URL
                    {(application as any).amazonStorefrontUrl && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">Submitted</Badge>
                    )}
                  </label>
                  {(application as any).amazonStorefrontUrl ? (
                    <div className="text-sm p-2 bg-muted rounded-md">
                      <a 
                        href={(application as any).amazonStorefrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {(application as any).amazonStorefrontUrl}
                      </a>
                    </div>
                  ) : (
                    <Input
                      placeholder="https://www.amazon.com/shop/yourname"
                      value={amazonCombinedForms[application.id]?.storefrontUrl || ""}
                      onChange={(e) => setAmazonCombinedForms(prev => ({
                        ...prev,
                        [application.id]: { 
                          storefrontUrl: e.target.value, 
                          videoUrl: prev[application.id]?.videoUrl || "" 
                        }
                      }))}
                      className="text-sm"
                      data-testid={`input-amazon-storefront-${application.id}`}
                    />
                  )}
                </div>
                
                {/* TikTok Video URL */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    TikTok Video URL
                  </label>
                  <Input
                    placeholder="https://www.tiktok.com/@yourhandle/video/..."
                    value={amazonCombinedForms[application.id]?.videoUrl || ""}
                    onChange={(e) => setAmazonCombinedForms(prev => ({
                      ...prev,
                      [application.id]: { 
                        storefrontUrl: prev[application.id]?.storefrontUrl || (application as any).amazonStorefrontUrl || "", 
                        videoUrl: e.target.value 
                      }
                    }))}
                    className="text-sm"
                    data-testid={`input-amazon-video-url-${application.id}`}
                  />
                </div>
                
                <Button
                  size="sm"
                  onClick={() => {
                    const form = amazonCombinedForms[application.id];
                    const storefrontUrl = form?.storefrontUrl || (application as any).amazonStorefrontUrl;
                    const videoUrl = form?.videoUrl;
                    if (storefrontUrl && videoUrl) {
                      submitAmazonCombinedMutation.mutate({
                        applicationId: application.id,
                        amazonStorefrontUrl: storefrontUrl,
                        videoUrl: videoUrl
                      });
                    }
                  }}
                  disabled={
                    (!(application as any).amazonStorefrontUrl && !amazonCombinedForms[application.id]?.storefrontUrl) || 
                    !amazonCombinedForms[application.id]?.videoUrl || 
                    submitAmazonCombinedMutation.isPending
                  }
                  className="w-full"
                  data-testid={`button-submit-amazon-combined-${application.id}`}
                >
                  {submitAmazonCombinedMutation.isPending ? "Submitting..." : 
                   (application as any).amazonStorefrontUrl ? "Submit Video" : "Submit Both Links"}
                </Button>
                
                {!(application as any).amazonStorefrontUrl && (
                  <p className="text-xs text-muted-foreground text-center">
                    Both fields are required to submit
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>Submission available after product delivery</span>
              </div>
            )}
          </div>
        )}

        {/* Amazon Video Campaign: Cash Reward Status */}
        {campaign.campaignType === "amazon_video_upload" && application.status === "completed" && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600">Cash Reward: $30</span>
            </div>
            {application.cashRewardSentAt ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Reward sent to your PayPal</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>Reward pending - we'll send it to your PayPal soon</span>
              </div>
            )}
          </div>
        )}

        {application.shipping && (application.status === "shipped" || application.status === "delivered") && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-600">Shipping Information</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {application.shipping.courier && (
                <span className="text-muted-foreground">
                  Courier: <Badge variant="outline" className="ml-1">{application.shipping.courier}</Badge>
                </span>
              )}
              {application.shipping.trackingNumber && (
                <span className="text-muted-foreground">
                  Tracking #: <span className="font-medium text-foreground">{application.shipping.trackingNumber}</span>
                </span>
              )}
            </div>
            {application.shipping.trackingUrl && (
              <a
                href={application.shipping.trackingUrl.startsWith('http') 
                  ? application.shipping.trackingUrl 
                  : `https://${application.shipping.trackingUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                data-testid={`link-tracking-${application.id}`}
              >
                <ExternalLink className="h-3 w-3" />
                Track Your Package
              </a>
            )}
            
            {/* Confirm Delivery Button - Only shown when status is shipped */}
            {application.status === "shipped" && (
              <div className="border-t border-blue-500/20 pt-3 mt-3 space-y-3">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                      <p className="font-medium">Please click "Confirm Delivery" only after you have received your package.</p>
                      <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                        <li>We monitor all tracking numbers and can verify delivery status with the courier.</li>
                        <li>If the courier shows "delivered" but you haven't confirmed, our admin may mark it as delivered.</li>
                        <li>If the courier shows "delivered" but you haven't received the package, please leave a comment or contact support.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setApplicationToConfirmDelivery(application);
                    setShowDeliveryConfirmDialog(true);
                  }}
                  className="w-full"
                  variant="outline"
                  data-testid={`button-confirm-delivery-${application.id}`}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Confirm Delivery
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Gifting Campaign - Video Submission */}
        {application.campaign.campaignType === "gifting" && 
         application.status === "delivered" && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-600">Submission</span>
            </div>
            
            {/* Already submitted - show status */}
            {application.contentUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">TikTok Video</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                </div>
                <a 
                  href={application.contentUrl.startsWith('http') ? application.contentUrl : `https://${application.contentUrl}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {application.contentUrl}
                </a>
              </div>
            ) : (
              /* Not submitted - show form */
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">TikTok Video URL</label>
                  <Input
                    type="url"
                    placeholder="https://www.tiktok.com/@yourname/video/..."
                    value={videoUrlForms[application.id] || ""}
                    onChange={(e) => setVideoUrlForms(prev => ({ ...prev, [application.id]: e.target.value }))}
                    className="w-full"
                    data-testid={`input-video-gifting-${application.id}`}
                  />
                </div>
                <Button
                  onClick={() => {
                    const videoUrl = videoUrlForms[application.id];
                    if (videoUrl) {
                      submitVideoMutation.mutate({
                        applicationId: application.id,
                        videoUrl: videoUrl
                      });
                    }
                  }}
                  disabled={!videoUrlForms[application.id] || submitVideoMutation.isPending}
                  className="w-full"
                  data-testid={`button-submit-video-gifting-${application.id}`}
                >
                  {submitVideoMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Once submitted, our team will review and verify your video.
                </p>
              </div>
            )}
          </div>
        )}

        {application.status === "uploaded" && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-600">Your Uploaded Video</span>
              </div>
              {application.pointsAwarded && application.pointsAwarded > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full text-sm font-medium">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  +{application.pointsAwarded} points earned!
                </div>
              )}
            </div>
            {application.contentUrl && (
              <a
                href={application.contentUrl.startsWith('http') 
                  ? application.contentUrl 
                  : `https://${application.contentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                data-testid={`link-video-${application.id}`}
              >
                <ExternalLink className="h-3 w-3" />
                View Your TikTok Video
              </a>
            )}
          </div>
        )}

        {issues && issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div 
                key={issue.id} 
                className={cn(
                  "rounded-lg p-3 space-y-2",
                  issue.status === "open" 
                    ? "bg-amber-500/5 border border-amber-500/20" 
                    : issue.status === "resolved"
                    ? "bg-green-500/5 border border-green-500/20"
                    : "bg-gray-500/5 border border-gray-500/20"
                )}
                data-testid={`issue-${issue.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={cn(
                      "h-4 w-4",
                      issue.status === "open" ? "text-amber-600" : 
                      issue.status === "resolved" ? "text-green-600" : "text-gray-500"
                    )} />
                    <span className={cn(
                      "font-medium text-sm",
                      issue.status === "open" ? "text-amber-600" : 
                      issue.status === "resolved" ? "text-green-600" : "text-gray-500"
                    )}>
                      Your Comment
                    </span>
                  </div>
                  <Badge 
                    variant={issue.status === "open" ? "outline" : "secondary"}
                    className={cn(
                      "text-xs",
                      issue.status === "resolved" && "bg-green-500/10 text-green-600 border-green-500/20"
                    )}
                  >
                    {issue.status === "open" ? "Pending" : 
                     issue.status === "resolved" ? "Resolved" : "Dismissed"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {issue.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Reported: {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, yyyy") : "Unknown"}
                </p>
                
                {issue.adminResponse && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-2 mt-2">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Collaboom Team</span>
                    </div>
                    <p className="text-sm" data-testid={`issue-response-${issue.id}`}>
                      {issue.adminResponse}
                    </p>
                    {issue.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Responded: {format(new Date(issue.resolvedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
          <span>Applied: {format(new Date(application.appliedAt!), "MMM d, yyyy")}</span>
          {application.approvedAt && (
            <span>
              Approved: {format(new Date(application.approvedAt), "MMM d, yyyy")}
            </span>
          )}
          <span className="text-red-500 font-medium">Deadline: {format(deadline, "MMM d, yyyy")} PST</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link href={`/campaigns/${campaign.id}`}>
            <Button
              variant="outline"
              size="sm"
              data-testid={`button-view-campaign-${application.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Campaign
            </Button>
          </Link>

          {application.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelApplication(application)}
              data-testid={`button-cancel-${application.id}`}
            >
              Cancel Application
            </Button>
          )}

          {["pending", "approved", "shipped", "delivered"].includes(application.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReportIssue(application)}
              data-testid={`button-comment-${application.id}`}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Comment
            </Button>
          )}

          {(application.status === "rejected" || application.status === "uploaded" || application.status === "completed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDismiss(application)}
              data-testid={`button-dismiss-${application.id}`}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {influencer?.restricted && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-600">Account Restricted</p>
              <p className="text-sm text-muted-foreground">
                Your account is temporarily restricted from applying to new campaigns. 
                Please contact support at support@collaboom.com for assistance.
              </p>
            </div>
          </div>
        )}

        {!influencer?.profileCompleted && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-600">Complete Your Profile</p>
              <p className="text-sm text-muted-foreground">
                Complete your profile to start applying for campaigns.
              </p>
            </div>
            <Link href="/profile">
              <Button size="sm">Complete Profile</Button>
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Track your campaign applications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSupportSheet(true)}
              data-testid="button-support"
            >
              <Headphones className="h-4 w-4 mr-2" />
              Support
            </Button>
            <Link href="/campaigns">
              <Button data-testid="button-browse">Browse Campaigns</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setShowScoreSheet(true)}
            data-testid="card-score"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{influencer?.score ?? 0}</p>
                <p className="text-xs text-muted-foreground">Your Score</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          {(() => {
            const tierInfo = getTierInfo(influencer?.score ?? 0, influencer?.completedCampaigns ?? 0);
            const TierIcon = tierInfo.icon;
            return (
              <Link href="/score-tier">
                <Card 
                  className="cursor-pointer hover-elevate transition-all h-full"
                  data-testid="card-tier"
                >
                  <CardContent className="p-4 flex items-center gap-3 h-full">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", tierInfo.bgColor)}>
                      <TierIcon className={cn("h-5 w-5", tierInfo.color)} />
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-lg font-bold", tierInfo.color)}>{tierInfo.name}</p>
                      <p className="text-xs text-muted-foreground">Your Tier</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })()}
          <Card 
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setShowCompletedSheet(true)}
            data-testid="card-completed"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {allApplications?.filter(a => a.status === "uploaded" || a.status === "completed").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setShowMissedSheet(true)}
            data-testid="card-missed"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {allApplications?.filter(a => a.status === "deadline_missed").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Missed</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setShowCashSheet(true)}
            data-testid="card-cash"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  ${allApplications?.filter(a => 
                    (a.status === "uploaded" || a.status === "completed") && 
                    (a.campaign.campaignType === "link_in_bio" || a.campaign.campaignType === "amazon_video_upload")
                  ).reduce((sum, a) => {
                    if (a.campaign.campaignType === "link_in_bio") return sum + 30;
                    if (a.campaign.campaignType === "amazon_video_upload") return sum + 50;
                    return sum;
                  }, 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Cash Earned</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Campaigns</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : sortedApplications && sortedApplications.length > 0 ? (
            <Accordion
              type="multiple"
              value={expandedItems}
              onValueChange={setExpandedItems}
              className="space-y-3"
            >
              {sortedApplications.map((application) => {
                const campaign = application.campaign;
                const status = statusConfig[application.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <AccordionItem
                    key={application.id}
                    value={application.id}
                    id={`application-${application.id}`}
                    className="border rounded-xl overflow-hidden bg-card"
                    data-testid={`card-application-${application.id}`}
                  >
                    <AccordionTrigger className="hover:no-underline p-0 [&>svg]:hidden">
                      <div className="flex items-center gap-4 w-full p-4">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          {getCampaignThumbnail(campaign) ? (
                            <img
                              src={getCampaignThumbnail(campaign)!}
                              alt={campaign.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                              <Package className="h-6 w-6 text-primary/40" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {campaign.brandName}
                          </p>
                          <h3 className="font-semibold text-base sm:text-lg leading-tight truncate">
                            {campaign.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={cn("flex-shrink-0", status.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            {application.pointsAwarded && application.pointsAwarded > 0 && (
                              <div className="flex items-center gap-1 text-amber-600 text-xs">
                                <Star className="h-3 w-3 fill-amber-500" />
                                +{application.pointsAwarded}
                              </div>
                            )}
                          </div>
                        </div>

                        <ChevronDown className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0",
                          expandedItems.includes(application.id) && "rotate-180"
                        )} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {renderApplicationDetails(application)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                  Start applying to campaigns to see them here. Browse our available campaigns to find the perfect match!
                </p>
                <Link href="/campaigns">
                  <Button>Browse Campaigns</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              How Collaboom Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tiers">
                <AccordionTrigger>What are the influencer tiers?</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Starting Influencer:</strong> New creators who are just getting started. Limited to 1 active campaign at a time.</li>
                    <li><strong>Standard Influencer:</strong> Creators who have completed at least 1 campaign and maintain 50+ points. Access to more campaigns!</li>
                    <li><strong>VIP Influencer:</strong> Trusted creators with 85+ points. Enjoy automatic campaign approvals and priority access to exclusive opportunities.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="uploads">
                <AccordionTrigger>How are uploads verified?</AccordionTrigger>
                <AccordionContent>
                  Our team manually reviews each upload to ensure it meets the campaign 
                  requirements. Make sure to include all required hashtags and mentions, 
                  and keep your content live for at least 6 weeks.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="score">
                <AccordionTrigger>How does my Score work?</AccordionTrigger>
                <AccordionContent>
                  Your Score reflects your reliability as a creator. You start with 50 points 
                  when you sign up, and earn more points by completing campaigns successfully. 
                  Points may be deducted if you miss deadlines. Higher scores unlock better 
                  tier benefits and exclusive campaigns.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="deadlines">
                <AccordionTrigger>Why do deadlines matter?</AccordionTrigger>
                <AccordionContent>
                  Brands have specific timelines for their campaigns. Missing deadlines 
                  affects your reliability score and may result in point deductions. 
                  We send reminders before each deadline, so keep an eye on your email!
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="rejections">
                <AccordionTrigger>What happens if my application is not selected?</AccordionTrigger>
                <AccordionContent>
                  Don't worry! Not being selected doesn't affect your score. Brands have 
                  limited inventory and specific requirements for each campaign. Rejected 
                  applications will automatically disappear from your dashboard after 24 hours, 
                  but you're always welcome to apply to other campaigns.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="comments">
                <AccordionTrigger>How do I ask questions or report issues?</AccordionTrigger>
                <AccordionContent>
                  Use the "Comment" button on any campaign to ask questions or report issues. 
                  Whether you're curious about shipping, have content questions, or received 
                  a damaged package - the Collaboom team will respond as soon as possible.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Comment</DialogTitle>
            <DialogDescription>
              Have a question or issue about this campaign? Let us know and the Collaboom team will respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., When will my package arrive? / I received a damaged product / Questions about the content requirements..."
            value={issueMessage}
            onChange={(e) => setIssueMessage(e.target.value)}
            rows={4}
            data-testid="textarea-comment"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitIssueReport}
              disabled={!issueMessage.trim() || reportIssueMutation.isPending}
              data-testid="button-submit-comment"
            >
              {reportIssueMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your application for{" "}
              <span className="font-medium">{applicationToCancel?.campaign.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Important:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>You can re-apply to this campaign after cancelling</li>
                  <li>Once approved, applications cannot be cancelled</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelDialog(false);
                setApplicationToCancel(null);
              }}
              data-testid="button-cancel-dialog-close"
            >
              Keep Application
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelApplication}
              disabled={cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to dismiss{" "}
              <span className="font-medium">{applicationToDismiss?.campaign.name}</span> from your dashboard?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Your records are safe!</p>
                <p className="text-muted-foreground mt-1">
                  All your campaign history, points, and achievements are permanently saved in Collaboom. Dismissing this campaign will only remove it from your dashboard view - nothing else will be affected.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDismissDialog(false);
                setApplicationToDismiss(null);
              }}
              data-testid="button-dismiss-dialog-close"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDismiss}
              disabled={dismissMutation.isPending}
              data-testid="button-confirm-dismiss"
            >
              {dismissMutation.isPending ? "Dismissing..." : "Dismiss"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Upgrade Celebration Dialog */}
      <Dialog open={showTierUpgradeDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md text-center" data-testid="dialog-tier-upgrade">
          <DialogHeader className="space-y-4">
            <div className="mx-auto">
              {pendingTierUpgrade === "vip" ? (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center animate-pulse">
                  <Crown className="h-10 w-10 text-white" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center animate-pulse">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold">
              {pendingTierUpgrade === "vip" 
                ? "Welcome to VIP!" 
                : "You're Now a Standard Influencer!"}
            </DialogTitle>
            <DialogDescription className="text-base space-y-3">
              {pendingTierUpgrade === "vip" ? (
                <>
                  <p className="text-lg font-medium text-foreground">
                    Congratulations! You've reached VIP status!
                  </p>
                  <p>
                    As a VIP influencer, you'll enjoy automatic approval for campaigns 
                    and get priority access to exclusive opportunities.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">VIP Benefits:</span><br />
                      Automatic campaign approvals, priority access to new campaigns, 
                      and higher chances for premium collaborations.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground">
                    Congratulations on completing your first campaign!
                  </p>
                  <p>
                    You've graduated from Starting Influencer to Standard Influencer. 
                    Keep up the great work to reach VIP status!
                  </p>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-4">
                    <p className="text-sm text-primary dark:text-primary/80">
                      <span className="font-semibold">Next Goal:</span> Reach 85 points to become a VIP 
                      and enjoy automatic campaign approvals!
                    </p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              onClick={handleTierUpgradeAcknowledged} 
              className="w-full"
              data-testid="button-tier-upgrade-close"
            >
              {pendingTierUpgrade === "vip" ? "Awesome!" : "Let's Go!"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score History Sheet */}
      <Sheet open={showScoreSheet} onOpenChange={setShowScoreSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Score History
            </SheetTitle>
            <SheetDescription>
              Your total score: <span className="font-bold text-foreground">{influencer?.score ?? 0} points</span>
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            {scoreEvents && scoreEvents.length > 0 ? (
              <div className="space-y-3">
                {scoreEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      event.delta > 0 ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                      <Star className={cn(
                        "h-4 w-4",
                        event.delta > 0 ? "text-green-500" : "text-red-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "font-medium text-sm",
                          event.delta > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {event.delta > 0 ? "+" : ""}{event.delta} points
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy") : ""}
                        </span>
                      </div>
                      {event.campaign && (
                        <p className="text-sm text-muted-foreground truncate">
                          {event.campaign.name}
                        </p>
                      )}
                      {/* Show displayReason if available, otherwise show human-readable reason (hide admin_manual) */}
                      {event.displayReason ? (
                        <p className="text-xs text-muted-foreground">
                          {event.displayReason}
                        </p>
                      ) : event.reason !== "admin_manual" && event.reason !== "admin_adjustment" ? (
                        <p className="text-xs text-muted-foreground capitalize">
                          {event.reason.replace(/_/g, " ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No score events yet</p>
                <p className="text-sm">Complete campaigns to earn points!</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Completed Campaigns Sheet */}
      <Sheet open={showCompletedSheet} onOpenChange={setShowCompletedSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-500" />
              Completed Campaigns
            </SheetTitle>
            <SheetDescription>
              You've completed {allApplications?.filter(a => a.status === "uploaded" || a.status === "completed").length || 0} campaigns
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            {(() => {
              const completed = allApplications?.filter(a => a.status === "uploaded" || a.status === "completed") || [];
              return completed.length > 0 ? (
                <div className="space-y-3">
                  {completed.map((app) => (
                    <div 
                      key={app.id} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {getCampaignThumbnail(app.campaign) ? (
                          <img 
                            src={getCampaignThumbnail(app.campaign)!} 
                            alt={app.campaign.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                            <Package className="h-5 w-5 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{app.campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign.brandName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {app.pointsAwarded && app.pointsAwarded > 0 && (
                            <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                              +{app.pointsAwarded} pts
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {app.uploadedAt ? format(new Date(app.uploadedAt), "MMM d, yyyy") : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No completed campaigns yet</p>
                  <p className="text-sm">Apply to campaigns and upload content to complete them!</p>
                </div>
              );
            })()}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Missed Campaigns Sheet */}
      <Sheet open={showMissedSheet} onOpenChange={setShowMissedSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Missed Deadlines
            </SheetTitle>
            <SheetDescription>
              {allApplications?.filter(a => a.status === "deadline_missed").length || 0} campaigns with missed deadlines
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            {(() => {
              const missed = allApplications?.filter(a => a.status === "deadline_missed") || [];
              return missed.length > 0 ? (
                <div className="space-y-3">
                  {missed.map((app) => (
                    <div 
                      key={app.id} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {getCampaignThumbnail(app.campaign) ? (
                          <img 
                            src={getCampaignThumbnail(app.campaign)!} 
                            alt={app.campaign.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                            <Package className="h-5 w-5 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{app.campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign.brandName}</p>
                        <p className="text-xs text-red-500 mt-1">
                          Deadline: {format(new Date(app.campaign.deadline), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>No missed deadlines!</p>
                  <p className="text-sm">Great job staying on track!</p>
                </div>
              );
            })()}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Cash Earned Sheet */}
      <Sheet open={showCashSheet} onOpenChange={setShowCashSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Cash Earned
            </SheetTitle>
            <SheetDescription>
              Manage your earnings and request payouts
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            {(() => {
              const paidCampaigns = allApplications?.filter(a => 
                (a.status === "uploaded" || a.status === "completed") && 
                (a.campaign.campaignType === "link_in_bio" || a.campaign.campaignType === "amazon_video_upload")
              ) || [];
              const totalEarned = paidCampaigns.reduce((sum, a) => {
                if (a.campaign.campaignType === "link_in_bio") return sum + 30;
                if (a.campaign.campaignType === "amazon_video_upload") return sum + 50;
                return sum;
              }, 0);
              const totalPayoutsRequested = payoutData?.totalPayoutsRequested || 0;
              const availableBalance = totalEarned - totalPayoutsRequested;
              const payoutRequests = payoutData?.requests || [];
              
              return (
                <div className="space-y-6">
                  {/* Balance Summary */}
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Earned</p>
                        <p className="text-xl font-bold text-foreground">${totalEarned}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available Balance</p>
                        <p className="text-xl font-bold text-emerald-600">${availableBalance}</p>
                      </div>
                    </div>
                    {availableBalance > 0 && (
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => setShowPayoutConfirmDialog(true)}
                        disabled={!influencer?.paypalEmail}
                        data-testid="button-request-payout"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Request Payout (${availableBalance})
                      </Button>
                    )}
                    {availableBalance > 0 && !influencer?.paypalEmail && (
                      <p className="text-xs text-amber-600 mt-2 text-center">
                        Please add your PayPal email in your profile to request payouts.
                      </p>
                    )}
                  </div>

                  {/* Payout History */}
                  {payoutRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Payout History</h4>
                      {payoutRequests.map((request) => (
                        <div 
                          key={request.id} 
                          className="p-3 rounded-lg bg-muted/50 border space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">${request.amount}</p>
                              <p className="text-xs text-muted-foreground">
                                Requested: {request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : ""}
                              </p>
                              {request.status === "completed" && request.processedAt && (
                                <p className="text-xs text-emerald-600">
                                  Paid: {format(new Date(request.processedAt), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                request.status === "pending" && "bg-yellow-500/10 text-yellow-600",
                                request.status === "processing" && "bg-blue-500/10 text-blue-600",
                                request.status === "completed" && "bg-emerald-500/10 text-emerald-600",
                                request.status === "rejected" && "bg-red-500/10 text-red-600",
                              )}
                            >
                              {request.status === "pending" ? "Pending" : 
                               request.status === "processing" ? "Processing" : 
                               request.status === "completed" ? "Completed" : "Rejected"}
                            </Badge>
                          </div>
                          {request.status === "completed" && (
                            <p className="text-xs text-emerald-600 font-medium">
                              Check your PayPal account
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campaign Earnings */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Campaign Earnings</h4>
                    {paidCampaigns.length > 0 ? (
                      <div className="space-y-3">
                        {paidCampaigns.map((app) => (
                          <div 
                            key={app.id} 
                            className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {getCampaignThumbnail(app.campaign) ? (
                                <img 
                                  src={getCampaignThumbnail(app.campaign)!} 
                                  alt={app.campaign.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                                  <Package className="h-5 w-5 text-primary/40" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{app.campaign.name}</p>
                              <p className="text-xs text-muted-foreground">{app.campaign.brandName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                                  ${app.campaign.campaignType === "link_in_bio" ? 30 : app.campaign.campaignType === "amazon_video_upload" ? 50 : 0}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {app.uploadedAt ? format(new Date(app.uploadedAt), "MMM d, yyyy") : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No paid campaigns completed yet</p>
                        <p className="text-sm">Look for "Gift + Paid" campaigns to earn cash!</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Payout Request Confirmation Dialog */}
      <AlertDialog open={showPayoutConfirmDialog} onOpenChange={setShowPayoutConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Payout</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const paidCampaigns = allApplications?.filter(a => 
                  (a.status === "uploaded" || a.status === "completed") && 
                  (a.campaign.campaignType === "link_in_bio" || a.campaign.campaignType === "amazon_video_upload")
                ) || [];
                const totalEarned = paidCampaigns.reduce((sum, a) => {
                  if (a.campaign.campaignType === "link_in_bio") return sum + 30;
                  if (a.campaign.campaignType === "amazon_video_upload") return sum + 50;
                  return sum;
                }, 0);
                const totalPayoutsRequested = payoutData?.totalPayoutsRequested || 0;
                const availableBalance = totalEarned - totalPayoutsRequested;
                
                return (
                  <>
                    <p className="mb-4">
                      You are requesting a payout of <span className="font-bold text-foreground">${availableBalance}</span> to your PayPal account:
                    </p>
                    <p className="font-medium text-foreground mb-4">{influencer?.paypalEmail}</p>
                    <p className="text-sm">
                      Once submitted, your request will be reviewed and processed by our team. You'll receive a notification when the payout is complete.
                    </p>
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPayoutConfirmDialog(false)}
              disabled={requestPayoutMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const paidCampaigns = allApplications?.filter(a => 
                  (a.status === "uploaded" || a.status === "completed") && 
                  (a.campaign.campaignType === "link_in_bio" || a.campaign.campaignType === "amazon_video_upload")
                ) || [];
                const totalEarned = paidCampaigns.reduce((sum, a) => {
                  if (a.campaign.campaignType === "link_in_bio") return sum + 30;
                  if (a.campaign.campaignType === "amazon_video_upload") return sum + 50;
                  return sum;
                }, 0);
                const totalPayoutsRequested = payoutData?.totalPayoutsRequested || 0;
                const availableBalance = totalEarned - totalPayoutsRequested;
                requestPayoutMutation.mutate(availableBalance);
              }}
              disabled={requestPayoutMutation.isPending}
              data-testid="button-confirm-payout"
            >
              {requestPayoutMutation.isPending ? "Submitting..." : "Confirm Request"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery Confirmation Dialog */}
      <AlertDialog open={showDeliveryConfirmDialog} onOpenChange={setShowDeliveryConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Confirm Package Delivery
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you confirming that you have <span className="font-semibold text-foreground">physically received</span> the package for{" "}
                <span className="font-medium text-foreground">{applicationToConfirmDelivery?.campaign.name}</span>?
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Important</p>
                    <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">
                      Only confirm if you have the package in your hands. We track all shipments and false confirmations may affect your account.
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeliveryConfirmDialog(false);
                setApplicationToConfirmDelivery(null);
              }}
              disabled={confirmDeliveryMutation.isPending}
              data-testid="button-delivery-confirm-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (applicationToConfirmDelivery) {
                  confirmDeliveryMutation.mutate(applicationToConfirmDelivery.id);
                }
              }}
              disabled={confirmDeliveryMutation.isPending}
              data-testid="button-delivery-confirm-yes"
            >
              {confirmDeliveryMutation.isPending ? "Confirming..." : "Yes, I received it"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Support Sheet */}
      <Sheet open={showSupportSheet} onOpenChange={setShowSupportSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              Support
            </SheetTitle>
            <SheetDescription>
              Have a question? We're here to help!
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            <div className="space-y-6">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Campaign-Specific Questions</p>
                    <p className="text-xs mt-1 opacity-80">
                      For questions about a specific campaign (shipping, content, deadlines), please use the "Comment" button on that campaign card instead.
                    </p>
                  </div>
                </div>
              </div>

              {(() => {
                const hasUnansweredTicket = mySupportTickets?.some(
                  ticket => ticket.status === "open" && !ticket.adminResponse
                );
                
                if (hasUnansweredTicket) {
                  return (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Submit a new ticket</h4>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Waiting for response</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You have an open ticket awaiting admin response. You can submit a new ticket once you receive a reply.
                        </p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Submit a new ticket</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Subject</label>
                        <input 
                          type="text"
                          className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Brief description of your question"
                          value={supportSubject}
                          onChange={(e) => setSupportSubject(e.target.value)}
                          data-testid="input-support-subject"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Message</label>
                        <Textarea
                          className="mt-1 min-h-[100px] text-sm"
                          placeholder="Please describe your question in detail..."
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          data-testid="input-support-message"
                        />
                      </div>
                      <Button 
                        className="w-full"
                        disabled={!supportSubject.trim() || !supportMessage.trim() || submitSupportTicketMutation.isPending}
                        onClick={() => submitSupportTicketMutation.mutate({ subject: supportSubject, message: supportMessage })}
                        data-testid="button-submit-support"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitSupportTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {mySupportTickets && mySupportTickets.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Your tickets</h4>
                  <div className="space-y-3">
                    {mySupportTickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          ticket.status === "open" 
                            ? "bg-blue-500/5 border-blue-500/20" 
                            : "bg-muted/50 border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ticket.createdAt && format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <Badge 
                            variant={ticket.status === "open" ? "default" : "secondary"}
                            className="text-xs flex-shrink-0"
                          >
                            {ticket.status === "open" ? "Open" : "Resolved"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {ticket.message}
                        </p>
                        {ticket.adminResponse && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-primary">Admin Response:</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ticket.adminResponse}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)} data-testid="button-error-confirm">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
