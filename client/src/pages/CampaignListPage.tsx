import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { CampaignCard } from "@/components/CampaignCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Campaign, MinimalCampaign } from "@shared/schema";
import { Search, Sparkles, Filter, ChevronLeft, ChevronRight, Loader2, ExternalLink, RefreshCw, WifiOff } from "lucide-react";
import { SiTiktok } from "react-icons/si";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient, formatApiError } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const ITEMS_PER_PAGE = 12;

const categories = [
  { id: "all", label: "All Campaigns" },
  { id: "available", label: "Available" },
  { id: "beauty", label: "Beauty" },
  { id: "food", label: "Food" },
  { id: "lifestyle", label: "Lifestyle" },
];

// Helper function to check if a campaign is available for application
const isAvailableForApplication = (campaign: MinimalCampaign): boolean => {
  // Must be active status
  if (campaign.status !== "active") return false;
  
  // Check slots availability
  if ((campaign.approvedCount ?? 0) >= campaign.inventory) return false;
  
  // Check deadline hasn't passed
  const deadline = campaign.applicationDeadline 
    ? new Date(campaign.applicationDeadline) 
    : new Date(campaign.deadline);
  if (deadline.getTime() < Date.now()) return false;
  
  return true;
};

export default function CampaignListPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<MinimalCampaign | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { isAuthenticated, influencer } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Use minimal=true to get only the fields needed for the list view
  const { data: campaigns, isLoading, error: campaignsError, refetch } = useQuery<MinimalCampaign[]>({
    queryKey: ["/api/campaigns", { minimal: true }],
    queryFn: async () => {
      const res = await fetch("/api/campaigns?minimal=true");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  // Use lightweight endpoint that only returns campaign IDs
  const { data: appliedCampaignIds } = useQuery<Set<string>>({
    queryKey: ["/api/applications/my-ids"],
    queryFn: async () => {
      const res = await fetch("/api/applications/my-ids");
      if (!res.ok) throw new Error("Failed to fetch applications");
      const ids: string[] = await res.json();
      return new Set(ids);
    },
    enabled: isAuthenticated,
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    initialData: new Set<string>(),
  });

  const applyMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/apply`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/my-ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", { minimal: true }] });
      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      setShowApplyDialog(false);
      setShowVerificationDialog(false);
      setAgreementChecked(false);
      setSelectedCampaign(null);
    },
    onError: (error: Error) => {
      setShowApplyDialog(false);
      setShowVerificationDialog(false);
      setErrorMessage(formatApiError(error));
      setShowErrorDialog(true);
    },
  });

  const filteredCampaigns = campaigns?.filter((campaign) => {
    // Handle "available" filter - only show campaigns that can be applied to
    if (activeCategory === "available") {
      if (!isAvailableForApplication(campaign)) return false;
    } else {
      // Handle category filter (all, beauty, food, lifestyle)
      const matchesCategory =
        activeCategory === "all" || campaign.category === activeCategory;
      if (!matchesCategory) return false;
    }
    
    const matchesSearch =
      !searchQuery ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.brandName.toLowerCase().includes(searchQuery.toLowerCase());
    // Include 'closed' so influencers can still view closed campaigns (but not apply)
    const isVisible = campaign.status === "active" || campaign.status === "full" || campaign.status === "closed";
    return matchesSearch && isVisible;
  });

  // Pagination logic
  const totalItems = filteredCampaigns?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCampaigns = filteredCampaigns?.slice(startIndex, endIndex);

  // Reset page when filters change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleApplyClick = (campaign: MinimalCampaign) => {
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

  const canApply = (campaign: MinimalCampaign) => {
    // Check campaign status first (before auth check)
    if (campaign.status === "closed" || campaign.status === "archived") return false;
    if ((campaign.approvedCount ?? 0) >= campaign.inventory) return false;
    if (!isAuthenticated) return true; // Will redirect to login
    if (!influencer?.profileCompleted) return false;
    if (influencer?.restricted) return false;
    return true;
  };

  const getApplyDisabledReason = (campaign: MinimalCampaign) => {
    if (!influencer?.profileCompleted) return "Complete your profile to apply";
    if (influencer?.restricted) return "Account restricted";
    if (campaign.status === "closed" || campaign.status === "archived") return "Campaign is closed";
    if ((campaign.approvedCount ?? 0) >= campaign.inventory) return "Campaign is full";
    return undefined;
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 md:py-8">
        {/* Header - compact on mobile */}
        <div className="mb-3 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Discover Campaigns</h1>
          <p className="text-muted-foreground text-sm sm:text-base hidden sm:block">
            Browse available campaigns and apply to receive free products
          </p>
        </div>

        {/* Search and Filters - compact on mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-3 sm:mb-6 md:mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category.id)}
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
          <div data-testid="loading-campaigns">
            {/* Skeleton grid matching the actual layout */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card overflow-hidden animate-pulse">
                  {/* Image skeleton - matches aspect-square on mobile */}
                  <div className="aspect-square sm:aspect-[4/3] md:aspect-[16/9] bg-muted" />
                  {/* Content skeleton */}
                  <div className="p-2 sm:p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-3 bg-muted rounded w-12" />
                      <div className="h-3 bg-muted rounded w-12" />
                    </div>
                  </div>
                  {/* Button skeleton */}
                  <div className="p-2 sm:p-4 pt-0">
                    <div className="h-8 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : campaignsError ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-4" data-testid="error-campaigns">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <WifiOff className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">Connection Problem</h3>
            <p className="text-muted-foreground mb-4 text-sm max-w-sm">
              We couldn't load the campaigns. Please check your internet connection and try again.
            </p>
            <Button
              onClick={() => refetch()}
              className="gap-2"
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : paginatedCampaigns && paginatedCampaigns.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
              {paginatedCampaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  isApplied={appliedCampaignIds.has(campaign.id)}
                  canApply={canApply(campaign)}
                  applyDisabledReason={getApplyDisabledReason(campaign)}
                  onApply={() => handleApplyClick(campaign)}
                  priority={currentPage === 1 && index < 3}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and adjacent pages
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;
                    const showEllipsisBefore =
                      page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter =
                      page === currentPage + 2 && currentPage < totalPages - 2;

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={page} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[36px]"
                        data-testid={`button-page-${page}`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Results info */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} campaigns
            </p>
          </>
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

      {/* Step 1: Address Confirmation Dialog */}
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
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowApplyDialog(false);
                setLocation("/profile");
              }}
              data-testid="button-change-address"
            >
              Change my address
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowApplyDialog(false)}
                data-testid="button-cancel-apply"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowApplyDialog(false);
                  setShowVerificationDialog(true);
                  setAgreementChecked(false);
                }}
                data-testid="button-confirm-address"
              >
                Confirm
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: TikTok Verification & Agreement Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={(open) => {
        setShowVerificationDialog(open);
        if (!open) {
          setAgreementChecked(false);
          setSelectedCampaign(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your TikTok Account</DialogTitle>
            <DialogDescription>
              Please verify that this is your correct TikTok handle before applying.
            </DialogDescription>
          </DialogHeader>

          {influencer && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium text-sm mb-2">Your TikTok Handle</p>
                {influencer.tiktokHandle ? (
                  <>
                    <a
                      href={`https://www.tiktok.com/@${influencer.tiktokHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                      data-testid="link-tiktok-verify"
                    >
                      <SiTiktok className="h-4 w-4" />
                      @{influencer.tiktokHandle.replace('@', '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">
                      Click the link above to verify this is your TikTok account.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-destructive">
                    No TikTok handle found. Please update your profile first.
                  </p>
                )}
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive font-medium">
                  Important: If you apply and fail to upload content, you may be restricted from participating in future campaigns. Please read all campaign details carefully before applying.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreement-list"
                  checked={agreementChecked}
                  onCheckedChange={(checked) => setAgreementChecked(checked === true)}
                  data-testid="checkbox-agreement"
                />
                <label
                  htmlFor="agreement-list"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I have read all the campaign details and I agree that by not following the campaign guidelines, I may be restricted from participating in future campaigns.
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowVerificationDialog(false);
                setAgreementChecked(false);
                setSelectedCampaign(null);
              }}
              data-testid="button-cancel-verification"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedCampaign && applyMutation.mutate(selectedCampaign.id)}
              disabled={!agreementChecked || applyMutation.isPending || !influencer?.tiktokHandle}
              data-testid="button-confirm-apply"
            >
              {applyMutation.isPending ? "Applying..." : "Apply Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Application Failed</AlertDialogTitle>
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
