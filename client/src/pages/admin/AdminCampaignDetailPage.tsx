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
import { Label } from "@/components/ui/label";
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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [shippingForms, setShippingForms] = useState<Record<string, ShippingFormData>>({});
  const [approvedPage, setApprovedPage] = useState(1);
  const [showBulkSendDialog, setShowBulkSendDialog] = useState(false);
  const [showShippingSheet, setShowShippingSheet] = useState(false);
  const [editShippingApp, setEditShippingApp] = useState<ApplicationWithDetails | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const APPROVED_PAGE_SIZE = 20;
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

  const handleCsvUpload = async () => {
    if (!csvFile || !applications) return;
    
    const text = await csvFile.text();
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "CSV must have header and at least one row", variant: "destructive" });
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const emailIdx = headers.findIndex(h => h === "email");
    const courierIdx = headers.findIndex(h => h === "courier");
    const trackingNumberIdx = headers.findIndex(h => h.includes("tracking") && h.includes("number"));
    const trackingUrlIdx = headers.findIndex(h => h.includes("tracking") && h.includes("url"));

    if (emailIdx === -1) {
      toast({ title: "Invalid CSV", description: "CSV must have Email column", variant: "destructive" });
      return;
    }

    const approvedApps = applications.filter(a => a.status === "approved");
    const emailToAppId = new Map<string, string>();
    approvedApps.forEach(app => {
      if (app.influencer?.email) {
        emailToAppId.set(app.influencer.email.toLowerCase(), app.id);
      }
    });

    let matchedCount = 0;
    const newForms: Record<string, ShippingFormData> = { ...shippingForms };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const email = values[emailIdx]?.toLowerCase();
      const appId = emailToAppId.get(email);
      
      if (appId) {
        matchedCount++;
        const existing = newForms[appId] || { courier: "", trackingNumber: "", trackingUrl: "" };
        newForms[appId] = {
          courier: courierIdx !== -1 && values[courierIdx] ? values[courierIdx].toUpperCase() : existing.courier,
          trackingNumber: trackingNumberIdx !== -1 && values[trackingNumberIdx] ? values[trackingNumberIdx] : existing.trackingNumber,
          trackingUrl: trackingUrlIdx !== -1 && values[trackingUrlIdx] ? values[trackingUrlIdx] : existing.trackingUrl,
        };
      }
    }

    setShippingForms(newForms);
    setShowCsvDialog(false);
    setCsvFile(null);
    toast({ 
      title: "CSV imported", 
      description: `Matched ${matchedCount} of ${lines.length - 1} rows. Review and click Send All or individual ship buttons.` 
    });
  };

  const handleBulkSend = async () => {
    if (!applications) return;
    
    const approvedApps = applications.filter(a => a.status === "approved");
    const readyToSend = approvedApps.filter(app => {
      const form = shippingForms[app.id];
      return form?.courier && form?.trackingNumber;
    });

    if (readyToSend.length === 0) {
      toast({ title: "No items to send", description: "Please fill in courier and tracking number for at least one item", variant: "destructive" });
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let errorCount = 0;

    for (const app of readyToSend) {
      try {
        await apiRequest("POST", `/api/admin/applications/${app.id}/ship`, shippingForms[app.id]);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setBulkSending(false);
    setShowBulkSendDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
    
    if (errorCount > 0) {
      toast({ 
        title: "Partially completed", 
        description: `${successCount} shipped, ${errorCount} failed`,
        variant: "destructive"
      });
    } else {
      toast({ title: "All items shipped", description: `${successCount} items shipped successfully` });
    }
  };

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
  const allApprovedApplications = applications?.filter((a) => a.status === "approved") || [];
  const approvedTotalPages = Math.ceil(allApprovedApplications.length / APPROVED_PAGE_SIZE);
  const approvedApplications = allApprovedApplications.slice(
    (approvedPage - 1) * APPROVED_PAGE_SIZE,
    approvedPage * APPROVED_PAGE_SIZE
  );
  const rejectedApplications = applications?.filter((a) => a.status === "rejected") || [];
  const shippingApplications = applications?.filter((a) => 
    ["shipped", "delivered"].includes(a.status)
  ) || [];
  const deliveredApplications = applications?.filter((a) => a.status === "delivered") || [];
  const uploadedApplications = applications?.filter((a) => 
    ["uploaded", "completed"].includes(a.status)
  ) || [];
  
  const readyToSendCount = allApprovedApplications.filter(app => {
    const form = shippingForms[app.id];
    return form?.courier && form?.trackingNumber;
  }).length;

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
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <CardTitle>Approved Influencers ({allApprovedApplications.length})</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {readyToSendCount > 0 && (
                    <Button 
                      onClick={() => setShowBulkSendDialog(true)} 
                      data-testid="button-send-all"
                      size="sm"
                      disabled={bulkSending}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Send All ({readyToSendCount})
                    </Button>
                  )}
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
                        <TableHead>Influencer</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Shipping Status</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedApplications.map((app) => {
                        const formData = shippingForms[app.id] || { courier: "", trackingNumber: "", trackingUrl: "" };
                        const hasShippingInfo = formData.courier && formData.trackingNumber;
                        
                        return (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div>
                                  <button
                                    className="text-left hover:underline font-medium"
                                    onClick={() => setSelectedInfluencer(app.influencer || null)}
                                  >
                                    {app.influencer?.name}
                                  </button>
                                  <div className="text-sm text-muted-foreground">{app.influencer?.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {app.influencer?.tiktokHandle ? (
                                <a 
                                  href={`https://tiktok.com/@${app.influencer.tiktokHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  @{app.influencer.tiktokHandle}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {hasShippingInfo ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {app.approvedAt
                                ? format(new Date(app.approvedAt), "MMM d")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditShippingApp(app);
                                    setShowShippingSheet(true);
                                  }}
                                  data-testid={`button-edit-shipping-${app.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                {hasShippingInfo && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleShip(app.id)}
                                    disabled={shipMutation.isPending}
                                    data-testid={`button-ship-${app.id}`}
                                  >
                                    <Truck className="h-4 w-4 mr-1" />
                                    Send
                                  </Button>
                                )}
                              </div>
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
                
                {approvedTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(approvedPage - 1) * APPROVED_PAGE_SIZE + 1} - {Math.min(approvedPage * APPROVED_PAGE_SIZE, allApprovedApplications.length)} of {allApprovedApplications.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setApprovedPage(p => Math.max(1, p - 1))}
                        disabled={approvedPage === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <span className="text-sm px-2">
                        Page {approvedPage} of {approvedTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setApprovedPage(p => Math.min(approvedTotalPages, p + 1))}
                        disabled={approvedPage === approvedTotalPages}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
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
      <Dialog open={showCsvDialog} onOpenChange={(open) => {
        setShowCsvDialog(open);
        if (!open) setCsvFile(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Shipping CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with columns: Email, Courier, Tracking Number, Tracking URL. 
              Use "Download CSV" first to get the template with your influencer data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
                id="csv-upload-input"
                data-testid="input-csv-file"
              />
              <label 
                htmlFor="csv-upload-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                {csvFile ? (
                  <span className="text-sm font-medium">{csvFile.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Click to select CSV file</span>
                )}
              </label>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <p>Email (required), Courier, Tracking Number, Tracking URL</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCsvDialog(false); setCsvFile(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCsvUpload}
              disabled={!csvFile}
              data-testid="button-submit-csv"
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Confirmation Dialog */}
      <Dialog open={showBulkSendDialog} onOpenChange={setShowBulkSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Bulk Send
            </DialogTitle>
            <DialogDescription>
              You are about to send shipping notifications to {readyToSendCount} influencer{readyToSendCount !== 1 ? 's' : ''}.
              This action will email them with tracking information.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Please verify:</p>
            <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
              <li>• All courier information is correct</li>
              <li>• All tracking numbers are valid</li>
              <li>• All tracking URLs are working</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkSendDialog(false)} disabled={bulkSending}>
              Cancel
            </Button>
            <Button onClick={handleBulkSend} disabled={bulkSending} data-testid="button-confirm-bulk-send">
              {bulkSending ? "Sending..." : `Send All (${readyToSendCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Edit Sheet */}
      <Sheet open={showShippingSheet} onOpenChange={(open) => {
        setShowShippingSheet(open);
        if (!open) setEditShippingApp(null);
      }}>
        <SheetContent className="sm:max-w-md">
          {editShippingApp && (
            <>
              <SheetHeader>
                <SheetTitle>Edit Shipping Info</SheetTitle>
                <SheetDescription>
                  {editShippingApp.influencer?.name} ({editShippingApp.influencer?.email})
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Address Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Shipping Address</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        openAddressDialog(editShippingApp);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    {(() => {
                      const addressParts = getDisplayAddress(editShippingApp);
                      const phone = editShippingApp.influencer?.phone;
                      return addressParts ? (
                        <>
                          {addressParts.map((part, idx) => (
                            <div key={idx}>{part}</div>
                          ))}
                          {phone && <div className="mt-1 text-muted-foreground">{phone}</div>}
                        </>
                      ) : (
                        <span className="text-muted-foreground">No address on file</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Shipping Form */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Tracking Information</h4>
                  
                  <div className="space-y-2">
                    <Label>Courier</Label>
                    <Select
                      value={shippingForms[editShippingApp.id]?.courier || ""}
                      onValueChange={(value) => updateShippingForm(editShippingApp.id, "courier", value)}
                    >
                      <SelectTrigger data-testid="select-courier-sheet">
                        <SelectValue placeholder="Select courier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COURIER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tracking Number</Label>
                    <Input
                      placeholder="Enter tracking number..."
                      value={shippingForms[editShippingApp.id]?.trackingNumber || ""}
                      onChange={(e) => updateShippingForm(editShippingApp.id, "trackingNumber", e.target.value)}
                      data-testid="input-tracking-number-sheet"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tracking URL (optional)</Label>
                    <Input
                      placeholder="https://..."
                      value={shippingForms[editShippingApp.id]?.trackingUrl || ""}
                      onChange={(e) => updateShippingForm(editShippingApp.id, "trackingUrl", e.target.value)}
                      data-testid="input-tracking-url-sheet"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowShippingSheet(false);
                      setEditShippingApp(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleShip(editShippingApp.id);
                      setShowShippingSheet(false);
                      setEditShippingApp(null);
                    }}
                    disabled={
                      shipMutation.isPending || 
                      !shippingForms[editShippingApp.id]?.courier || 
                      !shippingForms[editShippingApp.id]?.trackingNumber
                    }
                    data-testid="button-ship-sheet"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
