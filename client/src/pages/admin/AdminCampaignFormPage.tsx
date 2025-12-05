import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link, Redirect } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Campaign, insertCampaignSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, X, Plus, AlertCircle, Video, Link as LinkIcon } from "lucide-react";
import { z } from "zod";
import { useState, useEffect } from "react";
import { PlacementImageUpload } from "@/components/PlacementImageUpload";

const formSchema = insertCampaignSchema.extend({
  productName: z.string().optional(),
  requiredHashtags: z.array(z.string()).optional(),
  requiredMentions: z.array(z.string()).optional(),
  contentOverview: z.string().optional(),
  productDetail: z.string().optional(),
  stepByStepProcess: z.string().optional(),
  eligibilityRequirements: z.string().optional(),
  // Social/External Links
  amazonUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  officialWebsiteUrl: z.string().optional(),
  // Timeline
  campaignTimeline: z.string().optional(),
  // Video Guidelines
  videoEssentialCuts: z.string().optional(),
  videoDetails: z.string().optional(),
  videoReferenceUrls: z.array(z.string()).optional(),
  videoKeyPoints: z.string().optional(),
  applicationDeadline: z.string().min(1, "Application deadline is required"),
  deadline: z.string().min(1, "Upload deadline is required"),
  rewardAmount: z.number().optional().nullable(),
}).refine(
  (data) => {
    if (data.rewardType === "paid") {
      return data.rewardAmount != null && data.rewardAmount > 0;
    }
    return true;
  },
  {
    message: "Reward amount is required for paid campaigns",
    path: ["rewardAmount"],
  }
);

type FormData = z.infer<typeof formSchema>;

// Helper to normalize legacy reward types (20usd, 50usd) to new format
function normalizeLegacyRewardType(rewardType: string, rewardAmount: number | null | undefined): { rewardType: string; rewardAmount: number | null } {
  if (rewardType === "20usd") {
    return { rewardType: "paid", rewardAmount: 20 };
  }
  if (rewardType === "50usd") {
    return { rewardType: "paid", rewardAmount: 50 };
  }
  return { rewardType, rewardAmount: rewardAmount ?? null };
}

// Helper to detect platform from URL
type Platform = "instagram" | "tiktok" | "amazon" | "unknown";

function detectPlatformFromUrl(url: string): Platform {
  if (!url) return "unknown";
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("instagram.com") || lowerUrl.includes("instagr.am")) {
    return "instagram";
  }
  if (lowerUrl.includes("tiktok.com") || lowerUrl.includes("vm.tiktok.com")) {
    return "tiktok";
  }
  if (lowerUrl.includes("amazon.com") || lowerUrl.includes("amzn.to") || lowerUrl.includes("a.co")) {
    return "amazon";
  }
  return "unknown";
}

function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case "instagram": return "Instagram";
    case "tiktok": return "TikTok";
    case "amazon": return "Amazon";
    default: return "Unknown";
  }
}

export default function AdminCampaignFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hashtagInput, setHashtagInput] = useState("");
  const [mentionInput, setMentionInput] = useState("");
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [dateErrorDialogOpen, setDateErrorDialogOpen] = useState(false);
  const [missingFieldsDialogOpen, setMissingFieldsDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [pendingSubmitAction, setPendingSubmitAction] = useState<(() => void) | null>(null);
  
  // URL mismatch warning state
  const [urlMismatchDialogOpen, setUrlMismatchDialogOpen] = useState(false);
  const [urlMismatchInfo, setUrlMismatchInfo] = useState<{
    fieldName: string;
    expectedPlatform: string;
    detectedPlatform: string;
    url: string;
  } | null>(null);
  
  // Handler for URL field blur - validates platform matches expected field
  const handleUrlBlur = (fieldName: string, expectedPlatform: Platform, url: string) => {
    if (!url || url.trim() === "") return;
    
    const detectedPlatform = detectPlatformFromUrl(url);
    
    // Show warning if detected platform doesn't match expected platform
    if (detectedPlatform !== "unknown" && detectedPlatform !== expectedPlatform) {
      setUrlMismatchInfo({
        fieldName,
        expectedPlatform: getPlatformDisplayName(expectedPlatform),
        detectedPlatform: getPlatformDisplayName(detectedPlatform),
        url,
      });
      setUrlMismatchDialogOpen(true);
    }
  };

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/admin/campaigns", id],
    enabled: isAuthenticated && isAdmin && isEditing,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      brandName: "",
      productName: "",
      category: "beauty",
      rewardType: "gift",
      rewardAmount: null,
      inventory: 50,
      imageUrls: [],
      amazonUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      officialWebsiteUrl: "",
      guidelinesSummary: "",
      contentOverview: "",
      requiredHashtags: [],
      requiredMentions: [],
      productDetail: "",
      stepByStepProcess: "",
      eligibilityRequirements: "",
      videoEssentialCuts: "",
      videoDetails: "",
      videoReferenceUrls: [],
      videoKeyPoints: "",
      applicationDeadline: new Date().toISOString().split("T")[0] + "T23:59:00",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T23:59:00",
      campaignTimeline: "",
      status: "draft",
    },
    values: campaign
      ? (() => {
          const normalizedReward = normalizeLegacyRewardType(campaign.rewardType, campaign.rewardAmount);
          return {
            name: campaign.name,
            brandName: campaign.brandName,
            productName: (campaign as any).productName || "",
            category: campaign.category,
            rewardType: normalizedReward.rewardType,
            rewardAmount: normalizedReward.rewardAmount,
            inventory: campaign.inventory,
            imageUrls: campaign.imageUrls || (campaign.imageUrl ? [campaign.imageUrl] : []),
            amazonUrl: campaign.amazonUrl || "",
            instagramUrl: (campaign as any).instagramUrl || "",
            tiktokUrl: (campaign as any).tiktokUrl || "",
            officialWebsiteUrl: (campaign as any).officialWebsiteUrl || "",
            guidelinesSummary: campaign.guidelinesSummary || "",
            contentOverview: (campaign as any).contentOverview || "",
            requiredHashtags: campaign.requiredHashtags || [],
            requiredMentions: campaign.requiredMentions || [],
            productDetail: (campaign as any).productDetail || "",
            stepByStepProcess: (campaign as any).stepByStepProcess || "",
            eligibilityRequirements: (campaign as any).eligibilityRequirements || "",
            videoEssentialCuts: (campaign as any).videoEssentialCuts || "",
            videoDetails: (campaign as any).videoDetails || "",
            videoReferenceUrls: (campaign as any).videoReferenceUrls || [],
            videoKeyPoints: (campaign as any).videoKeyPoints || "",
            applicationDeadline: campaign.applicationDeadline 
              ? new Date(campaign.applicationDeadline).toISOString().slice(0, 16)
              : new Date().toISOString().split("T")[0] + "T23:59",
            deadline: campaign.deadline 
              ? new Date(campaign.deadline).toISOString().slice(0, 16)
              : new Date().toISOString().split("T")[0] + "T23:59",
            campaignTimeline: (campaign as any).campaignTimeline || "",
            status: campaign.status,
          };
        })()
      : undefined,
  });

  const watchRewardType = form.watch("rewardType");

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { 
        ...data, 
        applicationDeadline: new Date(data.applicationDeadline),
        deadline: new Date(data.deadline) 
      };
      const res = await apiRequest("POST", "/api/admin/campaigns", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Campaign created" });
      setLocation(`/admin/campaigns/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { 
        ...data, 
        applicationDeadline: new Date(data.applicationDeadline),
        deadline: new Date(data.deadline) 
      };
      const res = await apiRequest("PUT", `/api/admin/campaigns/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id] });
      toast({ title: "Campaign updated" });
      setLocation(`/admin/campaigns/${id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading || (isEditing && campaignLoading)) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-48" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  const validateDates = (data: FormData): boolean => {
    const appDeadline = new Date(data.applicationDeadline);
    const uploadDeadline = new Date(data.deadline);
    
    if (appDeadline >= uploadDeadline) {
      setDateErrorDialogOpen(true);
      return false;
    }
    return true;
  };

  // Check for empty optional fields and warn user
  const checkMissingFields = (data: FormData): string[] => {
    const missing: string[] = [];
    
    // Images
    if (!data.imageUrls || data.imageUrls.length === 0) {
      missing.push("Placement Images");
    }
    
    // Content requirements
    if (!data.requiredHashtags || data.requiredHashtags.length === 0) {
      missing.push("Required Hashtags");
    }
    if (!data.requiredMentions || data.requiredMentions.length === 0) {
      missing.push("Required Mentions");
    }
    
    // Video guidelines
    if (!data.videoReferenceUrls || data.videoReferenceUrls.length === 0) {
      missing.push("Reference Videos");
    }
    if (!data.videoEssentialCuts?.trim()) {
      missing.push("Video Essential Cuts");
    }
    if (!data.videoDetails?.trim()) {
      missing.push("Video Details");
    }
    if (!data.videoKeyPoints?.trim()) {
      missing.push("Video Key Points");
    }
    
    // Links
    if (!data.amazonUrl?.trim() && !data.instagramUrl?.trim() && !data.tiktokUrl?.trim() && !data.officialWebsiteUrl?.trim()) {
      missing.push("Links (Amazon, Instagram, TikTok, or Website)");
    }
    
    // Timeline
    if (!data.campaignTimeline?.trim()) {
      missing.push("Campaign Timeline");
    }
    
    return missing;
  };

  const handleSubmitWithWarning = (data: FormData, submitAction: () => void) => {
    if (!validateDates(data)) return;
    
    const missing = checkMissingFields(data);
    if (missing.length > 0) {
      setMissingFields(missing);
      setPendingSubmitAction(() => submitAction);
      setMissingFieldsDialogOpen(true);
      return;
    }
    
    submitAction();
  };

  const onSubmitUpdate = (data: FormData) => {
    handleSubmitWithWarning(data, () => updateMutation.mutate(data));
  };

  const handleCreateDraft = () => {
    form.handleSubmit((data) => {
      handleSubmitWithWarning(data, () => createMutation.mutate({ ...data, status: "draft" }));
    })();
  };

  const handleCreateActive = () => {
    form.handleSubmit((data) => {
      handleSubmitWithWarning(data, () => createMutation.mutate({ ...data, status: "active" }));
    })();
  };

  const handlePublish = () => {
    form.handleSubmit((data) => {
      handleSubmitWithWarning(data, () => updateMutation.mutate({ ...data, status: "active" }));
    })();
  };

  const handleConfirmSubmit = () => {
    if (pendingSubmitAction) {
      pendingSubmitAction();
    }
    setMissingFieldsDialogOpen(false);
    setPendingSubmitAction(null);
    setMissingFields([]);
  };

  const handleCancelSubmit = () => {
    setMissingFieldsDialogOpen(false);
    setPendingSubmitAction(null);
    setMissingFields([]);
  };

  const addHashtag = () => {
    if (!hashtagInput.trim()) return;
    const tag = hashtagInput.startsWith("#") ? hashtagInput : `#${hashtagInput}`;
    const current = form.getValues("requiredHashtags") || [];
    if (!current.includes(tag)) {
      form.setValue("requiredHashtags", [...current, tag], { shouldDirty: true, shouldValidate: true });
    }
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) => {
    const current = form.getValues("requiredHashtags") || [];
    form.setValue(
      "requiredHashtags",
      current.filter((t) => t !== tag),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const addMention = () => {
    if (!mentionInput.trim()) return;
    const mention = mentionInput.startsWith("@") ? mentionInput : `@${mentionInput}`;
    const current = form.getValues("requiredMentions") || [];
    if (!current.includes(mention)) {
      form.setValue("requiredMentions", [...current, mention], { shouldDirty: true, shouldValidate: true });
    }
    setMentionInput("");
  };

  const removeMention = (mention: string) => {
    const current = form.getValues("requiredMentions") || [];
    form.setValue(
      "requiredMentions",
      current.filter((m) => m !== mention),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const addReferenceUrl = () => {
    if (!referenceUrlInput.trim()) return;
    const url = referenceUrlInput.trim();
    const current = form.getValues("videoReferenceUrls") || [];
    
    // Limit to 2 reference videos
    if (current.length >= 2) {
      toast({
        title: "Maximum reached",
        description: "You can only add up to 2 reference videos.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if TikTok URL is an actual video link
    const isTikTokUrl = url.includes("tiktok.com");
    const hasVideoId = url.includes("/video/");
    
    if (isTikTokUrl && !hasVideoId) {
      toast({
        title: "Not a Video Link",
        description: "This looks like a TikTok profile link, not a video link. Please use a video URL (e.g., tiktok.com/@user/video/123456)",
        variant: "destructive",
      });
      return;
    }
    
    if (!current.includes(url)) {
      const newUrls = [...current, url];
      form.setValue("videoReferenceUrls", newUrls, { shouldDirty: true, shouldValidate: true });
    }
    setReferenceUrlInput("");
  };

  const removeReferenceUrl = (url: string) => {
    const current = form.getValues("videoReferenceUrls") || [];
    form.setValue(
      "videoReferenceUrls",
      current.filter((u) => u !== url),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={isEditing ? `/admin/campaigns/${id}` : "/admin/campaigns"}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Campaign" : "Create Campaign"}
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitUpdate)} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="K-Beauty Serum Launch" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="GlowLab" {...field} data-testid="input-brand" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Vitamin C Serum" {...field} value={field.value || ""} data-testid="input-product" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beauty">Beauty</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                            <SelectItem value="lifestyle">Lifestyle</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rewardType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reward Type *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value === "gift") {
                              form.setValue("rewardAmount", null);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-reward">
                              <SelectValue placeholder="Select reward" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gift">Gift Only</SelectItem>
                            <SelectItem value="paid">Gift + Cash Reward</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchRewardType === "paid" && (
                  <FormField
                    control={form.control}
                    name="rewardAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reward Amount (USD) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 20, 50, 100"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-reward-amount"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the cash reward amount in USD
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="inventory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory (Slots) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-inventory"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="applicationDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Deadline *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? field.value.split("T")[0] : ""}
                            onChange={(e) => field.onChange(e.target.value + "T23:59:00")}
                            data-testid="input-application-deadline" 
                          />
                        </FormControl>
                        <FormDescription>
                          Last date to apply (PST - Pacific Standard Time)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Deadline *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? field.value.split("T")[0] : ""}
                            onChange={(e) => field.onChange(e.target.value + "T23:59:00")}
                            data-testid="input-deadline" 
                          />
                        </FormControl>
                        <FormDescription>
                          Content submission deadline (PST - Pacific Standard Time)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campaign Timeline */}
                <FormField
                  control={form.control}
                  name="campaignTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Timeline</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Week 1: Application review&#10;Week 2: Product shipping&#10;Week 3-4: Content creation&#10;Week 5: Upload deadline"
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-campaign-timeline"
                        />
                      </FormControl>
                      <FormDescription>
                        Describe the campaign schedule and milestones for influencers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>

            {/* Media & Links */}
            <Card>
              <CardHeader>
                <CardTitle>Media & Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placement Images</FormLabel>
                      <FormControl>
                        <PlacementImageUpload
                          value={field.value || []}
                          onChange={field.onChange}
                          maxImages={6}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Links Section */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <LinkIcon className="h-4 w-4" />
                    <span>Links (Optional)</span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="amazonUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amazon Product URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://amazon.com/..."
                            {...field}
                            value={field.value || ""}
                            onBlur={(e) => {
                              field.onBlur();
                              handleUrlBlur("Amazon Product URL", "amazon", e.target.value);
                            }}
                            data-testid="input-amazon"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/..."
                            {...field}
                            value={field.value || ""}
                            onBlur={(e) => {
                              field.onBlur();
                              handleUrlBlur("Instagram URL", "instagram", e.target.value);
                            }}
                            data-testid="input-instagram"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tiktokUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://tiktok.com/@..."
                            {...field}
                            value={field.value || ""}
                            onBlur={(e) => {
                              field.onBlur();
                              handleUrlBlur("TikTok URL", "tiktok", e.target.value);
                            }}
                            data-testid="input-tiktok"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="officialWebsiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Official Website</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-website"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>About Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="guidelinesSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of campaign details (5-10 lines)..."
                          rows={5}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-guidelines"
                        />
                      </FormControl>
                      <FormDescription>
                        This appears on the campaign detail page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campaign Overview */}
                <FormField
                  control={form.control}
                  name="contentOverview"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Overview</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief overview of campaign expectations for influencers..."
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-content-overview"
                        />
                      </FormControl>
                      <FormDescription>
                        Describes campaign requirements shown on the campaign detail page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="productDetail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Detail</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the product in detail - features, benefits, what makes it special..."
                          rows={6}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-product-detail"
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed product information that helps influencers understand what they're promoting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Step by Step Process */}
            <Card>
              <CardHeader>
                <CardTitle>Step by Step Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="stepByStepProcess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process Steps</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="1. Apply for the campaign&#10;2. Wait for approval&#10;3. Receive the product&#10;4. Create content following guidelines&#10;5. Upload your content before deadline"
                          rows={8}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-step-by-step"
                        />
                      </FormControl>
                      <FormDescription>
                        Step-by-step instructions for influencers to follow throughout the campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Eligibility and Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Eligibility and Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="eligibilityRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eligibility Criteria</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter eligibility criteria or click 'Use Preset' below..."
                          rows={6}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-eligibility"
                        />
                      </FormControl>
                      <FormDescription>
                        Requirements that influencers must meet to be eligible for this campaign
                      </FormDescription>
                      <FormMessage />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const presetText = `• Minimum 1,000 TikTok followers
• US-based creators only
• Must be 18 years or older
• Must post within deadline
• Active engagement on recent posts`;
                          field.onChange(presetText);
                        }}
                        data-testid="button-eligibility-preset"
                      >
                        Use Preset
                      </Button>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Video Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="videoEssentialCuts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essential Cuts</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the essential scenes/cuts that must be included in the video...&#10;• Opening hook&#10;• Product unboxing&#10;• Application/usage&#10;• Before & after"
                          rows={5}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-essential-cuts"
                        />
                      </FormControl>
                      <FormDescription>
                        Required scenes or cuts that influencers must include in their video
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional video requirements and details...&#10;• Video length: 30-60 seconds&#10;• Format: vertical (9:16)&#10;• Music: trending sounds preferred&#10;• Lighting: natural daylight"
                          rows={5}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-video-details"
                        />
                      </FormControl>
                      <FormDescription>
                        Technical requirements and additional filming details
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoKeyPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Points</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Key messages to communicate...&#10;• Main selling points&#10;• Call-to-action&#10;• Brand voice/tone"
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-key-points"
                        />
                      </FormControl>
                      <FormDescription>
                        Key messages and points that influencers should highlight
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hashtags */}
                <div>
                  <FormLabel>Required Hashtags</FormLabel>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="#hashtag"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                      data-testid="input-hashtag"
                    />
                    <Button type="button" variant="outline" onClick={addHashtag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch("requiredHashtags")?.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Mentions */}
                <div>
                  <FormLabel>Required Mentions</FormLabel>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="@username"
                      value={mentionInput}
                      onChange={(e) => setMentionInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMention())}
                      data-testid="input-mention"
                    />
                    <Button type="button" variant="outline" onClick={addMention}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.watch("requiredMentions")?.map((mention, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {mention}
                        <button
                          type="button"
                          onClick={() => removeMention(mention)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Reference Videos */}
                <div>
                  <FormLabel className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Reference Videos (TikTok)
                  </FormLabel>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="https://www.tiktok.com/@username/video/..."
                      value={referenceUrlInput}
                      onChange={(e) => setReferenceUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReferenceUrl())}
                      data-testid="input-reference-url"
                    />
                    <Button type="button" variant="outline" onClick={addReferenceUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormDescription className="mt-1">
                    Add TikTok video URLs as reference examples for influencers
                  </FormDescription>
                  <div className="flex flex-col gap-2 mt-3">
                    {form.watch("videoReferenceUrls")?.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeReferenceUrl(url)}
                          className="hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Link href={isEditing ? `/admin/campaigns/${id}` : "/admin/campaigns"}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              {isEditing ? (
                <>
                  <Button type="submit" disabled={isPending} variant="secondary" data-testid="button-save">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  {campaign?.status === "draft" && (
                    <Button 
                      type="button" 
                      disabled={isPending} 
                      onClick={handlePublish}
                      data-testid="button-publish"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        "Publish Campaign"
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={handleCreateDraft}
                    data-testid="button-save-draft"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save as Draft"
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={handleCreateActive}
                    data-testid="button-create"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Campaign"
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>

        <AlertDialog open={dateErrorDialogOpen} onOpenChange={setDateErrorDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Invalid Date Range
              </AlertDialogTitle>
              <AlertDialogDescription>
                Application Deadline must be before Upload Deadline. Please adjust the dates and try again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction data-testid="button-date-error-ok">OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Missing Fields Warning Dialog */}
        <AlertDialog open={missingFieldsDialogOpen} onOpenChange={setMissingFieldsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Missing Information
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>The following fields are empty:</p>
                <ul className="list-disc list-inside text-amber-600 font-medium">
                  {missingFields.map((field, i) => (
                    <li key={i}>{field}</li>
                  ))}
                </ul>
                <p className="pt-2">Do you want to save without these fields?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelSubmit} data-testid="button-missing-cancel">
                Go Back & Add
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSubmit} data-testid="button-missing-confirm">
                Save Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* URL Platform Mismatch Warning Dialog */}
        <AlertDialog 
          open={urlMismatchDialogOpen} 
          onOpenChange={(open) => {
            setUrlMismatchDialogOpen(open);
            if (!open) {
              setUrlMismatchInfo(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Wrong Platform URL
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                {urlMismatchInfo && (
                  <>
                    <p>
                      You entered a <span className="font-semibold text-amber-600">{urlMismatchInfo.detectedPlatform}</span> URL 
                      in the <span className="font-semibold">{urlMismatchInfo.fieldName}</span> field.
                    </p>
                    <p className="text-sm bg-muted p-2 rounded break-all">
                      {urlMismatchInfo.url}
                    </p>
                    <p>
                      Did you mean to put this in the {urlMismatchInfo.detectedPlatform} URL field instead?
                    </p>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction data-testid="button-url-mismatch-ok">
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
