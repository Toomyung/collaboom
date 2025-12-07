import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateProfileSchema, UpdateProfile } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect, useLocation } from "wouter";
import {
  User,
  MapPin,
  Phone,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  Pencil,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiPaypal } from "react-icons/si";
import { PointsAwardPopup } from "@/components/PointsAwardPopup";

const US_STATES = [
  { value: "AL", label: "AL - Alabama" },
  { value: "AK", label: "AK - Alaska" },
  { value: "AZ", label: "AZ - Arizona" },
  { value: "AR", label: "AR - Arkansas" },
  { value: "CA", label: "CA - California" },
  { value: "CO", label: "CO - Colorado" },
  { value: "CT", label: "CT - Connecticut" },
  { value: "DE", label: "DE - Delaware" },
  { value: "FL", label: "FL - Florida" },
  { value: "GA", label: "GA - Georgia" },
  { value: "HI", label: "HI - Hawaii" },
  { value: "ID", label: "ID - Idaho" },
  { value: "IL", label: "IL - Illinois" },
  { value: "IN", label: "IN - Indiana" },
  { value: "IA", label: "IA - Iowa" },
  { value: "KS", label: "KS - Kansas" },
  { value: "KY", label: "KY - Kentucky" },
  { value: "LA", label: "LA - Louisiana" },
  { value: "ME", label: "ME - Maine" },
  { value: "MD", label: "MD - Maryland" },
  { value: "MA", label: "MA - Massachusetts" },
  { value: "MI", label: "MI - Michigan" },
  { value: "MN", label: "MN - Minnesota" },
  { value: "MS", label: "MS - Mississippi" },
  { value: "MO", label: "MO - Missouri" },
  { value: "MT", label: "MT - Montana" },
  { value: "NE", label: "NE - Nebraska" },
  { value: "NV", label: "NV - Nevada" },
  { value: "NH", label: "NH - New Hampshire" },
  { value: "NJ", label: "NJ - New Jersey" },
  { value: "NM", label: "NM - New Mexico" },
  { value: "NY", label: "NY - New York" },
  { value: "NC", label: "NC - North Carolina" },
  { value: "ND", label: "ND - North Dakota" },
  { value: "OH", label: "OH - Ohio" },
  { value: "OK", label: "OK - Oklahoma" },
  { value: "OR", label: "OR - Oregon" },
  { value: "PA", label: "PA - Pennsylvania" },
  { value: "RI", label: "RI - Rhode Island" },
  { value: "SC", label: "SC - South Carolina" },
  { value: "SD", label: "SD - South Dakota" },
  { value: "TN", label: "TN - Tennessee" },
  { value: "TX", label: "TX - Texas" },
  { value: "UT", label: "UT - Utah" },
  { value: "VT", label: "VT - Vermont" },
  { value: "VA", label: "VA - Virginia" },
  { value: "WA", label: "WA - Washington" },
  { value: "WV", label: "WV - West Virginia" },
  { value: "WI", label: "WI - Wisconsin" },
  { value: "WY", label: "WY - Wyoming" },
  { value: "DC", label: "DC - Washington D.C." },
];

export default function ProfilePage() {
  const { isAuthenticated, influencer, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pointsPopup, setPointsPopup] = useState<{ points: number; reason: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  
  const isProfileLocked = Boolean(influencer?.profileCompleted) && !isEditing;

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: influencer?.firstName || "",
      lastName: influencer?.lastName || "",
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
      firstName: influencer?.firstName || "",
      lastName: influencer?.lastName || "",
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
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Update failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
      
      if (data.pointsAwarded && data.pointsAwarded > 0) {
        setPointsPopup({ points: data.pointsAwarded, reason: "address_completion" });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been saved successfully. Redirecting...",
        });
        setTimeout(() => {
          setLocation("/dashboard");
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditClick = () => {
    setShowEditConfirmDialog(true);
  };

  const handleConfirmEdit = () => {
    setShowEditConfirmDialog(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const handlePointsPopupClose = () => {
    setPointsPopup(null);
    toast({
      title: "Profile updated",
      description: "Your profile has been saved successfully. Redirecting...",
    });
    setTimeout(() => {
      setLocation("/dashboard");
    }, 1500);
  };

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
    "firstName",
    "lastName",
    "tiktokHandle",
    "phone",
    "addressLine1",
    "city",
    "state",
    "zipCode",
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
              <div className="flex flex-col">
                <span className="font-medium text-green-600">Profile complete!</span>
                {isProfileLocked && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Your information is locked. Click "Edit Information" below to make changes.
                  </span>
                )}
              </div>
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="First name" 
                            {...field} 
                            disabled={isProfileLocked}
                            className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            data-testid="input-first-name" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Last name" 
                            {...field} 
                            disabled={isProfileLocked}
                            className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            data-testid="input-last-name" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          <Input 
                            placeholder="@yourtiktok" 
                            {...field} 
                            disabled={isProfileLocked}
                            className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            data-testid="input-tiktok" 
                          />
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
                            disabled={isProfileLocked}
                            className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            data-testid="input-instagram"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Optional, but helps brands understand your reach. Add it if you have one!
                        </FormDescription>
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
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={isProfileLocked}
                          className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                          data-testid="input-phone"
                        />
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
                          disabled={isProfileLocked}
                          className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
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
                          disabled={isProfileLocked}
                          className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
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
                          <Input 
                            placeholder="City" 
                            {...field} 
                            disabled={isProfileLocked}
                            className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            data-testid="input-city" 
                          />
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                          disabled={isProfileLocked}
                        >
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-state"
                              className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            >
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Input 
                            placeholder="ZIP" 
                            {...field} 
                            disabled={isProfileLocked}
                            className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                            data-testid="input-zip" 
                          />
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
                <CardDescription>For paid campaigns (optional for now)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <SiPaypal className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-foreground">About Paid Campaigns</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Some campaigns offer cash rewards in addition to free products. Payments are processed via PayPal. 
                    You can skip this for now, but you'll need to add your PayPal email to receive paid campaign rewards.
                    Don't have PayPal? You can easily create a free account at paypal.com.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="paypalEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <SiPaypal className="h-4 w-4" />
                        PayPal Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@paypal.email"
                          {...field}
                          disabled={isProfileLocked}
                          className={isProfileLocked ? "bg-muted text-muted-foreground" : ""}
                          data-testid="input-paypal"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The email address linked to your PayPal account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit/Edit Buttons */}
            <div className="flex justify-end gap-3">
              {isProfileLocked ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={handleEditClick}
                  data-testid="button-edit-profile"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Information
                </Button>
              ) : influencer?.profileCompleted && isEditing ? (
                <>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={handleCancelEdit}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
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
                      "Save Changes"
                    )}
                  </Button>
                </>
              ) : (
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
              )}
            </div>
          </form>
        </Form>
      </div>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={showEditConfirmDialog} onOpenChange={setShowEditConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Important: Shipping Address Notice
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              <p>
                Collaboom is a product seeding platform where <strong>real products are shipped to your address</strong>.
              </p>
              <p>
                Your shipping address is critical for receiving campaign products. Please only update your information if:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>You have moved to a new address</li>
                <li>There was an error in your original entry</li>
                <li>You must change your address for another important reason</li>
              </ul>
              <p className="font-medium">
                Do you need to update your information?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-edit-dialog">
              No, Keep Current Info
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit} data-testid="button-confirm-edit">
              Yes, I Need to Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PointsAwardPopup
        points={pointsPopup?.points || 0}
        reason={pointsPopup?.reason || ""}
        open={pointsPopup !== null}
        onClose={handlePointsPopupClose}
      />
    </MainLayout>
  );
}
