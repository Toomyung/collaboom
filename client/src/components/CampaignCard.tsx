import { Campaign, MinimalCampaign } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Gift, ExternalLink, Store } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getCampaignThumbnail } from "@/lib/imageUtils";
import type { MouseEvent } from "react";

const getCampaignTypeInfo = (campaignType: string | undefined) => {
  switch (campaignType) {
    case "link_in_bio":
      return {
        label: "#LinkInBio",
        anchor: "#link-in-bio",
        icon: ExternalLink,
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    case "amazon_video_upload":
      return {
        label: "#AmazonVideo",
        anchor: "#amazon-video",
        icon: Store,
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    case "gifting":
    default:
      return {
        label: "#Gifting",
        anchor: "#gifting",
        icon: Gift,
        color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      };
  }
};

interface CampaignCardProps {
  campaign: Campaign | MinimalCampaign;
  showApplyButton?: boolean;
  onApply?: () => void;
  isApplied?: boolean;
  canApply?: boolean;
  applyDisabledReason?: string;
  priority?: boolean;
}

export function CampaignCard({
  campaign,
  showApplyButton = true,
  onApply,
  isApplied = false,
  canApply = true,
  applyDisabledReason,
  priority = false,
}: CampaignCardProps) {
  // Application deadline - when users can apply (fallback to upload deadline if not set)
  const applicationDeadlineDate = campaign.applicationDeadline 
    ? new Date(campaign.applicationDeadline) 
    : new Date(campaign.deadline);
  
  const daysLeftToApply = Math.max(
    0,
    Math.ceil((applicationDeadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const isApplicationClosed = applicationDeadlineDate.getTime() < Date.now();
  const isFull = (campaign.approvedCount ?? 0) >= campaign.inventory;
  const isClosed = campaign.status === "closed" || campaign.status === "archived";

  const getCampaignTypeBadge = () => {
    const campaignType = campaign.campaignType || 'gifting';
    const typeInfo = getCampaignTypeInfo(campaignType);
    const TypeIcon = typeInfo.icon;
    
    // Link in Bio
    if (campaignType === "link_in_bio") {
      return (
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0 text-white">
          <TypeIcon className="h-3 w-3 mr-1" />
          Link in Bio
        </Badge>
      );
    }
    
    // Amazon Video Upload
    if (campaignType === "amazon_video_upload") {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white">
          <TypeIcon className="h-3 w-3 mr-1" />
          Amazon Video
        </Badge>
      );
    }
    
    // Gifting
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 text-white">
        <TypeIcon className="h-3 w-3 mr-1" />
        Gifting
      </Badge>
    );
  };

  const getStatusBadge = () => {
    if (isClosed) {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (isApplicationClosed) {
      return <Badge variant="secondary">Applications Closed</Badge>;
    }
    if (isFull) {
      return <Badge variant="secondary">Full</Badge>;
    }
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
    );
  };

  const getCategoryBadge = () => {
    const colors: Record<string, string> = {
      beauty: "bg-pink-500/10 text-pink-600 border-pink-500/20",
      food: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      lifestyle: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return (
      <Badge className={cn("capitalize", colors[campaign.category] || "")}>
        {campaign.category}
      </Badge>
    );
  };

  const isDisabled = isClosed || isApplicationClosed || isFull;
  const [, setLocation] = useLocation();

  const handleCardClick = () => {
    setLocation(`/campaigns/${campaign.id}`);
  };

  const handleApplyClick = (e: MouseEvent) => {
    e.stopPropagation();
    onApply?.();
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200 cursor-pointer",
        isDisabled ? "opacity-60" : "hover:shadow-md"
      )}
      onClick={handleCardClick}
      data-testid={`card-campaign-${campaign.id}`}
    >
      <div className={cn(
        "relative aspect-[16/9] overflow-hidden bg-muted",
        isDisabled && "grayscale-[30%]"
      )}>
        {getCampaignThumbnail(campaign) ? (
          <img
            src={getCampaignThumbnail(campaign)!}
            alt={campaign.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "low"}
            width={400}
            height={225}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Sparkles className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {getCampaignTypeBadge()}
        </div>
        <div className="absolute bottom-3 left-3">{getStatusBadge()}</div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">
              {campaign.brandName}
              {campaign.productName && ` - ${campaign.productName}`}
            </p>
            <h3 className="font-semibold text-lg leading-tight truncate">{campaign.name}</h3>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {getCategoryBadge()}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {campaign.approvedCount ?? 0}/{campaign.inventory} slots
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>
              {isApplicationClosed 
                ? "Applications closed" 
                : daysLeftToApply === 0 
                  ? "Last day to apply" 
                  : `${daysLeftToApply} days to apply`}
            </span>
          </div>
        </div>
      </CardContent>

      {showApplyButton && (
        <CardFooter className="p-4 pt-0 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isApplied ? (
            <Badge variant="secondary" className="h-9 px-4 flex-1 justify-center">
              Applied
            </Badge>
          ) : (
            <Button
              className="flex-1"
              disabled={!canApply || isFull || isClosed || isApplicationClosed}
              onClick={handleApplyClick}
              title={isApplicationClosed ? "Application deadline has passed" : applyDisabledReason}
              data-testid={`button-apply-${campaign.id}`}
            >
              Apply Now
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3v4m0 10v4M5.636 5.636l2.828 2.828m7.072 7.072l2.828 2.828M3 12h4m10 0h4M5.636 18.364l2.828-2.828m7.072-7.072l2.828-2.828" />
    </svg>
  );
}
