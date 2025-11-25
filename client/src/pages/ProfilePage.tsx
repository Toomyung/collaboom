import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updateProfileSchema, UpdateProfile } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import {
  User,
  MapPin,
  Phone,
  CreditCard,
  AtSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";

export default function ProfilePage() {
  const { isAuthenticated, influencer, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: influencer?.name || "",
      tiktokHandle: influencer?.tiktokHandle || "",
      instagramHandle: influencer?.instagramHandle || "",
      phone: influencer?.phone || "",
      addressLine1: influencer?.addressLine1 || "",
      addressLine2: influencer?.addressLine2 || "",
      city: influencer?.city || "",
      state: influencer?.state || "",
      zipCode: influencer?.zipCode || "",
      paypalEmail: influencer?.paypalEmail || "",
    },
    values: {
      name: influencer?.name || "",
      tiktokHandle: influencer?.tiktokHandle || "",
      instagramHandle: influencer?.instagramHandle || "",
      phone: influencer?.phone || "",
      addressLine1: influencer?.addressLine1 || "",
      addressLine2: influencer?.addressLine2 || "",
      city: influencer?.city || "",
      state: influencer?.state || "",
      zipCode: influencer?.zipCode || "",
      paypalEmail: influencer?.paypalEmail || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const res = await apiRequest("PUT", "/api/me", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const onSubmit = (data: UpdateProfile) => {
    updateMutation.mutate(data);
  };

  // Calculate profile completion percentage
  const requiredFields = [
    "name",
    "tiktokHandle",
    "phone",
    "addressLine1",
    "city",
    "state",
    "zipCode",
    "paypalEmail",
  ];
  const completedFields = requiredFields.filter(
    (field) => influencer?.[field as keyof typeof influencer]
  ).length;
  const completionPercent = Math.round((completedFields / requiredFields.length) * 100);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and shipping details
          </p>
        </div>

        {/* Profile Completion Card */}
        {!influencer?.profileCompleted && (
          <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Complete your profile to apply for campaigns</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {completionPercent}% complete - Fill in the required fields below
              </p>
            </CardContent>
          </Card>
        )}

        {influencer?.profileCompleted && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-600">Profile complete!</span>
              <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
                Ready to apply
              </Badge>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Your basic account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tiktokHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiTiktok className="h-4 w-4" />
                          TikTok Handle *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="@yourtiktok" {...field} data-testid="input-tiktok" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          This must match your TikTok account
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagramHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiInstagram className="h-4 w-4" />
                          Instagram Handle
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@yourinstagram"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-instagram"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
                <CardDescription>Where we'll send your products (US only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Street address"
                          {...field}
                          data-testid="input-address1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apt, suite, unit (optional)"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-address2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP" {...field} data-testid="input-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  Country: <span className="font-medium">United States</span>
                  <p className="text-xs mt-1">
                    Collaboom currently only ships to US addresses
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
                <CardDescription>For campaigns with monetary rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="paypalEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PayPal Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@paypal.email"
                          {...field}
                          data-testid="input-paypal"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        We use PayPal to send campaign rewards
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}
