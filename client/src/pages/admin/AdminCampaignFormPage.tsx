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
import { ArrowLeft, Loader2, X, Plus, AlertCircle } from "lucide-react";
import { z } from "zod";
import { useState, useEffect } from "react";
import { PlacementImageUpload } from "@/components/PlacementImageUpload";

const formSchema = insertCampaignSchema.extend({
  productName: z.string().optional(),
  requiredHashtags: z.array(z.string()).optional(),
  requiredMentions: z.array(z.string()).optional(),
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

export default function AdminCampaignFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hashtagInput, setHashtagInput] = useState("");
  const [mentionInput, setMentionInput] = useState("");
  const [dateErrorDialogOpen, setDateErrorDialogOpen] = useState(false);

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
      imageUrl: "",
      amazonUrl: "",
      guidelinesSummary: "",
      guidelinesUrl: "",
      requiredHashtags: [],
      requiredMentions: [],
      applicationDeadline: new Date().toISOString().split("T")[0] + "T23:59:00",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T23:59:00",
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
            imageUrl: campaign.imageUrl || "",
            amazonUrl: campaign.amazonUrl || "",
            guidelinesSummary: campaign.guidelinesSummary || "",
            guidelinesUrl: campaign.guidelinesUrl || "",
            requiredHashtags: campaign.requiredHashtags || [],
            requiredMentions: campaign.requiredMentions || [],
            applicationDeadline: campaign.applicationDeadline 
              ? new Date(campaign.applicationDeadline).toISOString().slice(0, 16)
              : new Date().toISOString().split("T")[0] + "T23:59",
            deadline: campaign.deadline 
              ? new Date(campaign.deadline).toISOString().slice(0, 16)
              : new Date().toISOString().split("T")[0] + "T23:59",
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

  const onSubmit = (data: FormData) => {
    const appDeadline = new Date(data.applicationDeadline);
    const uploadDeadline = new Date(data.deadline);
    
    if (appDeadline >= uploadDeadline) {
      setDateErrorDialogOpen(true);
      return;
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addHashtag = () => {
    if (!hashtagInput.trim()) return;
    const tag = hashtagInput.startsWith("#") ? hashtagInput : `#${hashtagInput}`;
    const current = form.getValues("requiredHashtags") || [];
    if (!current.includes(tag)) {
      form.setValue("requiredHashtags", [...current, tag]);
    }
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) => {
    const current = form.getValues("requiredHashtags") || [];
    form.setValue(
      "requiredHashtags",
      current.filter((t) => t !== tag)
    );
  };

  const addMention = () => {
    if (!mentionInput.trim()) return;
    const mention = mentionInput.startsWith("@") ? mentionInput : `@${mentionInput}`;
    const current = form.getValues("requiredMentions") || [];
    if (!current.includes(mention)) {
      form.setValue("requiredMentions", [...current, mention]);
    }
    setMentionInput("");
  };

  const removeMention = (mention: string) => {
    const current = form.getValues("requiredMentions") || [];
    form.setValue(
      "requiredMentions",
      current.filter((m) => m !== mention)
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          <Input type="datetime-local" {...field} data-testid="input-application-deadline" />
                        </FormControl>
                        <FormDescription>
                          Last date to apply for this campaign
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
                          <Input type="datetime-local" {...field} data-testid="input-deadline" />
                        </FormControl>
                        <FormDescription>
                          Content submission deadline
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft (Hidden)</SelectItem>
                          <SelectItem value="active">Active (Visible to Influencers)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Draft campaigns are hidden. Set to Active to show in Discover Campaigns.
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
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placement Image</FormLabel>
                      <FormControl>
                        <PlacementImageUpload
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          data-testid="input-amazon"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Content Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="guidelinesUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Guidelines URL (Notion)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://notion.so/..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-guidelines-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Link to the full campaign guidelines document
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guidelinesSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guidelines Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of content requirements (5-10 lines)..."
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
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Link href={isEditing ? `/admin/campaigns/${id}` : "/admin/campaigns"}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isPending} data-testid="button-save">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Update Campaign"
                ) : (
                  "Create Campaign"
                )}
              </Button>
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
      </div>
    </AdminLayout>
  );
}
