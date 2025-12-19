import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, Redirect } from "wouter";
import * as XLSX from "xlsx";
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
import { useCampaignSocket } from "@/lib/socket";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Campaign, ApplicationWithDetails, Application } from "@shared/schema";
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
  AlertCircle,
  UploadCloud,
  Download,
  RotateCcw,
  MessageSquare,
  Link2,
  Video,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationSheet } from "@/components/ConversationSheet";
import { InfluencerDetailSheet } from "@/components/admin/InfluencerDetailSheet";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";

interface ShippingFormData {
  courier: string;
  trackingNumber: string;
  trackingUrl: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}


export default function AdminCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  useCampaignSocket(id);
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [contentUrlForms, setContentUrlForms] = useState<Record<string, string>>({});
  const [editingContentUrl, setEditingContentUrl] = useState<Set<string>>(new Set());
  const [pointsForms, setPointsForms] = useState<Record<string, number>>({});
  const [shippingForms, setShippingForms] = useState<Record<string, ShippingFormData>>({});
  const [reimbursementForms, setReimbursementForms] = useState<Record<string, { amount: number; paypalTransactionId: string }>>({});
  const [approvedPage, setApprovedPage] = useState(1);
  const [showBulkSendDialog, setShowBulkSendDialog] = useState(false);
  // Product Cost Covered approval dialog
  const [approveWithPaymentDialog, setApproveWithPaymentDialog] = useState<{
    applicationId: string;
    influencerName: string;
    paypalEmail: string;
    productCost: number;
  } | null>(null);
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [conversationApp, setConversationApp] = useState<{ id: string; influencerName: string } | null>(null);
  const [pendingMissedAppId, setPendingMissedAppId] = useState<string | null>(null);
  const APPROVED_PAGE_SIZE = 20;

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/admin/campaigns", id],
    enabled: isAuthenticated && isAdmin && !!id,
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/admin/campaigns", id, "applications"],
    enabled: isAuthenticated && isAdmin && !!id,
  });

  // Get all issues to show conversation counts
  const { data: allIssues } = useQuery<{ applicationId: string; status: string }[]>({
    queryKey: ["/api/admin/issues"],
    enabled: isAuthenticated && isAdmin,
  });

  // Helper to get issue counts for an application
  const getIssueCount = (applicationId: string) => {
    if (!allIssues) return { total: 0, open: 0 };
    const appIssues = allIssues.filter(i => i.applicationId === applicationId);
    return {
      total: appIssues.length,
      open: appIssues.filter(i => i.status === "open").length,
    };
  };

  const approveMutation = useMutation({
    mutationFn: async ({ applicationId, productCostPaypalTransactionId, productCostAmount }: { 
      applicationId: string; 
      productCostPaypalTransactionId?: string;
      productCostAmount?: number;
    }) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/approve`, {
        productCostPaypalTransactionId,
        productCostAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Application approved" });
      setApproveWithPaymentDialog(null);
      setPaymentTransactionId("");
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

  const markDeliveredMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/delivered`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Marked as delivered" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark as delivered", description: error.message, variant: "destructive" });
    },
  });

  const undoDeliveredMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/undo-delivered`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Reverted to shipped" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to undo", description: error.message, variant: "destructive" });
    },
  });

  const invalidateInfluencerQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/admin/influencers');
      }
    });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
  };

  const saveContentUrlMutation = useMutation({
    mutationFn: async ({ applicationId, contentUrl }: { applicationId: string; contentUrl: string }) => {
      await apiRequest("PATCH", `/api/admin/applications/${applicationId}/content-url`, { contentUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Video link saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save video link", description: error.message, variant: "destructive" });
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

  const handleFileUpload = async () => {
    if (!csvFile || !applications) return;
    
    const fileName = csvFile.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    let rows: string[][] = [];
    
    try {
      if (isXlsx) {
        // Parse Excel file
        const arrayBuffer = await csvFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });
        rows = jsonData.filter(row => row.some(cell => cell && String(cell).trim()));
      } else {
        // Parse CSV file
        let text = await csvFile.text();
        
        // Remove BOM (Byte Order Mark) that Excel adds
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        if (text.startsWith('\uFEFF')) {
          text = text.slice(1);
        }
        
        // Normalize line endings (Excel uses \r\n)
        text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        
        const lines = text.split("\n").map(line => line.trim()).filter(line => line);
        
        // Detect delimiter (Excel in some locales uses semicolons)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
        
        rows = lines.map(line => line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, "")));
      }
    } catch (error) {
      toast({ title: "Failed to read file", description: "Please make sure the file is a valid CSV or Excel file", variant: "destructive" });
      return;
    }
    
    if (rows.length < 2) {
      toast({ title: "Invalid file", description: "File must have header and at least one row", variant: "destructive" });
      return;
    }

    const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/['"]/g, ""));
    const emailIdx = headers.findIndex(h => h === "email");
    const courierIdx = headers.findIndex(h => h === "courier");
    const trackingNumberIdx = headers.findIndex(h => h.includes("tracking") && (h.includes("number") || h.includes("#")));
    const trackingUrlIdx = headers.findIndex(h => h.includes("tracking") && h.includes("url"));

    if (emailIdx === -1) {
      toast({ 
        title: "Invalid file format", 
        description: `Email column not found. Found columns: ${headers.join(", ")}`, 
        variant: "destructive" 
      });
      return;
    }

    const approvedApps = applications.filter(a => a.status === "approved");
    const emailToApp = new Map<string, ApplicationWithDetails>();
    approvedApps.forEach(app => {
      if (app.influencer?.email) {
        emailToApp.set(app.influencer.email.toLowerCase(), app);
      }
    });

    let matchedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const unmatchedEmails: string[] = [];
    
    const newForms: Record<string, ShippingFormData> = {};
    
    // SAFETY: Preserve ALL existing form data first
    Object.entries(shippingForms).forEach(([appId, form]) => {
      newForms[appId] = { ...form };
    });

    const totalDataRows = rows.length - 1;
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].map(v => String(v).trim());
      const email = values[emailIdx]?.toLowerCase();
      
      if (!email) {
        skippedCount++;
        continue;
      }
      
      const app = emailToApp.get(email);
      
      if (app) {
        matchedCount++;
        
        // SAFETY: Always get phone/address from application/influencer data, NEVER from file
        // Only import these 3 shipping fields: courier, tracking number, tracking URL
        const existingOrDefault = newForms[app.id] || getFormDataFromApp(app);
        
        // Extract values, but ONLY if they are non-empty in the file
        const newCourier = courierIdx !== -1 && values[courierIdx] ? values[courierIdx].toUpperCase() : "";
        const newTrackingNumber = trackingNumberIdx !== -1 && values[trackingNumberIdx] ? values[trackingNumberIdx] : "";
        const newTrackingUrl = trackingUrlIdx !== -1 && values[trackingUrlIdx] ? values[trackingUrlIdx] : "";
        
        // Only update if there's actual data to import (don't overwrite with empty)
        const hasNewData = newCourier || newTrackingNumber || newTrackingUrl;
        
        if (hasNewData) {
          updatedCount++;
          newForms[app.id] = {
            ...existingOrDefault,
            // ONLY update these 3 fields, preserve phone and all address fields
            courier: newCourier || existingOrDefault.courier,
            trackingNumber: newTrackingNumber || existingOrDefault.trackingNumber,
            trackingUrl: newTrackingUrl || existingOrDefault.trackingUrl,
          };
        }
      } else {
        // Track unmatched emails for debugging
        if (unmatchedEmails.length < 5) {
          unmatchedEmails.push(email);
        }
      }
    }

    // SAFETY: Only update state if we successfully processed the file
    setShippingForms(newForms);
    setShowCsvDialog(false);
    setCsvFile(null);
    
    // Provide detailed feedback
    const unmatchedCount = totalDataRows - matchedCount - skippedCount;
    let description = `✅ Matched: ${matchedCount}, Updated: ${updatedCount}`;
    if (unmatchedCount > 0) {
      description += ` | ⚠️ Not found: ${unmatchedCount}`;
    }
    if (skippedCount > 0) {
      description += ` | Skipped (no email): ${skippedCount}`;
    }
    
    toast({ 
      title: "File imported successfully", 
      description,
    });
    
    // Show warning if many rows weren't matched
    if (unmatchedCount > 0 && unmatchedEmails.length > 0) {
      setTimeout(() => {
        toast({
          title: `${unmatchedCount} emails not found in approved list`,
          description: `Examples: ${unmatchedEmails.slice(0, 3).join(", ")}${unmatchedCount > 3 ? "..." : ""}`,
          variant: "destructive",
        });
      }, 1000);
    }
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
        const defaultData = getFormDataFromApp(app);
        const formData = shippingForms[app.id] || defaultData;
        
        // Save phone and address to application shipping fields first
        await apiRequest("PATCH", `/api/admin/applications/${app.id}/shipping-address`, {
          phone: formData.phone,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        });
        
        await apiRequest("POST", `/api/admin/applications/${app.id}/ship`, formData);
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
    mutationFn: async ({ applicationId, points }: { applicationId: string; points: number }) => {
      await apiRequest("POST", `/api/admin/uploads/${applicationId}/mark-uploaded`, { points });
    },
    onSuccess: (_, { points }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: `Verified with +${points} points` });
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

  const undoMissedMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/uploads/${applicationId}/undo-missed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Reverted to delivered" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  // Link in Bio: Verify bio link
  const verifyBioLinkMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/verify-bio-link`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Bio link verified" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to verify bio link", description: error.message, variant: "destructive" });
    },
  });

  // Amazon Video Upload: Verify Amazon Storefront link
  const verifyAmazonStorefrontMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/verify-amazon-storefront`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Amazon Storefront link verified" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to verify Amazon Storefront link", description: error.message, variant: "destructive" });
    },
  });

  // Legacy: Verify purchase (kept for backward compatibility)
  const verifyPurchaseMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/verify-purchase`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Purchase verified" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to verify purchase", description: error.message, variant: "destructive" });
    },
  });

  // Legacy: Send reimbursement (kept for backward compatibility)
  const sendReimbursementMutation = useMutation({
    mutationFn: async ({ applicationId, amount, paypalTransactionId }: { applicationId: string; amount: number; paypalTransactionId?: string }) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/send-reimbursement`, { amount, paypalTransactionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Reimbursement recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record reimbursement", description: error.message, variant: "destructive" });
    },
  });

  // Product Cost Covered / Amazon Video: Send cash reward
  const sendRewardMutation = useMutation({
    mutationFn: async ({ applicationId, paypalTransactionId }: { applicationId: string; paypalTransactionId?: string }) => {
      await apiRequest("POST", `/api/admin/applications/${applicationId}/send-reward`, { paypalTransactionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id, "applications"] });
      toast({ title: "Reward recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record reward", description: error.message, variant: "destructive" });
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

  const getDefaultFormData = (): ShippingFormData => ({
    courier: "", trackingNumber: "", trackingUrl: "", phone: "",
    addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "", country: "United States"
  });

  const getFormDataFromApp = (app: ApplicationWithDetails): ShippingFormData => {
    const inf = app.influencer;
    return {
      courier: "",
      trackingNumber: "",
      trackingUrl: "",
      phone: app.shippingPhone || inf?.phone || "",
      addressLine1: app.shippingAddressLine1 || inf?.addressLine1 || "",
      addressLine2: app.shippingAddressLine2 || inf?.addressLine2 || "",
      city: app.shippingCity || inf?.city || "",
      state: app.shippingState || inf?.state || "",
      zipCode: app.shippingZipCode || inf?.zipCode || "",
      country: app.shippingCountry || inf?.country || "United States",
    };
  };

  const updateShippingForm = (applicationId: string, field: keyof ShippingFormData, value: string, app?: ApplicationWithDetails) => {
    setShippingForms((prev) => {
      const existing = prev[applicationId] || (app ? getFormDataFromApp(app) : getDefaultFormData());
      return {
        ...prev,
        [applicationId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleShip = async (applicationId: string) => {
    // Find the application to get fallback address data
    const app = applications?.find(a => a.id === applicationId);
    const defaultData = app ? getFormDataFromApp(app) : getDefaultFormData();
    const formData = shippingForms[applicationId] || defaultData;
    
    if (!formData?.courier || !formData?.trackingNumber) {
      toast({ title: "Please fill in courier and tracking number", variant: "destructive" });
      return;
    }
    
    // First save phone and address to application shipping fields (uses form data or fallback)
    try {
      await apiRequest("PATCH", `/api/admin/applications/${applicationId}/shipping-address`, {
        phone: formData.phone,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      });
    } catch (error) {
      // Phone/Address save is optional, continue with shipping
    }
    
    shipMutation.mutate({ applicationId, data: formData });
  };

  const handleDownloadCsv = () => {
    window.open(`/api/admin/campaigns/${id}/export-csv`, "_blank");
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
  // Combined list for Applicants tab: pending first, then approved (for reference)
  const allApplicants = applications?.filter((a) => ["pending", "approved"].includes(a.status)) || [];
  const approvedTotalPages = Math.ceil(allApprovedApplications.length / APPROVED_PAGE_SIZE);
  const approvedApplications = allApprovedApplications.slice(
    (approvedPage - 1) * APPROVED_PAGE_SIZE,
    approvedPage * APPROVED_PAGE_SIZE
  );
  const rejectedApplications = applications?.filter((a) => a.status === "rejected") || [];
  const shippingApplications = applications?.filter((a) => 
    ["shipped", "delivered"].includes(a.status)
  ) || [];
  const shippedOnlyApplications = applications?.filter((a) => a.status === "shipped") || [];
  
  // For Link in Bio campaigns: bio tab shows delivered apps awaiting bio link verification
  const bioLinkAwaitingApplications = applications?.filter((a) => 
    a.status === "delivered" && !a.bioLinkVerifiedAt
  ) || [];
  
  // For Amazon Video Upload campaigns: amazon tab shows delivered apps awaiting storefront verification
  const amazonStorefrontAwaitingApplications = applications?.filter((a) => 
    a.status === "delivered" && !a.amazonStorefrontVerifiedAt
  ) || [];
  
  // For Link in Bio campaigns: uploads tab shows only apps with verified bio link
  // For Amazon Video Upload campaigns: uploads tab shows only apps with verified storefront link
  // For other campaigns: show all delivered apps
  const deliveredApplications = applications?.filter((a) => {
    if (a.status !== "delivered") return false;
    if (campaign?.campaignType === "link_in_bio") {
      return !!a.bioLinkVerifiedAt;
    }
    if (campaign?.campaignType === "amazon_video_upload") {
      return !!a.amazonStorefrontVerifiedAt;
    }
    return true;
  }) || [];
  const uploadedApplications = applications?.filter((a) => 
    ["uploaded", "completed"].includes(a.status)
  ) || [];
  const missedApplications = applications?.filter((a) => 
    a.status === "deadline_missed"
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
                <p className="text-2xl font-bold">{shippedOnlyApplications.length}</p>
                <p className="text-xs text-muted-foreground">Shipping</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{deliveredApplications.length}</p>
                <p className="text-xs text-muted-foreground">Uploads</p>
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
            <TabsTrigger value="shipping" data-testid="tab-shipping">
              <Truck className="h-4 w-4 mr-2" />
              Shipping
              {shippedOnlyApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {shippedOnlyApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            {campaign.campaignType === "link_in_bio" && (
              <TabsTrigger value="bio" data-testid="tab-bio">
                <ExternalLink className="h-4 w-4 mr-2" />
                Bio
                {bioLinkAwaitingApplications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {bioLinkAwaitingApplications.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {campaign.campaignType === "amazon_video_upload" && (
              <TabsTrigger value="amazon" data-testid="tab-amazon">
                <Store className="h-4 w-4 mr-2" />
                Amazon
                {amazonStorefrontAwaitingApplications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {amazonStorefrontAwaitingApplications.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="uploads" data-testid="tab-uploads">
              <Upload className="h-4 w-4 mr-2" />
              Uploads
              {deliveredApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {deliveredApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="result" data-testid="tab-result">
              <Star className="h-4 w-4 mr-2" />
              Result
              {uploadedApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {uploadedApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected" className="text-muted-foreground/70">
              <XCircle className="h-4 w-4 mr-2" />
              Reject
              {rejectedApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {rejectedApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="missed" data-testid="tab-missed" className="text-muted-foreground/70">
              <AlertCircle className="h-4 w-4 mr-2" />
              Missed
              {missedApplications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {missedApplications.length}
                </Badge>
              )}
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
                    <p className="text-sm text-muted-foreground">Campaign Type</p>
                    <p className="font-medium capitalize">
                      {((campaign as any).campaignType || "gifting").replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reward</p>
                    <p className="font-medium">
                      {(campaign as any).campaignType === "link_in_bio"
                        ? "Gift + $30 Reward"
                        : (campaign as any).campaignType === "amazon_video_upload"
                        ? "Gift + $30 Reward"
                        : "Gift Only"}
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

          {/* Applicants Tab - Shows all applications with original profile info */}
          <TabsContent value="applicants" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>
                  Applicants
                  {pendingApplications.length > 0 && (
                    <span className="text-muted-foreground font-normal text-base ml-2">
                      ({pendingApplications.length} pending{allApprovedApplications.length > 0 ? `, ${allApprovedApplications.length} approved` : ""})
                    </span>
                  )}
                  {pendingApplications.length === 0 && allApprovedApplications.length > 0 && (
                    <span className="text-muted-foreground font-normal text-base ml-2">
                      ({allApprovedApplications.length} approved)
                    </span>
                  )}
                </CardTitle>
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
                ) : allApplicants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedApplications.size === pendingApplications.length && pendingApplications.length > 0}
                              onCheckedChange={toggleAll}
                              disabled={pendingApplications.length === 0}
                            />
                          </TableHead>
                          <TableHead className="w-16 text-center">ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Influencer</TableHead>
                          <TableHead>TikTok</TableHead>
                          {campaign.campaignType === "link_in_bio" && (
                            <TableHead>Bio Link</TableHead>
                          )}
                          {campaign.campaignType === "amazon_video_upload" && (
                            <TableHead>Amazon Storefront</TableHead>
                          )}
                          <TableHead>Phone</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Applied</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allApplicants.map((app) => {
                          const inf = app.influencer;
                          const isPending = app.status === "pending";
                          const seqNum = app.sequenceNumber ? String(app.sequenceNumber).padStart(3, '0') : '-';
                          return (
                            <TableRow key={app.id} className={!isPending ? "bg-muted/30" : ""}>
                              <TableCell>
                                {isPending ? (
                                  <Checkbox
                                    checked={selectedApplications.has(app.id)}
                                    onCheckedChange={() => toggleApplication(app.id)}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono text-sm font-medium">{seqNum}</span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={isPending ? "outline" : "default"}
                                  className={isPending ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}
                                >
                                  {isPending ? "Pending" : "Approved"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <button
                                    type="button"
                                    className="font-medium text-primary hover:underline cursor-pointer text-left"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (inf) {
                                        setSelectedInfluencerId(inf.id);
                                      }
                                    }}
                                    data-testid={`influencer-name-${app.id}`}
                                  >
                                    {getInfluencerDisplayName(inf, "Unknown")}
                                  </button>
                                  <p className="text-xs text-muted-foreground">
                                    {inf?.email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {inf?.tiktokHandle ? (
                                  <a
                                    href={`https://www.tiktok.com/@${inf.tiktokHandle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`tiktok-link-${app.id}`}
                                  >
                                    @{inf.tiktokHandle}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              {campaign.campaignType === "link_in_bio" && (
                                <TableCell>
                                  {inf?.bioLinkProfileUrl ? (
                                    <a
                                      href={inf.bioLinkProfileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 max-w-[150px]"
                                      onClick={(e) => e.stopPropagation()}
                                      data-testid={`biolink-${app.id}`}
                                    >
                                      <span className="truncate">{inf.bioLinkProfileUrl.replace(/^https?:\/\//, '')}</span>
                                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                              {campaign.campaignType === "amazon_video_upload" && (
                                <TableCell>
                                  {inf?.amazonStorefrontUrl ? (
                                    <a
                                      href={inf.amazonStorefrontUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 max-w-[150px]"
                                      onClick={(e) => e.stopPropagation()}
                                      data-testid={`amazon-storefront-${app.id}`}
                                    >
                                      <span className="truncate">{inf.amazonStorefrontUrl.replace(/^https?:\/\//, '')}</span>
                                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                              {/* Original profile info - READ ONLY */}
                              <TableCell className="text-sm text-muted-foreground">
                                {inf?.phone || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={inf?.addressLine1 || ""}>
                                {inf?.addressLine1 || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {inf?.city || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {inf?.state || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {inf?.zipCode || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span>{inf?.score ?? 0}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {app.appliedAt
                                  ? format(new Date(app.appliedAt), "MMM d, h:mm a")
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {isPending ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        approveMutation.mutate({ applicationId: app.id });
                                      }}
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
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    See Approved tab
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No applications yet</p>
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
              <CardContent className="p-0">
                {approvedApplications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="w-14 text-center text-xs">ID</TableHead>
                          <TableHead className="min-w-[160px] sticky left-[56px] bg-muted z-10 text-xs">Influencer</TableHead>
                          <TableHead className="min-w-[100px] text-xs">Phone</TableHead>
                          <TableHead className="min-w-[90px] text-xs">TikTok</TableHead>
                          <TableHead className="min-w-[180px] text-xs">Address</TableHead>
                          <TableHead className="min-w-[140px] text-xs">Address 2</TableHead>
                          <TableHead className="min-w-[100px] text-xs">City</TableHead>
                          <TableHead className="min-w-[60px] text-xs">State</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Zip</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Courier</TableHead>
                          <TableHead className="min-w-[120px] text-xs">Tracking #</TableHead>
                          <TableHead className="min-w-[180px] text-xs">Tracking URL</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedApplications.map((app) => {
                          const defaultData = getFormDataFromApp(app);
                          const formData = shippingForms[app.id] || defaultData;
                          const hasShippingInfo = formData.courier && formData.trackingNumber;
                          const seqNum = app.sequenceNumber ? String(app.sequenceNumber).padStart(3, '0') : '-';
                          
                          return (
                            <TableRow key={app.id} className="hover:bg-muted/30">
                              <TableCell className="text-center p-2">
                                <span className="font-mono text-xs font-medium">{seqNum}</span>
                              </TableCell>
                              <TableCell className="sticky left-[56px] bg-background z-10 border-r p-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <button
                                      className="text-left hover:underline font-medium text-xs truncate"
                                      onClick={() => setSelectedInfluencerId(app.influencer?.id || null)}
                                      data-testid={`influencer-name-${app.id}`}
                                    >
                                      {getInfluencerDisplayName(app.influencer)}
                                    </button>
                                    {(() => {
                                      const counts = getIssueCount(app.id);
                                      if (counts.total === 0) return null;
                                      return (
                                        <button
                                          onClick={() => setConversationApp({ id: app.id, influencerName: getInfluencerDisplayName(app.influencer) })}
                                          className={cn(
                                            "relative p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0",
                                            counts.open > 0 && "text-amber-600"
                                          )}
                                          title={counts.open > 0 ? `${counts.open} awaiting reply` : `${counts.total} comments`}
                                          data-testid={`button-conversation-${app.id}`}
                                        >
                                          <MessageSquare className="h-3 w-3" />
                                          {counts.open > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                          )}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">{app.influencer?.email}</div>
                                </div>
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.phone}
                                  onChange={(e) => updateShippingForm(app.id, "phone", e.target.value, app)}
                                  placeholder="Phone"
                                  className="h-7 text-xs"
                                  data-testid={`input-phone-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                {app.influencer?.tiktokHandle ? (
                                  <a 
                                    href={`https://tiktok.com/@${app.influencer.tiktokHandle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-xs"
                                    data-testid={`tiktok-link-${app.id}`}
                                  >
                                    @{app.influencer.tiktokHandle}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.addressLine1}
                                  onChange={(e) => updateShippingForm(app.id, "addressLine1", e.target.value, app)}
                                  placeholder="Address"
                                  className="h-7 text-xs"
                                  data-testid={`input-address-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.addressLine2}
                                  onChange={(e) => updateShippingForm(app.id, "addressLine2", e.target.value, app)}
                                  placeholder="Apt, Suite, etc."
                                  className="h-7 text-xs"
                                  data-testid={`input-address2-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.city}
                                  onChange={(e) => updateShippingForm(app.id, "city", e.target.value, app)}
                                  placeholder="City"
                                  className="h-7 text-xs"
                                  data-testid={`input-city-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.state}
                                  onChange={(e) => updateShippingForm(app.id, "state", e.target.value, app)}
                                  placeholder="State"
                                  className="h-7 text-xs w-16"
                                  data-testid={`input-state-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.zipCode}
                                  onChange={(e) => updateShippingForm(app.id, "zipCode", e.target.value, app)}
                                  placeholder="Zip"
                                  className="h-7 text-xs w-20"
                                  data-testid={`input-zip-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.courier}
                                  onChange={(e) => updateShippingForm(app.id, "courier", e.target.value.toUpperCase(), app)}
                                  placeholder="USPS, UPS..."
                                  className="h-7 text-xs w-20"
                                  data-testid={`input-courier-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={formData.trackingNumber}
                                  onChange={(e) => updateShippingForm(app.id, "trackingNumber", e.target.value, app)}
                                  placeholder="Tracking #"
                                  className="h-7 text-xs"
                                  data-testid={`input-tracking-${app.id}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={formData.trackingUrl}
                                    onChange={(e) => updateShippingForm(app.id, "trackingUrl", e.target.value, app)}
                                    placeholder="https://..."
                                    className="h-7 text-xs flex-1"
                                    data-testid={`input-tracking-url-${app.id}`}
                                  />
                                  {formData.trackingUrl && (
                                    <a
                                      href={formData.trackingUrl.startsWith('http') ? formData.trackingUrl : `https://${formData.trackingUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:text-primary/80 p-1"
                                      data-testid={`link-tracking-url-${app.id}`}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="p-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleShip(app.id)}
                                  disabled={shipMutation.isPending || !hasShippingInfo}
                                  className="h-7 text-xs px-2"
                                  data-testid={`button-ship-${app.id}`}
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  Send
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
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

          {/* Shipping Tab - Read-only shipping records */}
          <TabsContent value="shipping" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Records
                  <span className="text-muted-foreground font-normal text-sm">({shippingApplications.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shippingApplications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-14 text-center text-xs">ID</TableHead>
                          <TableHead className="min-w-[140px] text-xs">Influencer</TableHead>
                          <TableHead className="min-w-[100px] text-xs">Phone</TableHead>
                          <TableHead className="min-w-[160px] text-xs">Address</TableHead>
                          <TableHead className="min-w-[120px] text-xs">Address 2</TableHead>
                          <TableHead className="min-w-[100px] text-xs">City</TableHead>
                          <TableHead className="min-w-[60px] text-xs">State</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Zip</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Courier</TableHead>
                          <TableHead className="min-w-[100px] text-xs">Tracking #</TableHead>
                          <TableHead className="min-w-[80px] text-xs">Tracking URL</TableHead>
                          <TableHead className="min-w-[70px] text-xs">Status</TableHead>
                          <TableHead className="min-w-[90px] text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shippingApplications.map((app) => {
                          const phone = app.shippingPhone || app.influencer?.phone;
                          const addr1 = app.shippingAddressLine1 || app.influencer?.addressLine1;
                          const addr2 = app.shippingAddressLine2 || app.influencer?.addressLine2;
                          const city = app.shippingCity || app.influencer?.city;
                          const state = app.shippingState || app.influencer?.state;
                          const zip = app.shippingZipCode || app.influencer?.zipCode;
                          const seqNum = app.sequenceNumber ? String(app.sequenceNumber).padStart(3, '0') : '-';
                          
                          return (
                            <TableRow key={app.id} className="bg-muted/20">
                              <TableCell className="text-center p-2">
                                <span className="font-mono text-xs font-medium">{seqNum}</span>
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <button
                                      className="font-medium text-xs text-primary hover:underline cursor-pointer bg-transparent border-none p-0 h-auto"
                                      onClick={() => setSelectedInfluencerId(app.influencer?.id || null)}
                                      data-testid={`link-influencer-shipping-${app.id}`}
                                    >
                                      {getInfluencerDisplayName(app.influencer)}
                                    </button>
                                    {(() => {
                                      const counts = getIssueCount(app.id);
                                      if (counts.total === 0) return null;
                                      return (
                                        <button
                                          onClick={() => setConversationApp({ id: app.id, influencerName: getInfluencerDisplayName(app.influencer) })}
                                          className={cn(
                                            "relative p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0",
                                            counts.open > 0 && "text-amber-600"
                                          )}
                                          title={counts.open > 0 ? `${counts.open} awaiting reply` : `${counts.total} comments`}
                                          data-testid={`button-conversation-shipping-${app.id}`}
                                        >
                                          <MessageSquare className="h-3 w-3" />
                                          {counts.open > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                          )}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{app.influencer?.email}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground p-2">
                                {phone || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground p-2">
                                {addr1 || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground p-2">
                                {addr2 || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground p-2">
                                {city || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground p-2">
                                {state || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground p-2">
                                {zip || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-medium p-2">
                                {app.shipping?.courier || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-mono p-2">
                                {app.shipping?.trackingNumber || "-"}
                              </TableCell>
                              <TableCell className="p-2">
                                {app.shipping?.trackingUrl ? (
                                  <a
                                    href={app.shipping.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline text-xs"
                                  >
                                    Track
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="p-2">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    app.status === "shipped"
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                      : app.status === "delivered"
                                      ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                  )}
                                >
                                  {app.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="p-2">
                                {app.status === "shipped" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={() => markDeliveredMutation.mutate(app.id)}
                                    disabled={markDeliveredMutation.isPending}
                                    data-testid={`button-delivered-${app.id}`}
                                  >
                                    <Package className="h-3 w-3 mr-1" />
                                    Delivered
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-muted-foreground"
                                    onClick={() => undoDeliveredMutation.mutate(app.id)}
                                    disabled={undoDeliveredMutation.isPending}
                                    data-testid={`button-undo-delivered-${app.id}`}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Undo
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No shipping records yet</p>
                    <p className="text-sm mt-1">Ship items from the Approved tab</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bio Tab - Link in Bio verification (only for link_in_bio campaigns) */}
          {campaign.campaignType === "link_in_bio" && (
            <TabsContent value="bio" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Bio Link Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bioLinkAwaitingApplications.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14">ID</TableHead>
                          <TableHead>Influencer</TableHead>
                          <TableHead>TikTok</TableHead>
                          <TableHead>Bio Link URL</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bioLinkAwaitingApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {String(app.sequenceNumber || 0).padStart(3, "0")}
                            </TableCell>
                            <TableCell>
                              <button
                                className="p-0 h-auto font-medium text-foreground hover:text-primary hover:underline bg-transparent border-none cursor-pointer"
                                onClick={() => {
                                  if (app.influencer) {
                                    setSelectedInfluencerId(app.influencer?.id || null);
                                  }
                                }}
                                data-testid={`link-influencer-bio-${app.id}`}
                              >
                                {getInfluencerDisplayName(app.influencer)}
                              </button>
                            </TableCell>
                            <TableCell>
                              {app.influencer?.tiktokHandle && (
                                <a
                                  href={`https://tiktok.com/@${app.influencer.tiktokHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  <SiTiktok className="h-3 w-3" />
                                  @{app.influencer.tiktokHandle}
                                </a>
                              )}
                            </TableCell>
                            <TableCell>
                              {app.bioLinkUrl ? (
                                <a
                                  href={app.bioLinkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                  data-testid={`link-bio-url-${app.id}`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="truncate max-w-[200px]">{app.bioLinkUrl}</span>
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not submitted yet</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {app.bioLinkSubmittedAt 
                                ? format(new Date(app.bioLinkSubmittedAt), "MMM d, h:mm a")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {app.bioLinkUrl ? (
                                <Button
                                  size="sm"
                                  onClick={() => verifyBioLinkMutation.mutate(app.id)}
                                  disabled={verifyBioLinkMutation.isPending}
                                  data-testid={`button-verify-bio-${app.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verify
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">Awaiting submission</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No bio links awaiting verification</p>
                      <p className="text-sm mt-1">Influencers will submit their bio links after receiving their products</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Amazon Tab - Amazon Storefront verification (only for amazon_video_upload campaigns) */}
          {campaign.campaignType === "amazon_video_upload" && (
            <TabsContent value="amazon" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Amazon Storefront Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {amazonStorefrontAwaitingApplications.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14">ID</TableHead>
                          <TableHead>Influencer</TableHead>
                          <TableHead>TikTok</TableHead>
                          <TableHead>Amazon Storefront URL</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {amazonStorefrontAwaitingApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {String(app.sequenceNumber || 0).padStart(3, "0")}
                            </TableCell>
                            <TableCell>
                              <button
                                className="p-0 h-auto font-medium text-foreground hover:text-primary hover:underline bg-transparent border-none cursor-pointer"
                                onClick={() => {
                                  if (app.influencer) {
                                    setSelectedInfluencerId(app.influencer?.id || null);
                                  }
                                }}
                                data-testid={`link-influencer-amazon-${app.id}`}
                              >
                                {getInfluencerDisplayName(app.influencer)}
                              </button>
                            </TableCell>
                            <TableCell>
                              {app.influencer?.tiktokHandle && (
                                <a
                                  href={`https://tiktok.com/@${app.influencer.tiktokHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  <SiTiktok className="h-3 w-3" />
                                  @{app.influencer.tiktokHandle}
                                </a>
                              )}
                            </TableCell>
                            <TableCell>
                              {app.amazonStorefrontUrl ? (
                                <a
                                  href={app.amazonStorefrontUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                  data-testid={`link-amazon-url-${app.id}`}
                                >
                                  <Store className="h-3 w-3" />
                                  <span className="truncate max-w-[200px]">{app.amazonStorefrontUrl}</span>
                                </a>
                              ) : app.influencer?.amazonStorefrontUrl ? (
                                <div className="space-y-1">
                                  <a
                                    href={app.influencer.amazonStorefrontUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-600 hover:underline flex items-center gap-1"
                                    data-testid={`link-amazon-profile-url-${app.id}`}
                                  >
                                    <Store className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{app.influencer.amazonStorefrontUrl}</span>
                                  </a>
                                  <span className="text-xs text-muted-foreground block">(from profile)</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not submitted yet</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {app.amazonStorefrontSubmittedAt 
                                ? format(new Date(app.amazonStorefrontSubmittedAt), "MMM d, h:mm a")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {app.amazonStorefrontUrl ? (
                                <Button
                                  size="sm"
                                  onClick={() => verifyAmazonStorefrontMutation.mutate(app.id)}
                                  disabled={verifyAmazonStorefrontMutation.isPending}
                                  data-testid={`button-verify-amazon-${app.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verify
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">Awaiting submission</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No Amazon Storefront links awaiting verification</p>
                      <p className="text-sm mt-1">Influencers will submit their Storefront links after receiving their products</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

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
                        <TableHead className="w-14">ID</TableHead>
                        <TableHead>Influencer</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Video Link</TableHead>
                        <TableHead className="w-20">Points</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveredApplications.map((app) => {
                        const deadline = new Date(campaign.deadline);
                        const isOverdue = deadline < new Date();
                        const currentContentUrl = contentUrlForms[app.id] ?? app.contentUrl ?? "";
                        return (
                          <TableRow key={app.id}>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {String(app.sequenceNumber || 0).padStart(3, "0")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <button
                                  className="p-0 h-auto font-medium text-foreground hover:text-primary hover:underline bg-transparent border-none cursor-pointer"
                                  onClick={() => {
                                    if (app.influencer) {
                                      setSelectedInfluencerId(app.influencer?.id || null);
                                    }
                                  }}
                                  data-testid={`link-influencer-${app.id}`}
                                >
                                  {getInfluencerDisplayName(app.influencer)}
                                </button>
                                {(() => {
                                  const counts = getIssueCount(app.id);
                                  if (counts.total === 0) return null;
                                  return (
                                    <button
                                      onClick={() => setConversationApp({ id: app.id, influencerName: getInfluencerDisplayName(app.influencer) })}
                                      className={cn(
                                        "relative p-1 rounded hover:bg-muted transition-colors",
                                        counts.open > 0 && "text-amber-600"
                                      )}
                                      title={counts.open > 0 ? `${counts.open} awaiting reply` : `${counts.total} comments`}
                                      data-testid={`button-conversation-uploads-${app.id}`}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      {counts.open > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {app.influencer?.tiktokHandle && (
                                <a
                                  href={`https://tiktok.com/@${app.influencer.tiktokHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  <SiTiktok className="h-3 w-3" />
                                  @{app.influencer.tiktokHandle}
                                </a>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {app.contentUrl && !editingContentUrl.has(app.id) ? (
                                  <>
                                    <a
                                      href={app.contentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded truncate max-w-[180px] hover:text-primary"
                                      title={app.contentUrl}
                                      data-testid={`link-content-url-${app.id}`}
                                    >
                                      {app.contentUrl}
                                    </a>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingContentUrl(prev => new Set(prev).add(app.id));
                                        setContentUrlForms(prev => ({
                                          ...prev,
                                          [app.id]: app.contentUrl || ""
                                        }));
                                      }}
                                      data-testid={`button-edit-url-${app.id}`}
                                    >
                                      Edit
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Input
                                      placeholder="Paste TikTok video URL"
                                      value={currentContentUrl}
                                      onChange={(e) => setContentUrlForms(prev => ({
                                        ...prev,
                                        [app.id]: e.target.value
                                      }))}
                                      className="h-8 text-xs w-48"
                                      data-testid={`input-content-url-${app.id}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8"
                                      onClick={() => {
                                        saveContentUrlMutation.mutate({
                                          applicationId: app.id,
                                          contentUrl: currentContentUrl
                                        }, {
                                          onSuccess: () => {
                                            setEditingContentUrl(prev => {
                                              const next = new Set(prev);
                                              next.delete(app.id);
                                              return next;
                                            });
                                          }
                                        });
                                      }}
                                      disabled={!currentContentUrl.trim() || saveContentUrlMutation.isPending}
                                      data-testid={`button-save-url-${app.id}`}
                                    >
                                      Save
                                    </Button>
                                    {editingContentUrl.has(app.id) && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs"
                                        onClick={() => {
                                          setEditingContentUrl(prev => {
                                            const next = new Set(prev);
                                            next.delete(app.id);
                                            return next;
                                          });
                                          setContentUrlForms(prev => {
                                            const next = { ...prev };
                                            delete next[app.id];
                                            return next;
                                          });
                                        }}
                                        data-testid={`button-cancel-url-${app.id}`}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={pointsForms[app.id] ?? 5}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setPointsForms(prev => ({
                                    ...prev,
                                    [app.id]: isNaN(val) ? 0 : val
                                  }));
                                }}
                                className="h-8 w-16 text-center text-sm"
                                data-testid={`input-points-${app.id}`}
                              />
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
                              <div className="flex gap-2 items-center">
                                <Button
                                  size="sm"
                                  onClick={() => markUploadedMutation.mutate({ 
                                    applicationId: app.id, 
                                    points: pointsForms[app.id] ?? 5 
                                  })}
                                  disabled={markUploadedMutation.isPending || !app.contentUrl}
                                  title={!app.contentUrl ? "Video link required" : undefined}
                                  data-testid={`mark-uploaded-${app.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Verified
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => setPendingMissedAppId(app.id)}
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

          {/* Result Tab */}
          <TabsContent value="result" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Verified Results</CardTitle>
              </CardHeader>
              <CardContent>
                {uploadedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">ID</TableHead>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Video Link</TableHead>
                        <TableHead className="w-20">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {String(app.sequenceNumber || 0).padStart(3, "0")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <button
                                className="p-0 h-auto font-medium text-foreground hover:text-primary hover:underline bg-transparent border-none cursor-pointer"
                                onClick={() => setSelectedInfluencerId(app.influencer?.id || null)}
                                data-testid={`link-influencer-result-${app.id}`}
                              >
                                {getInfluencerDisplayName(app.influencer)}
                              </button>
                              {(() => {
                                const counts = getIssueCount(app.id);
                                if (counts.total === 0) return null;
                                return (
                                  <button
                                    onClick={() => setConversationApp({ id: app.id, influencerName: getInfluencerDisplayName(app.influencer) })}
                                    className={cn(
                                      "relative p-1 rounded hover:bg-muted transition-colors",
                                      counts.open > 0 && "text-amber-600"
                                    )}
                                    title={counts.open > 0 ? `${counts.open} awaiting reply` : `${counts.total} comments`}
                                    data-testid={`button-conversation-result-${app.id}`}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    {counts.open > 0 && (
                                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {app.contentUrl ? (
                              <a
                                href={app.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                                data-testid={`link-video-result-${app.id}`}
                              >
                                <Video className="h-4 w-4" />
                                {app.contentUrl.length > 40 
                                  ? app.contentUrl.substring(0, 40) + "..." 
                                  : app.contentUrl}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {app.pointsAwarded ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                <Star className="h-3.5 w-3.5 fill-amber-500" />
                                +{app.pointsAwarded}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No verified results yet</p>
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
                              onClick={() => setSelectedInfluencerId(app.influencer?.id || null)}
                            >
                              {getInfluencerDisplayName(app.influencer)}
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

          {/* Missed Tab */}
          <TabsContent value="missed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Missed Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                {missedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">ID</TableHead>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missedApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {String(app.sequenceNumber || 0).padStart(3, "0")}
                          </TableCell>
                          <TableCell className="font-medium">
                            <button
                              className="text-left hover:underline"
                              onClick={() => setSelectedInfluencerId(app.influencer?.id || null)}
                            >
                              {getInfluencerDisplayName(app.influencer)}
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => undoMissedMutation.mutate(app.id)}
                              disabled={undoMissedMutation.isPending}
                              data-testid={`undo-missed-${app.id}`}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Undo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No missed deadlines</p>
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
            <DialogTitle>Upload Shipping File</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel (.xlsx) file. Only Courier, Tracking Number, and Tracking URL will be imported.
              Address information from influencers will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv,.CSV,.xlsx,.xls,text/csv,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                  <span className="text-sm text-muted-foreground">Click to select CSV or Excel file</span>
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
              onClick={handleFileUpload}
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

      {/* Mark as Missed Confirmation Dialog */}
      <AlertDialog open={!!pendingMissedAppId} onOpenChange={(open) => !open && setPendingMissedAppId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Apply Penalty
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark this application as missed deadline. This will automatically apply a <strong>-5 point penalty</strong> to the influencer's score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg text-sm">
            <p className="text-red-700 dark:text-red-300">
              This action cannot be easily undone. The influencer's score will decrease and this may affect their tier status.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-missed">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingMissedAppId) {
                  markMissedMutation.mutate(pendingMissedAppId);
                  setPendingMissedAppId(null);
                }
              }}
              data-testid="button-confirm-missed"
            >
              Apply Penalty
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Influencer Detail Sheet */}
      <InfluencerDetailSheet
        open={!!selectedInfluencerId}
        onClose={() => setSelectedInfluencerId(null)}
        influencerId={selectedInfluencerId}
        onDataChange={invalidateInfluencerQueries}
      />

      {/* Conversation History Sheet */}
      <ConversationSheet
        open={!!conversationApp}
        onOpenChange={(open) => {
          if (!open) setConversationApp(null);
        }}
        applicationId={conversationApp?.id || ""}
        influencerName={conversationApp?.influencerName || ""}
        campaignName={campaign?.name || "Campaign"}
      />

      {/* Product Cost Covered Approval Dialog */}
      <Dialog open={!!approveWithPaymentDialog} onOpenChange={(open) => {
        if (!open) {
          setApproveWithPaymentDialog(null);
          setPaymentTransactionId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Approve with PayPal Payment
            </DialogTitle>
            <DialogDescription>
              This is a Product Cost Covered campaign. Approving will require sending product cost to the influencer via PayPal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Influencer: {approveWithPaymentDialog?.influencerName}
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                PayPal Email: <span className="font-mono">{approveWithPaymentDialog?.paypalEmail || "Not provided"}</span>
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Product Cost: <span className="font-bold">${approveWithPaymentDialog?.productCost ? (approveWithPaymentDialog.productCost / 100).toFixed(2) : "0.00"}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal-transaction-id">PayPal Transaction ID (optional)</Label>
              <Input
                id="paypal-transaction-id"
                placeholder="Enter PayPal transaction ID"
                value={paymentTransactionId}
                onChange={(e) => setPaymentTransactionId(e.target.value)}
                data-testid="input-paypal-transaction-id"
              />
              <p className="text-xs text-muted-foreground">
                Enter the PayPal transaction ID after sending payment. You can also approve now and add it later.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setApproveWithPaymentDialog(null);
              setPaymentTransactionId("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (approveWithPaymentDialog) {
                  approveMutation.mutate({
                    applicationId: approveWithPaymentDialog.applicationId,
                    productCostPaypalTransactionId: paymentTransactionId || undefined,
                    productCostAmount: approveWithPaymentDialog.productCost,
                  });
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve-with-payment"
            >
              {approveMutation.isPending ? "Approving..." : "Approve & Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
