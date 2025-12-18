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
    description: "Package delivered! If you've posted with the correct hashtags and mentions, our team reviews content daily and will move it to Uploaded automatically.",
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
}: ApplicationCardProps) {
  const campaign = application.campaign;
  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const [bioLinkInput, setBioLinkInput] = useState("");

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
                          Upload TikTok video
                        </span>
                        {application.status === "uploaded" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
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
