import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationWithDetails, ShippingIssue } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link, Redirect } from "wouter";
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
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  { label: string; color: string; icon: typeof Clock; description: string; step: number }
> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
    description: "Awaiting approval from our team",
    step: 1,
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle,
    description: "Your application has been approved! Shipping will begin soon.",
    step: 2,
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    icon: XCircle,
    description: "Unfortunately, due to the brand's circumstances, we couldn't work together on this campaign. We hope to collaborate with you on future opportunities!",
    step: 0,
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Truck,
    description: "Your package is on the way!",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: Package,
    description: "Package delivered! If you've posted with the correct hashtags and mentions, our team reviews content daily and will move it to Uploaded automatically.",
    step: 4,
  },
  uploaded: {
    label: "Content Uploaded",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Upload,
    description: "We've confirmed your video upload - thank you so much for participating! We'll be sharing your content with the brand. Please keep your video live for at least 6 weeks and avoid changing your TikTok handle during this period.",
    step: 5,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle,
    description: "Campaign completed successfully!",
    step: 5,
  },
  deadline_missed: {
    label: "Deadline Missed",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
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

export default function DashboardPage() {
  const { isAuthenticated, influencer, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueMessage, setIssueMessage] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [applicationToCancel, setApplicationToCancel] = useState<ApplicationWithDetails | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const { data: applications, isLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications/detailed"],
    enabled: isAuthenticated,
  });

  const { data: myIssues } = useQuery<ShippingIssue[]>({
    queryKey: ["/api/my-issues"],
    enabled: isAuthenticated,
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
      toast({
        title: "Failed to cancel",
        description: error.message,
        variant: "destructive",
      });
      setShowCancelDialog(false);
      setApplicationToCancel(null);
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: async ({ applicationId, message }: { applicationId: string; message: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/report-issue`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-issues"] });
      toast({
        title: "Issue reported",
        description: "Our team will review your report and get back to you.",
      });
      setShowIssueDialog(false);
      setIssueMessage("");
      setSelectedApplication(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/applications/${applicationId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
    },
  });

  const markRejectionViewedMutation = useMutation({
    mutationFn: async (applicationIds: string[]) => {
      await apiRequest("POST", `/api/applications/mark-rejection-viewed`, { applicationIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
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

  const visibleApplications = applications?.filter((app) => {
    if (app.status === "rejected") {
      if (app.dismissedAt) return false;
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

  const renderProgressBar = (status: string) => {
    const currentStep = statusConfig[status]?.step || 0;
    if (status === "rejected" || status === "deadline_missed") return null;

    return (
      <div className="flex items-center gap-1 w-full mt-4">
        {progressSteps.map((step, index) => {
          const stepNum = index + 1;
          const isComplete = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
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
        {renderProgressBar(application.status)}

        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <p className="text-sm text-muted-foreground">
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

        {application.shipping && (application.status === "shipped" || application.status === "delivered") && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
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
                      Your Reported Issue
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
                      <span className="text-xs font-medium text-blue-600">Admin Response</span>
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
          <span>Deadline: {format(deadline, "MMM d, yyyy")} PST</span>
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

          {["pending", "approved", "shipped", "delivered", "uploaded"].includes(application.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReportIssue(application)}
              data-testid={`button-report-${application.id}`}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Report Issue
            </Button>
          )}

          {application.status === "rejected" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => dismissMutation.mutate(application.id)}
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
          <Link href="/campaigns">
            <Button data-testid="button-browse">Browse Campaigns</Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{influencer?.score ?? 0}</p>
                <p className="text-xs text-muted-foreground">Your Score</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(statusCounts.uploaded || 0) + (statusCounts.completed || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(statusCounts.approved || 0) +
                    (statusCounts.shipped || 0) +
                    (statusCounts.delivered || 0)}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
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
              <AccordionItem value="uploads">
                <AccordionTrigger>How are uploads verified?</AccordionTrigger>
                <AccordionContent>
                  Our team manually reviews each upload to ensure it meets the campaign 
                  requirements. Make sure to include all required hashtags and mentions, 
                  and keep your content live for the specified duration.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="deadlines">
                <AccordionTrigger>Why do deadlines matter?</AccordionTrigger>
                <AccordionContent>
                  Brands have specific timelines for their campaigns. Missing deadlines 
                  affects your reliability score and may result in penalties. We send 
                  reminders 48 hours before each deadline.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="score">
                <AccordionTrigger>How does my Score work?</AccordionTrigger>
                <AccordionContent>
                  Your Score (0-100) reflects your reliability as a creator. Complete 
                  campaigns successfully to increase your score. Higher scores unlock 
                  better opportunities and exclusive campaigns.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger>What if my package is lost or damaged?</AccordionTrigger>
                <AccordionContent>
                  Use the "Report Issue" button on your shipping or delivered applications. 
                  Our team will investigate and take appropriate action. This won't affect 
                  your score if the issue is on our end.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a Shipping Issue</DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing with your package.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Package arrived damaged, missing items, never received..."
            value={issueMessage}
            onChange={(e) => setIssueMessage(e.target.value)}
            rows={4}
            data-testid="textarea-issue"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitIssueReport}
              disabled={!issueMessage.trim() || reportIssueMutation.isPending}
              data-testid="button-submit-issue"
            >
              {reportIssueMutation.isPending ? "Submitting..." : "Submit Report"}
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
    </MainLayout>
  );
}
