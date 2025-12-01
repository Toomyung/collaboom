import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, Redirect } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Campaign, ApplicationWithDetails, Influencer } from "@shared/schema";
import { SiTiktok, SiInstagram } from "react-icons/si";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Users,
  Truck,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Package,
  Clock,
  Star,
  AlertTriangle,
  UploadCloud,
  Download,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShippingFormData {
  courier: string;
  trackingNumber: string;
  trackingUrl: string;
}

interface AddressFormData {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const COURIER_OPTIONS = [
  { value: "USPS", label: "USPS" },
  { value: "UPS", label: "UPS" },
  { value: "DHL", label: "DHL" },
  { value: "AMAZON", label: "Amazon" },
  { value: "FEDEX", label: "FedEx" },
];

export default function AdminCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [shippingForms, setShippingForms] = useState<Record<string, ShippingFormData>>({});
  const [editingAddressApp, setEditingAddressApp] = useState<ApplicationWithDetails | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
  });

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/admin/campaigns", id],
    enabled: isAuthenticated && isAdmin && !!id,
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/admin/campaigns", id, "applications"],
    enabled: isAuthenticated && isAdmin && !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Application approved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Application rejected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (applicationIds: string[]) => {
      await apiRequest("POST", `/api/admin/applications/bulk-approve`, { applicationIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      setSelectedApplications(new Set());
      toast({ title: "Applications approved" });
    },
    onError: (error: Error) => {
      toast({ title: "Bulk approve failed", description: error.message, variant: "destructive" });
    },
  });

  const uploadCsvMutation = useMutation({
    mutationFn: async (csvData: string) => {
      await apiRequest("POST", `/api/admin/campaigns/${id}/shipping/upload-csv`, { csvData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      setShowCsvDialog(false);
      setCsvContent("");
      toast({ title: "Shipping data uploaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const markUploadedMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/uploads/${applicationId}/mark-uploaded`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Marked as uploaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const markMissedMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/uploads/${applicationId}/mark-missed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Marked as missed, penalty applied" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const shipMutation = useMutation({
    mutationFn: async ({ applicationId, data }: { applicationId: string; data: ShippingFormData }) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/ship`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      setShippingForms((prev) => {
        const updated = { ...prev };
        delete updated[variables.applicationId];
        return updated;
      });
      toast({ title: "Shipping info saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save shipping info", description: error.message, variant: "destructive" });
    },
  });

  const updateShippingForm = (applicationId: string, field: keyof ShippingFormData, value: string) => {
    setShippingForms((prev) => {
      const existing = prev[applicationId] || { courier: "", trackingNumber: "", trackingUrl: "" };
      return {
        ...prev,
        [applicationId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleShip = (applicationId: string) => {
    const formData = shippingForms[applicationId];
    if (!formData?.courier || !formData?.trackingNumber) {
      toast({ title: "Please fill in courier and tracking number", variant: "destructive" });
      return;
    }
    shipMutation.mutate({ applicationId, data: formData });
  };

  const updateAddressMutation = useMutation({
    mutationFn: async ({ applicationId, data }: { applicationId: string; data: AddressFormData }) => {
      await apiRequest("PATCH", `/api/admin/applications/${applicationId}/shipping-address`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      setEditingAddressApp(null);
      toast({ title: "Address updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update address", description: error.message, variant: "destructive" });
    },
  });

  const openAddressDialog = (app: ApplicationWithDetails) => {
    const inf = app.influencer;
    setAddressForm({
      addressLine1: app.shippingAddressLine1 || inf?.addressLine1 || "",
      addressLine2: app.shippingAddressLine2 || inf?.addressLine2 || "",
      city: app.shippingCity || inf?.city || "",
      state: app.shippingState || inf?.state || "",
      zipCode: app.shippingZipCode || inf?.zipCode || "",
      country: app.shippingCountry || inf?.country || "United States",
    });
    setEditingAddressApp(app);
  };

  const handleSaveAddress = () => {
    if (!editingAddressApp) return;
    updateAddressMutation.mutate({ applicationId: editingAddressApp.id, data: addressForm });
  };

  const handleDownloadCsv = () => {
    window.open(`/api/admin/campaigns/${id}/export-csv`, "_blank");
  };

  const getDisplayAddress = (app: ApplicationWithDetails) => {
    const inf = app.influencer;
    const line1 = app.shippingAddressLine1 || inf?.addressLine1 || "";
    const line2 = app.shippingAddressLine2 || inf?.addressLine2 || "";
    const city = app.shippingCity || inf?.city || "";
    const state = app.shippingState || inf?.state || "";
    const zipCode = app.shippingZipCode || inf?.zipCode || "";
    
    if (!line1) return null;
    
    const parts = [line1];
    if (line2) parts.push(line2);
    parts.push(`${city}, ${state} ${zipCode}`);
    
    return parts;
  };

  if (authLoading || campaignLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  if (!campaign) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Campaign Not Found</h1>
          <Link href="/admin/campaigns">
            <Button>Back to Campaigns</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const pendingApplications = applications?.filter((a) => a.status === "pending") || [];
  const approvedApplications = applications?.filter((a) => a.status === "approved") || [];
  const rejectedApplications = applications?.filter((a) => a.status === "rejected") || [];
  const shippingApplications = applications?.filter((a) => 
    ["shipped", "delivered"].includes(a.status)
  ) || [];
  const deliveredApplications = applications?.filter((a) => a.status === "delivered") || [];
  const uploadedApplications = applications?.filter((a) => 
    ["uploaded", "completed"].includes(a.status)
  ) || [];

  const toggleApplication = (appId: string) => {
    const newSelected = new Set(selectedApplications);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApplications(newSelected);
  };

  const toggleAll = () => {
    if (selectedApplications.size === pendingApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(pendingApplications.map((a) => a.id)));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href="/admin/campaigns">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <Badge
                  className={cn(
                    campaign.status === "active"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-gray-500/10 text-gray-600"
                  )}
                >
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{campaign.brandName}</p>
            </div>
          </div>
          <Link href={`/admin/campaigns/${id}/edit`}>
            <Button variant="outline" data-testid="button-edit">
              <Edit className="h-4 w-4 mr-2" />
              Edit Campaign
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {campaign.approvedCount ?? 0}/{campaign.inventory}
                </p>
                <p className="text-xs text-muted-foreground">Slots Filled</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{pendingApplications.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {approvedApplications.length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{shippingApplications.length}</p>
                <p className="text-xs text-muted-foreground">Shipping</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="applicants" data-testid="tab-applicants">
              <Users className="h-4 w-4 mr-2" />
              Applicants
              {pendingApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approved
              {approvedApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {approvedApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              <XCircle className="h-4 w-4 mr-2" />
              Rejected
              {rejectedApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {rejectedApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shipping" data-testid="tab-shipping">
              <Truck className="h-4 w-4 mr-2" />
              Shipping
              {shippingApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {shippingApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="uploads" data-testid="tab-uploads">
              <Upload className="h-4 w-4 mr-2" />
              Uploads
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium capitalize">{campaign.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reward</p>
                    <p className="font-medium">
                      {campaign.rewardType === "paid" && campaign.rewardAmount
                        ? `Gift + $${campaign.rewardAmount} Reward`
                        : campaign.rewardType === "gift"
                        ? "Gift Only"
                        : campaign.rewardType.replace("usd", " USD")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Application Deadline</p>
                    <p className="font-medium">
                      {campaign.applicationDeadline 
                        ? format(new Date(campaign.applicationDeadline), "MMMM d, yyyy")
                        : format(new Date(campaign.deadline), "MMMM d, yyyy")} (PST)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Upload Deadline</p>
                    <p className="font-medium">
                      {format(new Date(campaign.deadline), "MMMM d, yyyy")} (PST)
                    </p>
                  </div>
                  {campaign.guidelinesSummary && (
                    <div>
                      <p className="text-sm text-muted-foreground">Guidelines Summary</p>
                      <p className="text-sm">{campaign.guidelinesSummary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.requiredHashtags && campaign.requiredHashtags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Hashtags</p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.requiredHashtags.map((tag, i) => (
                          <Badge key={i} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {campaign.requiredMentions && campaign.requiredMentions.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Mentions</p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.requiredMentions.map((mention, i) => (
                          <Badge key={i} variant="secondary">
                            {mention}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Applicants Tab */}
          <TabsContent value="applicants" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Applicants</CardTitle>
                {selectedApplications.size > 0 && (
                  <Button
                    onClick={() => bulkApproveMutation.mutate(Array.from(selectedApplications))}
                    disabled={bulkApproveMutation.isPending}
                    data-testid="button-bulk-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Selected ({selectedApplications.size})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : pendingApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedApplications.size === pendingApplications.length}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Influencer</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedApplications.has(app.id)}
                              onCheckedChange={() => toggleApplication(app.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <button
                                type="button"
                                className="font-medium text-primary hover:underline cursor-pointer text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (app.influencer) {
                                    setSelectedInfluencer(app.influencer);
                                  }
                                }}
                                data-testid={`influencer-name-${app.id}`}
                              >
                                {app.influencer?.name || "Unknown"}
                              </button>
                              <p className="text-xs text-muted-foreground">
                                {app.influencer?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {app.influencer?.tiktokHandle ? (
                              <a
                                href={`https://www.tiktok.com/@${app.influencer.tiktokHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`tiktok-link-${app.id}`}
                              >
                                @{app.influencer.tiktokHandle}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{app.influencer?.score ?? 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {app.appliedAt
                              ? format(new Date(app.appliedAt), "MMM d, h:mm a")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(app.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`approve-${app.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectMutation.mutate(app.id)}
                                disabled={rejectMutation.isPending}
                                data-testid={`reject-${app.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pending applications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Approved Influencers</CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={handleDownloadCsv} data-testid="button-download-csv" variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button onClick={() => setShowCsvDialog(true)} data-testid="button-upload-csv" variant="outline" size="sm">
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {approvedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Influencer</TableHead>
                        <TableHead className="w-[200px]">Shipping Info</TableHead>
                        <TableHead className="w-[90px]">Approved</TableHead>
                        <TableHead className="w-[110px]">Courier</TableHead>
                        <TableHead className="w-[130px]">Tracking #</TableHead>
                        <TableHead className="w-[180px]">Tracking URL</TableHead>
                        <TableHead className="w-[70px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedApplications.map((app) => {
                        const formData = shippingForms[app.id] || { courier: "", trackingNumber: "", trackingUrl: "" };
                        return (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">
                              <button
                                className="text-left hover:underline text-sm"
                                onClick={() => setSelectedInfluencer(app.influencer || null)}
                              >
                                {app.influencer?.name}
                              </button>
                              <div className="text-xs text-muted-foreground">{app.influencer?.email}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {(() => {
                                const addressParts = getDisplayAddress(app);
                                const phone = app.influencer?.phone;
                                return (
                                  <div className="flex items-start gap-1">
                                    <div className="flex-1">
                                      {addressParts ? (
                                        addressParts.map((part, idx) => (
                                          <div key={idx} className={idx === 0 ? "text-foreground" : "text-muted-foreground"}>
                                            {part}
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-muted-foreground">No address</span>
                                      )}
                                      {phone && (
                                        <div className="text-muted-foreground mt-0.5">{phone}</div>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 shrink-0"
                                      onClick={() => openAddressDialog(app)}
                                      data-testid={`button-edit-address-${app.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {app.approvedAt
                                ? format(new Date(app.approvedAt), "MMM d")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={formData.courier}
                                onValueChange={(value) => updateShippingForm(app.id, "courier", value)}
                              >
                                <SelectTrigger className="h-8 text-sm" data-testid={`select-courier-${app.id}`}>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COURIER_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Tracking #"
                                className="h-8 text-sm"
                                value={formData.trackingNumber}
                                onChange={(e) => updateShippingForm(app.id, "trackingNumber", e.target.value)}
                                data-testid={`input-tracking-${app.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="https://..."
                                className="h-8 text-sm"
                                value={formData.trackingUrl}
                                onChange={(e) => updateShippingForm(app.id, "trackingUrl", e.target.value)}
                                data-testid={`input-tracking-url-${app.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleShip(app.id)}
                                disabled={shipMutation.isPending || !formData.courier || !formData.trackingNumber}
                                data-testid={`button-ship-${app.id}`}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No approved influencers yet</p>
                    <p className="text-sm mt-1">Approve applicants from the Applicants tab</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejected Tab */}
          <TabsContent value="rejected" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {rejectedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Applied At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejectedApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">
                            <button
                              className="text-left hover:underline"
                              onClick={() => setSelectedInfluencer(app.influencer || null)}
                            >
                              {app.influencer?.name}
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {app.influencer?.email}
                          </TableCell>
                          <TableCell>
                            {app.influencer?.tiktokHandle && (
                              <a
                                href={`https://www.tiktok.com/@${app.influencer.tiktokHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                              >
                                <SiTiktok className="h-3 w-3" />
                                @{app.influencer.tiktokHandle}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{app.influencer?.score ?? 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {app.appliedAt
                              ? format(new Date(app.appliedAt), "MMM d, h:mm a")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No rejected applications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                {shippingApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Courier</TableHead>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Tracking URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Shipped</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippingApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">
                            <div>{app.influencer?.name}</div>
                            <div className="text-xs text-muted-foreground">{app.influencer?.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{app.shipping?.courier || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {app.shipping?.trackingNumber || "-"}
                          </TableCell>
                          <TableCell>
                            {app.shipping?.trackingUrl ? (
                              <a
                                href={app.shipping.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline text-sm"
                              >
                                Track Package
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                app.status === "shipped"
                                  ? "bg-blue-500/10 text-blue-600"
                                  : app.status === "delivered"
                                  ? "bg-purple-500/10 text-purple-600"
                                  : "bg-yellow-500/10 text-yellow-600"
                              )}
                            >
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {app.shippedAt
                              ? format(new Date(app.shippedAt), "MMM d")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No shipping in progress</p>
                    <p className="text-sm mt-1">Enter shipping info from the Approved tab</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Uploads Tab */}
          <TabsContent value="uploads" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Verification</CardTitle>
              </CardHeader>
              <CardContent>
                {deliveredApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Influencer</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveredApplications.map((app) => {
                        const deadline = new Date(campaign.deadline);
                        const isOverdue = deadline < new Date();
                        return (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">
                              {app.influencer?.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              @{app.influencer?.tiktokHandle}
                            </TableCell>
                            <TableCell>
                              {app.deliveredAt
                                ? format(new Date(app.deliveredAt), "MMM d")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <span className={cn(isOverdue && "text-red-500")}>
                                {format(deadline, "MMM d")}
                              </span>
                              {isOverdue && (
                                <AlertTriangle className="inline h-4 w-4 ml-1 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Pending Verification</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => markUploadedMutation.mutate(app.id)}
                                  disabled={markUploadedMutation.isPending}
                                  data-testid={`mark-uploaded-${app.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Verified
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => markMissedMutation.mutate(app.id)}
                                  disabled={markMissedMutation.isPending}
                                  data-testid={`mark-missed-${app.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Missed
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deliveries awaiting verification</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* CSV Upload Dialog */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Shipping CSV</DialogTitle>
            <DialogDescription>
              Paste CSV data with columns: email, tracking_number, courier, shipped_date, delivered_date (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="email,tracking_number,courier,shipped_date,delivered_date
user@example.com,1Z999AA10123456784,UPS,2024-01-15,"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={10}
            className="font-mono text-sm"
            data-testid="textarea-csv"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadCsvMutation.mutate(csvContent)}
              disabled={!csvContent.trim() || uploadCsvMutation.isPending}
              data-testid="button-submit-csv"
            >
              {uploadCsvMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Influencer Detail Sheet */}
      <Sheet open={!!selectedInfluencer} onOpenChange={(open) => !open && setSelectedInfluencer(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedInfluencer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedInfluencer.name || "Influencer Details"}</SheetTitle>
                <SheetDescription>{selectedInfluencer.email}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Social Handles */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Social Profiles</h3>
                  <div className="space-y-2">
                    {selectedInfluencer.tiktokHandle && (
                      <a
                        href={`https://www.tiktok.com/@${selectedInfluencer.tiktokHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        data-testid="drawer-tiktok-link"
                      >
                        <SiTiktok className="h-4 w-4" />
                        @{selectedInfluencer.tiktokHandle}
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {selectedInfluencer.instagramHandle && (
                      <a
                        href={`https://www.instagram.com/${selectedInfluencer.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        data-testid="drawer-instagram-link"
                      >
                        <SiInstagram className="h-4 w-4" />
                        @{selectedInfluencer.instagramHandle}
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-muted-foreground">Score</p>
                        <Star className="h-4 w-4 text-yellow-500" />
                      </div>
                      <p className="text-2xl font-bold">{selectedInfluencer.score ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-muted-foreground">Penalty</p>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                      <p className="text-2xl font-bold">{selectedInfluencer.penalty ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Contact</h3>
                  <div className="text-sm space-y-1">
                    <p>Phone: {selectedInfluencer.phone || "-"}</p>
                    <p>PayPal: {selectedInfluencer.paypalEmail || "-"}</p>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Shipping Address</h3>
                  <p className="text-sm">
                    {selectedInfluencer.addressLine1 || "No address"}
                    {selectedInfluencer.addressLine2 && (
                      <>
                        <br />
                        {selectedInfluencer.addressLine2}
                      </>
                    )}
                    {selectedInfluencer.city && (
                      <>
                        <br />
                        {selectedInfluencer.city}, {selectedInfluencer.state} {selectedInfluencer.zipCode}
                      </>
                    )}
                  </p>
                </div>

                {/* View Full Profile Link */}
                <Link href="/admin/influencers">
                  <Button variant="outline" className="w-full" data-testid="button-view-all-influencers">
                    View All Influencers
                  </Button>
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Address Edit Dialog */}
      <Dialog open={!!editingAddressApp} onOpenChange={(open) => !open && setEditingAddressApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shipping Address</DialogTitle>
            <DialogDescription>
              Update the shipping address for {editingAddressApp?.influencer?.name || "this influencer"}.
              This will not change the influencer's original address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Address Line 1</label>
              <Input
                value={addressForm.addressLine1}
                onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                placeholder="Street address"
                data-testid="input-address-line1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address Line 2</label>
              <Input
                value={addressForm.addressLine2}
                onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                placeholder="Apt, suite, etc. (optional)"
                data-testid="input-address-line2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="City"
                  data-testid="input-city"
                />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  placeholder="State"
                  data-testid="input-state"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">ZIP Code</label>
                <Input
                  value={addressForm.zipCode}
                  onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                  placeholder="ZIP Code"
                  data-testid="input-zipcode"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  placeholder="Country"
                  data-testid="input-country"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAddressApp(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAddress}
              disabled={updateAddressMutation.isPending}
              data-testid="button-save-address"
            >
              {updateAddressMutation.isPending ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
