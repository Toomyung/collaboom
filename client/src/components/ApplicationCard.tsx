import { useState } from "react";
import { ApplicationWithDetails, ShippingIssue } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  ExternalLink,
  AlertTriangle,
  Eye,
  Star,
  MessageSquare,
  Link2,
  DollarSign,
  Store,
} from "lucide-react";
import { SiLinktree } from "react-icons/si";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "wouter";
import { getCampaignThumbnail } from "@/lib/imageUtils";

interface ApplicationCardProps {
  application: ApplicationWithDetails;
  issues?: ShippingIssue[];
  onCancelApplication?: () => void;
  onReportIssue?: () => void;
  onDismiss?: () => void;
  onSubmitBioLink?: (bioLinkUrl: string) => void;
  isSubmittingBioLink?: boolean;
  onSubmitAmazonStorefront?: (amazonStorefrontUrl: string) => void;
  isSubmittingAmazonStorefront?: boolean;
  onSubmitVideo?: (videoUrl: string) => void;
  isSubmittingVideo?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock; description: string }
> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
    description: "Awaiting approval from our team",
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle,
    description: "Your application has been approved! Shipping will begin soon.",
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    icon: XCircle,
    description: "Unfortunately, due to the brand's circumstances, we couldn't work together on this campaign. We hope to collaborate with you on future opportunities!",
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Truck,
    description: "Your package is on the way!",
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: Package,
    description: "Package delivered! Please create your TikTok video and submit the link below.",
  },
  uploaded: {
    label: "Content Uploaded",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Upload,
    description: "We've confirmed your video upload - thank you so much for participating! We'll be sharing your content with the brand. Please keep your video live for at least 6 weeks and avoid changing your TikTok handle during this period.",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle,
    description: "Campaign completed successfully!",
  },
  deadline_missed: {
    label: "Deadline Missed",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertCircle,
    description: "The upload deadline has passed.",
  },
};

export function ApplicationCard({
  application,
  issues,
  onCancelApplication,
  onReportIssue,
  onDismiss,
  onSubmitBioLink,
  isSubmittingBioLink,
  onSubmitAmazonStorefront,
  isSubmittingAmazonStorefront,
  onSubmitVideo,
  isSubmittingVideo,
}: ApplicationCardProps) {
  const campaign = application.campaign;
  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const [bioLinkInput, setBioLinkInput] = useState("");
  const [amazonStorefrontInput, setAmazonStorefrontInput] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");

  const deadline = new Date(campaign.deadline);
  const isDeadlineSoon =
    application.status === "delivered" &&
    deadline.getTime() - Date.now() < 48 * 60 * 60 * 1000;
  
  const handleSubmitBioLink = () => {
    if (bioLinkInput.trim() && onSubmitBioLink) {
      onSubmitBioLink(bioLinkInput.trim());
      setBioLinkInput("");
    }
  };

  const handleSubmitAmazonStorefront = () => {
    if (amazonStorefrontInput.trim() && onSubmitAmazonStorefront) {
      onSubmitAmazonStorefront(amazonStorefrontInput.trim());
      setAmazonStorefrontInput("");
    }
  };

  const handleSubmitVideo = () => {
    if (videoUrlInput.trim() && onSubmitVideo) {
      onSubmitVideo(videoUrlInput.trim());
      setVideoUrlInput("");
    }
  };

  // Determine if video submission is available
  const canSubmitVideo = 
    application.status === "delivered" &&
    !application.contentUrl &&
    onSubmitVideo &&
    (
      // Basic (was Gifting): Can submit immediately after delivered
      campaign.campaignType === "basic" || campaign.campaignType === "gifting" ||
      // Link in Bio: Only after bio link is verified
      (campaign.campaignType === "link_in_bio" && application.bioLinkVerifiedAt) ||
      // Amazon: Only after storefront is verified
      (campaign.campaignType === "amazon_video_upload" && application.amazonStorefrontVerifiedAt)
    );

  return (
    <Card
      className="overflow-hidden"
      data-testid={`card-application-${application.id}`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Campaign Image */}
        <div className="relative w-full sm:w-40 h-32 sm:h-auto flex-shrink-0 overflow-hidden bg-muted">
          {getCampaignThumbnail(campaign) ? (
            <img
              src={getCampaignThumbnail(campaign)!}
              alt={campaign.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Package className="h-8 w-8 text-primary/40" />
            </div>
          )}
        </div>

        <div className="flex-1 p-4">
          <CardHeader className="p-0 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {campaign.brandName}
                </p>
                <h3 className="font-semibold text-lg leading-tight">
                  {campaign.name}
                </h3>
              </div>
              <Badge className={cn("flex-shrink-0", status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 space-y-3">
            <p className="text-sm text-muted-foreground">
              {application.status === "uploaded" && application.pointsAwarded && application.pointsAwarded > 0
                ? `We've confirmed your video upload and you've earned +${application.pointsAwarded} points! Thank you so much for participating. We'll be sharing your content with the brand. Please keep your video live for at least 6 weeks and avoid changing your TikTok handle during this period.`
                : status.description}
            </p>

            {/* Deadline warning */}
            {isDeadlineSoon && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Upload deadline: {format(deadline, "MMM d, h:mm a")} PST
                </span>
              </div>
            )}

            {/* Shipping info */}
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

            {/* Link in Bio Campaign Progress */}
            {(campaign as any).campaignType === "link_in_bio" && 
             ["delivered", "uploaded"].includes(application.status) && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <SiLinktree className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-600">Link in Bio Campaign</span>
                </div>
                
                <div className="space-y-2">
                  {/* Step 1: Bio Link Submission */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.bioLinkUrl 
                        ? "bg-emerald-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {application.bioLinkUrl ? <CheckCircle className="h-3.5 w-3.5" /> : "1"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          application.bioLinkUrl ? "text-emerald-600" : "text-foreground"
                        )}>
                          Add product link to your bio
                        </span>
                        {application.bioLinkUrl ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {!application.bioLinkUrl && onSubmitBioLink && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://linktr.ee/yourname"
                            value={bioLinkInput}
                            onChange={(e) => setBioLinkInput(e.target.value)}
                            className="h-8 text-sm flex-1"
                            data-testid={`input-biolink-${application.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitBioLink}
                            disabled={!bioLinkInput.trim() || isSubmittingBioLink}
                            className="h-8"
                            data-testid={`button-submit-biolink-${application.id}`}
                          >
                            {isSubmittingBioLink ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      )}
                      {application.bioLinkUrl && (
                        <a
                          href={application.bioLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View submitted link
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Admin Verification */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.bioLinkVerifiedAt 
                        ? "bg-emerald-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {application.bioLinkVerifiedAt ? <CheckCircle className="h-3.5 w-3.5" /> : "2"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          application.bioLinkVerifiedAt ? "text-emerald-600" : "text-foreground"
                        )}>
                          Bio link verification
                        </span>
                        {application.bioLinkVerifiedAt ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            Verified
                          </Badge>
                        ) : application.bioLinkUrl ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                            Under Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                      </div>
                      {!application.bioLinkVerifiedAt && application.bioLinkUrl && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Our team is reviewing your bio link
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Video Upload */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.status === "uploaded" 
                        ? "bg-emerald-500 text-white" 
                        : application.contentUrl
                          ? "bg-yellow-500 text-white"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {application.status === "uploaded" ? <CheckCircle className="h-3.5 w-3.5" /> : "3"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          application.status === "uploaded" ? "text-emerald-600" : "text-foreground"
                        )}>
                          Submit TikTok video
                        </span>
                        {application.status === "uploaded" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            Verified
                          </Badge>
                        ) : application.contentUrl ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                            Under Review
                          </Badge>
                        ) : application.bioLinkVerifiedAt ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                            Ready to Submit
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                      </div>
                      {/* Video submission form - only show when bio link is verified and video not yet submitted */}
                      {application.bioLinkVerifiedAt && !application.contentUrl && onSubmitVideo && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://www.tiktok.com/@yourname/video/..."
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                            className="h-8 text-sm flex-1"
                            data-testid={`input-video-${application.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitVideo}
                            disabled={!videoUrlInput.trim() || isSubmittingVideo}
                            className="h-8"
                            data-testid={`button-submit-video-${application.id}`}
                          >
                            {isSubmittingVideo ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      )}
                      {application.contentUrl && (
                        <a
                          href={application.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View submitted video
                        </a>
                      )}
                      {!application.bioLinkVerifiedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Complete step 2 first
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reward Status */}
                  {application.status === "uploaded" && application.bioLinkVerifiedAt && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">$30 Reward Earned!</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your reward will be sent to your PayPal account
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amazon Video Upload Campaign Progress */}
            {(campaign as any).campaignType === "amazon_video_upload" && 
             ["delivered", "uploaded"].includes(application.status) && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-600">Amazon Video Upload Campaign</span>
                </div>
                
                <div className="space-y-2">
                  {/* Step 1: Amazon Storefront Submission */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.amazonStorefrontUrl 
                        ? "bg-amber-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {application.amazonStorefrontUrl ? <CheckCircle className="h-3.5 w-3.5" /> : "1"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          application.amazonStorefrontUrl ? "text-amber-600" : "text-foreground"
                        )}>
                          Add video to your Amazon Storefront
                        </span>
                        {application.amazonStorefrontUrl ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {!application.amazonStorefrontUrl && onSubmitAmazonStorefront && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://www.amazon.com/shop/yourname"
                            value={amazonStorefrontInput}
                            onChange={(e) => setAmazonStorefrontInput(e.target.value)}
                            className="h-8 text-sm flex-1"
                            data-testid={`input-amazon-storefront-${application.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitAmazonStorefront}
                            disabled={!amazonStorefrontInput.trim() || isSubmittingAmazonStorefront}
                            className="h-8"
                            data-testid={`button-submit-amazon-storefront-${application.id}`}
                          >
                            {isSubmittingAmazonStorefront ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      )}
                      {application.amazonStorefrontUrl && (
                        <a
                          href={application.amazonStorefrontUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View submitted link
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Admin Verification */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.amazonStorefrontVerifiedAt 
                        ? "bg-amber-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {application.amazonStorefrontVerifiedAt ? <CheckCircle className="h-3.5 w-3.5" /> : "2"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          application.amazonStorefrontVerifiedAt ? "text-amber-600" : "text-foreground"
                        )}>
                          Amazon Storefront verification
                        </span>
                        {application.amazonStorefrontVerifiedAt ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            Verified
                          </Badge>
                        ) : application.amazonStorefrontUrl ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                            Under Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                      </div>
                      {!application.amazonStorefrontVerifiedAt && application.amazonStorefrontUrl && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Our team is reviewing your Amazon Storefront link
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Video Upload */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.status === "uploaded" 
                        ? "bg-amber-500 text-white" 
                        : application.contentUrl
                          ? "bg-yellow-500 text-white"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {application.status === "uploaded" ? <CheckCircle className="h-3.5 w-3.5" /> : "3"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          application.status === "uploaded" ? "text-amber-600" : "text-foreground"
                        )}>
                          Submit TikTok video
                        </span>
                        {application.status === "uploaded" ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            Verified
                          </Badge>
                        ) : application.contentUrl ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                            Under Review
                          </Badge>
                        ) : application.amazonStorefrontVerifiedAt ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                            Ready to Submit
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                      </div>
                      {/* Video submission form - only show when storefront is verified and video not yet submitted */}
                      {application.amazonStorefrontVerifiedAt && !application.contentUrl && onSubmitVideo && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://www.tiktok.com/@yourname/video/..."
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                            className="h-8 text-sm flex-1"
                            data-testid={`input-video-amazon-${application.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitVideo}
                            disabled={!videoUrlInput.trim() || isSubmittingVideo}
                            className="h-8"
                            data-testid={`button-submit-video-amazon-${application.id}`}
                          >
                            {isSubmittingVideo ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      )}
                      {application.contentUrl && (
                        <a
                          href={application.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View submitted video
                        </a>
                      )}
                      {!application.amazonStorefrontVerifiedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Complete step 2 first
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reward Status */}
                  {application.status === "uploaded" && application.amazonStorefrontVerifiedAt && (
                    <div className="mt-3 pt-3 border-t border-amber-500/20">
                      <div className="flex items-center gap-2 text-amber-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">$30 Reward Earned!</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your reward will be sent to your PayPal account
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Basic Campaign (was Gifting) - Video Submission */}
            {((campaign as any).campaignType === "basic" || (campaign as any).campaignType === "gifting") && 
             application.status === "delivered" && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-600">Submit Your TikTok Video</span>
                </div>
                
                <div className="space-y-2">
                  {/* Video submission status */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      application.contentUrl 
                        ? "bg-yellow-500 text-white" 
                        : "bg-purple-500 text-white"
                    )}>
                      {application.contentUrl ? <Clock className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {application.contentUrl ? "Video submitted" : "Submit your TikTok video link"}
                        </span>
                        {application.contentUrl ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                            Under Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                            Ready to Submit
                          </Badge>
                        )}
                      </div>
                      
                      {/* Video submission form */}
                      {!application.contentUrl && onSubmitVideo && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://www.tiktok.com/@yourname/video/..."
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                            className="h-8 text-sm flex-1"
                            data-testid={`input-video-basic-${application.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitVideo}
                            disabled={!videoUrlInput.trim() || isSubmittingVideo}
                            className="h-8"
                            data-testid={`button-submit-video-basic-${application.id}`}
                          >
                            {isSubmittingVideo ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {application.contentUrl && (
                        <a
                          href={application.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View submitted video
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Once submitted, our team will review your video and mark it as verified.
                </p>
              </div>
            )}

            {/* Uploaded Video Info */}
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

            {/* Comments Section */}
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
                        {issue.status === "open" ? "Awaiting Reply" : 
                         issue.status === "resolved" ? "Replied" : "Dismissed"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {issue.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent: {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, yyyy") : "Unknown"}
                    </p>
                    
                    {/* Collaboom Team Response */}
                    {issue.adminResponse && (
                      <div className="bg-primary/5 border border-primary/20 rounded-md p-2 mt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-primary">Collaboom Team</span>
                        </div>
                        <p className="text-sm" data-testid={`issue-response-${issue.id}`}>
                          {issue.adminResponse}
                        </p>
                        {issue.resolvedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(issue.resolvedAt), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Applied: {format(new Date(application.appliedAt!), "MMM d, yyyy")}</span>
              {application.approvedAt && (
                <span>
                  Approved: {format(new Date(application.approvedAt), "MMM d, yyyy")}
                </span>
              )}
              <span className="text-red-500 font-medium">Deadline: {format(deadline, "MMM d, yyyy")} PST</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {application.status === "pending" && (
                <>
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
                  {onCancelApplication && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelApplication}
                      data-testid={`button-cancel-${application.id}`}
                    >
                      Cancel Application
                    </Button>
                  )}
                </>
              )}

              {["pending", "approved", "shipped", "delivered"].includes(application.status) &&
                onReportIssue && (
                  (() => {
                    const hasPendingComment = issues?.some(issue => issue.status === "open");
                    return hasPendingComment ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Awaiting reply on your comment
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReportIssue}
                        data-testid={`button-comment-${application.id}`}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Leave a Comment
                      </Button>
                    );
                  })()
                )}

              {(application.status === "rejected" || application.status === "uploaded" || application.status === "completed") && onDismiss && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDismiss}
                  data-testid={`button-dismiss-${application.id}`}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
