import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { CampaignCard } from "@/components/CampaignCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Campaign } from "@shared/schema";
import { Search, Sparkles, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const categories = [
  { id: "all", label: "All Campaigns" },
  { id: "beauty", label: "Beauty" },
  { id: "food", label: "Food" },
  { id: "lifestyle", label: "Lifestyle" },
];

export default function CampaignListPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const { isAuthenticated, influencer } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: applications } = useQuery<{ campaignId: string }[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated,
  });

  const appliedCampaignIds = new Set(applications?.map((a) => a.campaignId) || []);

  const applyMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/apply`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      setShowApplyDialog(false);
      setSelectedCampaign(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCampaigns = campaigns?.filter((campaign) => {
    const matchesCategory =
      activeCategory === "all" || campaign.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.brandName.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = campaign.status === "active" || campaign.status === "full";
    return matchesCategory && matchesSearch && isActive;
  });

  const handleApplyClick = (campaign: Campaign) => {
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
    setSelectedCampaign(campaign);
    setShowApplyDialog(true);
  };

  const canApply = (campaign: Campaign) => {
    if (!isAuthenticated) return true; // Will redirect to login
    if (!influencer?.profileCompleted) return false;
    if (influencer?.restricted) return false;
    if ((campaign.approvedCount ?? 0) >= campaign.inventory) return false;
    return true;
  };

  const getApplyDisabledReason = (campaign: Campaign) => {
    if (!influencer?.profileCompleted) return "Complete your profile to apply";
    if (influencer?.restricted) return "Account restricted";
    if ((campaign.approvedCount ?? 0) >= campaign.inventory) return "Campaign is full";
    return undefined;
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Campaigns</h1>
          <p className="text-muted-foreground">
            Browse available campaigns and apply to receive free products
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="flex-shrink-0"
                data-testid={`filter-${category.id}`}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[16/9] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isApplied={appliedCampaignIds.has(campaign.id)}
                canApply={canApply(campaign)}
                applyDisabledReason={getApplyDisabledReason(campaign)}
                onApply={() => handleApplyClick(campaign)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || activeCategory !== "all"
                ? "Try adjusting your filters"
                : "New campaigns are added regularly. Check back soon!"}
            </p>
            {(searchQuery || activeCategory !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
              >
                Clear filters
              </Button>
            )}
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
                {influencer.name}<br />
                {influencer.addressLine1}<br />
                {influencer.addressLine2 && <>{influencer.addressLine2}<br /></>}
                {influencer.city}, {influencer.state} {influencer.zipCode}<br />
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
              onClick={() => selectedCampaign && applyMutation.mutate(selectedCampaign.id)}
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
