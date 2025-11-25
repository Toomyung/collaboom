import { Campaign } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Gift, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: Campaign;
  showApplyButton?: boolean;
  onApply?: () => void;
  isApplied?: boolean;
  canApply?: boolean;
  applyDisabledReason?: string;
}

export function CampaignCard({
  campaign,
  showApplyButton = true,
  onApply,
  isApplied = false,
  canApply = true,
  applyDisabledReason,
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

  const getRewardBadge = () => {
    // Handle new 'paid' type with custom amount
    if (campaign.rewardType === "paid" && campaign.rewardAmount) {
      return (
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0 text-white">
          <DollarSign className="h-3 w-3 mr-1" />
          +${campaign.rewardAmount} Reward
        </Badge>
      );
    }
    
    // Handle gift type
    if (campaign.rewardType === "gift") {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 text-white">
          <Gift className="h-3 w-3 mr-1" />
          Gift Only
        </Badge>
      );
    }
    
    // Legacy support for old reward types (20usd, 50usd)
    if (campaign.rewardType === "20usd") {
      return (
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0 text-white">
          <DollarSign className="h-3 w-3 mr-1" />
          +$20 Reward
        </Badge>
      );
    }
    
    if (campaign.rewardType === "50usd") {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white">
          <DollarSign className="h-3 w-3 mr-1" />
          +$50 Reward
        </Badge>
      );
    }
    
    return null;
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

  return (
    <Card
      className="group overflow-hidden transition-all duration-200 hover:shadow-md"
      data-testid={`card-campaign-${campaign.id}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {campaign.imageUrl ? (
          <img
            src={campaign.imageUrl}
            alt={campaign.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Sparkles className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {getRewardBadge()}
        </div>
        <div className="absolute bottom-3 left-3">{getStatusBadge()}</div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{campaign.brandName}</p>
            <h3 className="font-semibold text-lg leading-tight truncate">{campaign.name}</h3>
          </div>
          {getCategoryBadge()}
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
        <CardFooter className="p-4 pt-0 flex gap-2">
          <Link href={`/campaigns/${campaign.id}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-${campaign.id}`}>
              View Details
            </Button>
          </Link>
          {isApplied ? (
            <Badge variant="secondary" className="h-9 px-4">
              Applied
            </Badge>
          ) : (
            <Button
              className="flex-1"
              disabled={!canApply || isFull || isClosed || isApplicationClosed}
              onClick={onApply}
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
