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
import { Campaign, insertCampaignSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, X, Plus } from "lucide-react";
import { z } from "zod";
import { useState } from "react";

const formSchema = insertCampaignSchema.extend({
  requiredHashtags: z.array(z.string()).optional(),
  requiredMentions: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AdminCampaignFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = id && id !== "new";
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hashtagInput, setHashtagInput] = useState("");
  const [mentionInput, setMentionInput] = useState("");

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/admin/campaigns", id],
    enabled: isAuthenticated && isAdmin && isEditing,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      brandName: "",
      category: "beauty",
      rewardType: "gift",
      inventory: 50,
      imageUrl: "",
      amazonUrl: "",
      guidelinesSummary: "",
      guidelinesUrl: "",
      requiredHashtags: [],
      requiredMentions: [],
      deadline: new Date().toISOString().split("T")[0] + "T23:59:00",
      status: "draft",
    },
    values: campaign
      ? {
          name: campaign.name,
          brandName: campaign.brandName,
          category: campaign.category,
          rewardType: campaign.rewardType,
          inventory: campaign.inventory,
          imageUrl: campaign.imageUrl || "",
          amazonUrl: campaign.amazonUrl || "",
          guidelinesSummary: campaign.guidelinesSummary || "",
          guidelinesUrl: campaign.guidelinesUrl || "",
          requiredHashtags: campaign.requiredHashtags || [],
          requiredMentions: campaign.requiredMentions || [],
          deadline: new Date(campaign.deadline).toISOString().slice(0, 16),
          status: campaign.status,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/admin/campaigns", data);
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
      const res = await apiRequest("PUT", `/api/admin/campaigns/${id}`, data);
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-reward">
                              <SelectValue placeholder="Select reward" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gift">Gift Only</SelectItem>
                            <SelectItem value="20usd">Gift + $20</SelectItem>
                            <SelectItem value="50usd">Gift + $50</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline (PST) *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-deadline" />
                        </FormControl>
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
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <FormLabel>Campaign Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-image"
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
      </div>
    </AdminLayout>
  );
}
