import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { ApplicationCard } from "@/components/ApplicationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation, Redirect } from "wouter";
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
  Sparkles,
} from "lucide-react";
import { useState } from "react";
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

const statusTabs = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "approved", label: "Approved", icon: CheckCircle },
  { id: "shipped", label: "Shipping", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
  { id: "uploaded", label: "Uploaded", icon: Upload },
  { id: "deadline_missed", label: "Missed", icon: AlertCircle },
  { id: "rejected", label: "Rejected", icon: XCircle },
];

export default function DashboardPage() {
  const { isAuthenticated, influencer, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueMessage, setIssueMessage] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [applicationToCancel, setApplicationToCancel] = useState<ApplicationWithDetails | null>(null);

  const { data: applications, isLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications/detailed"],
    enabled: isAuthenticated,
  });

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
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const getStatusCounts = () => {
    if (!applications) return {};
    return applications.reduce((acc, app) => {
      const status = app.status === "completed" ? "uploaded" : app.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const statusCounts = getStatusCounts();

  const filteredApplications = applications?.filter((app) => {
    if (activeTab === "uploaded") {
      return app.status === "uploaded" || app.status === "completed";
    }
    return app.status === activeTab;
  });

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

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Restricted Account Banner */}
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

        {/* Profile Incomplete Banner */}
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Track your campaign applications</p>
          </div>
          <Link href="/campaigns">
            <Button data-testid="button-browse">Browse Campaigns</Button>
          </Link>
        </div>

        {/* Stats Cards */}
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

        {/* Applications Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-6">
            {statusTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {statusCounts[tab.id] ? (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {statusCounts[tab.id]}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {statusTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : filteredApplications && filteredApplications.length > 0 ? (
                <div className="space-y-4">
                  {filteredApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      onCancelApplication={
                        application.status === "pending"
                          ? () => handleCancelApplication(application)
                          : undefined
                      }
                      onReportIssue={
                        ["pending", "approved", "shipped", "delivered", "uploaded"].includes(application.status)
                          ? () => handleReportIssue(application)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <tab.icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {tab.id === "uploaded" ? "No uploads detected yet" : `No ${tab.label.toLowerCase()} applications`}
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    {tab.id === "pending"
                      ? "Apply to campaigns to see them here"
                      : tab.id === "uploaded"
                      ? "Don't worry! If you've posted your video with the correct hashtags and mentions, our team checks content daily. Your upload will appear here automatically once verified."
                      : `Applications with ${tab.label.toLowerCase()} status will appear here`}
                  </p>
                  {tab.id === "pending" && (
                    <Link href="/campaigns">
                      <Button>Browse Campaigns</Button>
                    </Link>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* FAQ / How It Works Section */}
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

      {/* Report Issue Dialog */}
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

      {/* Cancel Application Dialog */}
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
