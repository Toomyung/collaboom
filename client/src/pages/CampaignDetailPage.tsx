import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Campaign } from "@shared/schema";
import {
  Clock,
  Users,
  Gift,
  DollarSign,
  ArrowLeft,
  ExternalLink,
  Hash,
  AtSign,
  CheckCircle,
  Package,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, influencer } = useAuth();
  const { toast } = useToast();
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
  });

  const { data: applications } = useQuery<{ campaignId: string }[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated,
  });

  const isApplied = applications?.some((a) => a.campaignId === id);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/campaigns/${id}/apply`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id] });
      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      setShowApplyDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!influencer?.profileCompleted) {
      toast({
        title: "Complete your profile",
        description: "You need to complete your profile before applying to campaigns.",
        variant: "destructive",
      });
      setLocation("/profile");
      return;
    }
    if (influencer?.restricted) {
      toast({
        title: "Account restricted",
        description: "Your account is currently restricted. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    setShowApplyDialog(true);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="aspect-[16/9] rounded-xl mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!campaign) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This campaign may have been removed or is no longer available.
          </p>
          <Link href="/campaigns">
            <Button>Browse Campaigns</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const isFull = (campaign.approvedCount ?? 0) >= campaign.inventory;
  const isClosed = campaign.status === "closed" || campaign.status === "archived";
  const canApply =
    isAuthenticated &&
    influencer?.profileCompleted &&
    !influencer?.restricted &&
    !isFull &&
    !isClosed &&
    !isApplied;

  const getRewardDisplay = () => {
    switch (campaign.rewardType) {
      case "gift":
        return { label: "Free Product", icon: Gift, color: "from-purple-500 to-pink-500" };
      case "20usd":
        return { label: "Free Product + $20", icon: DollarSign, color: "from-emerald-500 to-teal-500" };
      case "50usd":
        return { label: "Free Product + $50", icon: DollarSign, color: "from-amber-500 to-orange-500" };
      default:
        return { label: "Free Product", icon: Gift, color: "from-purple-500 to-pink-500" };
    }
  };

  const reward = getRewardDisplay();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/campaigns">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>

        {/* Hero Image */}
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-muted mb-6">
          {campaign.imageUrl ? (
            <img
              src={campaign.imageUrl}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Package className="h-20 w-20 text-primary/40" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            <Badge className={cn("bg-gradient-to-r text-white border-0", reward.color)}>
              <reward.icon className="h-3 w-3 mr-1" />
              {reward.label}
            </Badge>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">
              {campaign.category}
            </Badge>
            {isFull && <Badge variant="secondary">Full</Badge>}
            {isClosed && <Badge variant="secondary">Closed</Badge>}
          </div>
          <p className="text-muted-foreground mb-1">{campaign.brandName}</p>
          <h1 className="text-3xl font-bold mb-4">{campaign.name}</h1>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{campaign.approvedCount ?? 0}</strong> / {campaign.inventory} slots filled
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{daysLeft}</strong> days left
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                Deadline: <strong>{format(new Date(campaign.deadline), "MMM d, yyyy")}</strong> (PST)
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Guidelines */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Campaign Guidelines</h2>
              {campaign.guidelinesSummary ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">
                  {campaign.guidelinesSummary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Create authentic TikTok content featuring the product.
                </p>
              )}
              {campaign.guidelinesUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={campaign.guidelinesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-full-guidelines"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Guidelines
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Content Requirements</h2>
              
              {campaign.requiredHashtags && campaign.requiredHashtags.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Required Hashtags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.requiredHashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {campaign.requiredMentions && campaign.requiredMentions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    Required Mentions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.requiredMentions.map((mention, i) => (
                      <Badge key={i} variant="secondary">
                        {mention.startsWith("@") ? mention : `@${mention}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(!campaign.requiredHashtags || campaign.requiredHashtags.length === 0) &&
                (!campaign.requiredMentions || campaign.requiredMentions.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No specific hashtags or mentions required. Check the full guidelines for details.
                  </p>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Apply Section */}
        <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg mb-1">Ready to Apply?</h2>
                <p className="text-sm text-muted-foreground">
                  {isApplied
                    ? "You've already applied to this campaign."
                    : isFull
                    ? "This campaign has reached its capacity."
                    : isClosed
                    ? "This campaign is no longer accepting applications."
                    : "Submit your application to receive free products!"}
                </p>
              </div>
              {isApplied ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Applied
                </Badge>
              ) : (
                <Button
                  size="lg"
                  disabled={!canApply && isAuthenticated}
                  onClick={handleApplyClick}
                  data-testid="button-apply"
                >
                  {!isAuthenticated
                    ? "Sign In to Apply"
                    : !influencer?.profileCompleted
                    ? "Complete Profile to Apply"
                    : "Apply Now"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Amazon Link */}
        {campaign.amazonUrl && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <a
                href={campaign.amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-amazon"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Product on Amazon
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Apply Confirmation Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Application</DialogTitle>
            <DialogDescription>
              Please verify your shipping address is correct before applying.
            </DialogDescription>
          </DialogHeader>

          {influencer && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm">Shipping Address</p>
              <p className="text-sm text-muted-foreground">
                {influencer.name}
                <br />
                {influencer.addressLine1}
                <br />
                {influencer.addressLine2 && (
                  <>
                    {influencer.addressLine2}
                    <br />
                  </>
                )}
                {influencer.city}, {influencer.state} {influencer.zipCode}
                <br />
                {influencer.country}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowApplyDialog(false)}
              data-testid="button-cancel-apply"
            >
              Cancel
            </Button>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              data-testid="button-confirm-apply"
            >
              {applyMutation.isPending ? "Applying..." : "Confirm & Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
