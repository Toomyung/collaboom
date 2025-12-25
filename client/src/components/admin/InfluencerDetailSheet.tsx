import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Star,
  AlertTriangle,
  Plus,
  Minus,
  Unlock,
  History,
  FileText,
  Package,
  MessageSquare,
  Send,
  TrendingUp,
  TrendingDown,
  Trophy,
  DollarSign,
  AlertCircle,
  LayoutDashboard,
  Clock,
  CheckCircle,
  Truck,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  X,
  ArrowLeft,
  Ban,
  UserCheck,
  ShieldX,
  Trash2,
  Mail,
  MessageCircle,
  Loader2,
  Paperclip,
  Image,
  Film,
  File,
  Download,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'video/mp4',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}
import { SiTiktok, SiInstagram } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSocket } from "@/lib/socket";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Influencer, AdminNote, ScoreEvent, PenaltyEvent, Application, Campaign, ShippingIssue, Shipping } from "@shared/schema";

type ApplicationWithDetails = Application & { 
  campaign?: Campaign;
  issues?: ShippingIssue[];
  shipping?: Shipping | null;
};

type InfluencerWithStats = Influencer & {
  appliedCount?: number;
  acceptedCount?: number;
  completedCount?: number;
};

interface DashboardStats {
  influencer: Influencer;
  stats: {
    score: number;
    penalty: number;
    completedCount: number;
    missedCount: number;
    cashEarned: number;
    totalPointsFromCampaigns: number;
    totalApplications: number;
  };
  recentApplications: ApplicationWithDetails[];
  scoreEventsCount: number;
  penaltyEventsCount: number;
}

interface InfluencerDetailSheetProps {
  open: boolean;
  onClose: () => void;
  influencerId: string | null;
  initialInfluencer?: Influencer | null;
  onDataChange?: () => void;
}

const statusConfig: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  textColor: string;
  icon: typeof Clock;
  description: string;
  step: number;
}> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    bgColor: "bg-yellow-500/10 border border-yellow-500/20",
    textColor: "text-yellow-700",
    icon: Clock,
    description: "Awaiting approval from our team",
    step: 1,
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    bgColor: "bg-green-500/10 border border-green-500/20",
    textColor: "text-green-700",
    icon: CheckCircle,
    description: "Application approved. Shipping will begin soon.",
    step: 2,
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    bgColor: "bg-gray-500/10 border border-gray-500/20",
    textColor: "text-gray-600",
    icon: AlertCircle,
    description: "Application was not selected for this campaign.",
    step: 0,
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    bgColor: "bg-blue-500/10 border border-blue-500/20",
    textColor: "text-blue-700",
    icon: Truck,
    description: "Package is on the way!",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    bgColor: "bg-purple-500/10 border border-purple-500/20",
    textColor: "text-purple-700",
    icon: Package,
    description: "Package delivered. Awaiting content upload.",
    step: 4,
  },
  uploaded: {
    label: "Content Uploaded",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    bgColor: "bg-emerald-500/10 border border-emerald-500/20",
    textColor: "text-emerald-700",
    icon: Upload,
    description: "Content has been verified and uploaded.",
    step: 5,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    bgColor: "bg-emerald-500/10 border border-emerald-500/20",
    textColor: "text-emerald-700",
    icon: CheckCircle,
    description: "Campaign completed successfully!",
    step: 5,
  },
  deadline_missed: {
    label: "Deadline Missed",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    bgColor: "bg-red-500/10 border border-red-500/20",
    textColor: "text-red-600",
    icon: AlertCircle,
    description: "The upload deadline has passed.",
    step: 0,
  },
};

const progressSteps = [
  { label: "Applied", icon: Clock },
  { label: "Approved", icon: CheckCircle },
  { label: "Shipped", icon: Truck },
  { label: "Delivered", icon: Package },
  { label: "Uploaded", icon: Upload },
];

type DetailView = "score" | "completed" | "missed" | "cash" | null;

export function InfluencerDetailSheet({
  open,
  onClose,
  influencerId,
  initialInfluencer,
  onDataChange,
}: InfluencerDetailSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newNote, setNewNote] = useState("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
  const [detailView, setDetailView] = useState<DetailView>(null);
  
  // Score/Penalty adjustment states (delta values to add/subtract)
  const [scoreDelta, setScoreDelta] = useState<string>("");
  const [penaltyDelta, setPenaltyDelta] = useState<string>("");
  const [displayReason, setDisplayReason] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "score" | "penalty";
    currentValue: number;
    delta: number;
    displayReason?: string;
  } | null>(null);
  const [showUnsuspendConfirm, setShowUnsuspendConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const [chatFileError, setChatFileError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();

  const { data: influencer } = useQuery<InfluencerWithStats>({
    queryKey: ["/api/admin/influencers", influencerId],
    enabled: !!influencerId && open,
  });

  const selectedInfluencer = influencer || initialInfluencer;

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/influencers", influencerId, "dashboard-stats"],
    enabled: !!influencerId && open,
  });

  const { data: notes } = useQuery<AdminNote[]>({
    queryKey: ["/api/admin/influencers", influencerId, "notes"],
    enabled: !!influencerId && open,
  });

  const { data: scoreEvents } = useQuery<ScoreEvent[]>({
    queryKey: ["/api/admin/influencers", influencerId, "score-events"],
    enabled: !!influencerId && open,
  });

  const { data: penaltyEvents } = useQuery<PenaltyEvent[]>({
    queryKey: ["/api/admin/influencers", influencerId, "penalty-events"],
    enabled: !!influencerId && open,
  });

  const { data: applications } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/admin/influencers", influencerId, "applications"],
    enabled: !!influencerId && open,
  });

  // Chat room for this specific influencer
  interface ChatRoom {
    id: string;
    influencerId: string;
    lastMessageAt: string | null;
    status: 'active' | 'ended' | 'expired';
    firstMessageAt?: string | null;
    expiresAt?: string | null;
    adminUnreadCount?: number;
  }
  
  const [showEndChatDialog, setShowEndChatDialog] = useState(false);
  
  interface ChatMessage {
    id: string;
    roomId: string;
    senderType: 'influencer' | 'admin';
    senderId: string;
    body: string;
    createdAt: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    attachmentSize?: number | null;
  }

  // Fetch chat room whenever sheet is open (for unread badge on Messages tab)
  const { data: chatRoom, isLoading: chatRoomLoading } = useQuery<ChatRoom>({
    queryKey: [`/api/admin/chat/room/${influencerId}`],
    enabled: !!influencerId && open,
  });

  const { data: chatMessages = [], isLoading: chatMessagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/admin/chat/room/${chatRoom?.id}/messages`],
    enabled: !!chatRoom?.id && activeTab === "messages",
  });

  // Mark messages as read when admin opens the Messages tab
  const markReadMutation = useMutation({
    mutationFn: async (roomId: string) => {
      await apiRequest("POST", `/api/admin/chat/room/${roomId}/read`, {});
    },
    onSuccess: () => {
      // Invalidate unread count for sidebar badge
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/unread-count"], refetchType: 'active' });
      // Invalidate influencers list to update red indicators
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/admin/influencers');
        },
        refetchType: 'active'
      });
    },
  });

  // Mark messages as read when Messages tab is opened and there are unread messages
  // We track if we've already marked this room as read to prevent redundant calls
  const [hasMarkedRead, setHasMarkedRead] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  
  useEffect(() => {
    // Reset when sheet closes or influencer changes
    if (!open || !influencerId) {
      setHasMarkedRead(null);
      setIsMarkingRead(false);
    }
  }, [open, influencerId]);

  useEffect(() => {
    // Only mark as read if:
    // 1. Messages tab is active
    // 2. Chat room exists with live unread count
    // 3. We haven't already marked this room as read in this session
    // 4. Not currently marking as read (prevent duplicate calls)
    // 5. There are actually unread messages (based on live adminUnreadCount from API)
    const liveUnreadCount = chatRoom?.adminUnreadCount || 0;
    if (
      activeTab === "messages" && 
      chatRoom?.id && 
      hasMarkedRead !== chatRoom.id &&
      !isMarkingRead &&
      liveUnreadCount > 0
    ) {
      setIsMarkingRead(true);
      markReadMutation.mutate(chatRoom.id, {
        onSuccess: () => {
          setHasMarkedRead(chatRoom.id);
          setIsMarkingRead(false);
          // Invalidate the chat room query to update the live unread count
          queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/room/${influencerId}`], refetchType: 'active' });
        },
        onError: () => {
          // On error, allow retry by not setting hasMarkedRead
          setIsMarkingRead(false);
        }
      });
    }
  }, [activeTab, chatRoom?.id, chatRoom?.adminUnreadCount, hasMarkedRead, isMarkingRead, influencerId]);

  const sendChatMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string; file: File | null }) => {
      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('attachment', file);
      }
      const res = await fetch(`/api/admin/chat/room/${chatRoom?.id}/messages`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      setChatMessage("");
      setSelectedChatFile(null);
      setChatFileError(null);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/room/${chatRoom?.id}/messages`], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/room/${influencerId}`], refetchType: 'active' });
      // Invalidate unread count since admin replied (unlocks influencer to send more)
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/unread-count"], refetchType: 'active' });
      // Invalidate influencers list to update red indicators
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/admin/influencers');
        },
        refetchType: 'active'
      });
    },
    onError: (error: Error) => {
      setChatFileError(error.message);
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/chat/room/${chatRoom?.id}/end`);
    },
    onSuccess: () => {
      setShowEndChatDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/room/${influencerId}`], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/room/${chatRoom?.id}/messages`], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"], refetchType: 'active' });
      // Invalidate unread count and influencers list when chat ends
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/unread-count"], refetchType: 'active' });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/admin/influencers');
        },
        refetchType: 'active'
      });
      toast({ title: "Chat ended", description: "All messages have been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to end chat", description: error.message, variant: "destructive" });
    },
  });

  // Socket listener for real-time chat updates
  useEffect(() => {
    if (!socket || !influencerId) return;

    const handleNewMessage = (data: { roomId: string; message: ChatMessage }) => {
      console.log('[Chat Socket] Admin received message:', { roomId: data.roomId, sender: data.message?.senderType });
      // ALWAYS invalidate the messages for the incoming roomId (avoid stale closure issue)
      // This ensures new messages appear regardless of chatRoom loading state
      queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/chat/room/${data.roomId}/messages`], 
        refetchType: 'active' 
      });
      // Also refresh the chat room data to update unread badge on Messages tab
      queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/chat/room/${influencerId}`], 
        refetchType: 'active' 
      });
    };

    socket.on("chat:message:new", handleNewMessage);
    return () => {
      socket.off("chat:message:new", handleNewMessage);
    };
  }, [socket, influencerId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === "messages" && chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setChatFileError(null);
    
    if (file.size > MAX_FILE_SIZE) {
      setChatFileError(`File too large. Maximum size is 10MB. (Current: ${formatFileSize(file.size)})`);
      return;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setChatFileError('File type not supported. Allowed: images, PDF, CSV, Excel, ZIP, MP4');
      return;
    }
    
    setSelectedChatFile(file);
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = '';
    }
  };

  const removeChatFile = () => {
    setSelectedChatFile(null);
    setChatFileError(null);
  };

  const handleSendChatMessage = () => {
    if (!chatMessage.trim() && !selectedChatFile) return;
    sendChatMutation.mutate({ content: chatMessage.trim(), file: selectedChatFile });
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/admin/influencers');
      }
    });
    onDataChange?.();
  };

  const adjustScoreMutation = useMutation({
    mutationFn: async ({ id, delta, displayReason }: { id: string; delta: number; displayReason?: string }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/score`, { 
        delta, 
        reason: "admin_manual",
        displayReason: displayReason || undefined
      });
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Score updated" });
      setDisplayReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const adjustPenaltyMutation = useMutation({
    mutationFn: async ({ id, delta, displayReason }: { id: string; delta: number; displayReason?: string }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/penalty`, { 
        delta, 
        reason: "admin_manual",
        displayReason: displayReason || undefined
      });
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Points deducted" });
      setDisplayReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/unlock`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Account unlocked" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/suspend`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Account suspended", description: "Email notification has been sent to the user." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/unsuspend`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Account unsuspended", description: "Email notification has been sent to the user." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/block`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Account blocked", description: "This user can no longer access the platform." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/unblock`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Account unblocked", description: "This user can now access the platform again." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/influencers/${id}`);
    },
    onSuccess: () => {
      invalidateQueries();
      handleClose();
      toast({ title: "Account deleted", description: "This user has been permanently removed and cannot sign up again." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, subject, body }: { id: string; subject: string; body: string }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/email`, { subject, body });
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "The email has been sent successfully." });
      setShowEmailDialog(false);
      setEmailSubject("");
      setEmailBody("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send email", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await apiRequest("POST", `/api/admin/influencers/${id}/notes`, { note });
    },
    onSuccess: () => {
      invalidateQueries();
      setNewNote("");
      toast({ title: "Note added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (influencerId && newNote.trim()) {
      addNoteMutation.mutate({ id: influencerId, note: newNote.trim() });
    }
  };

  // Reset editing states when influencer changes
  useEffect(() => {
    if (selectedInfluencer) {
      setScoreDelta("");
      setPenaltyDelta("");
    }
  }, [selectedInfluencer?.id]);

  // Handlers for score/penalty adjustment
  const handleScoreConfirm = () => {
    const delta = parseInt(scoreDelta);
    if (!isNaN(delta) && delta !== 0 && selectedInfluencer) {
      setConfirmDialog({
        type: "score",
        currentValue: selectedInfluencer.score ?? 0,
        delta: delta,
        displayReason: displayReason.trim() || undefined,
      });
    }
  };

  const handlePenaltyConfirm = () => {
    const delta = parseInt(penaltyDelta);
    if (!isNaN(delta) && delta !== 0 && selectedInfluencer) {
      setConfirmDialog({
        type: "penalty",
        currentValue: selectedInfluencer.score ?? 0,
        delta: delta,
        displayReason: displayReason.trim() || undefined,
      });
    }
  };

  const handleConfirmChange = () => {
    if (!confirmDialog || !selectedInfluencer) return;
    
    if (confirmDialog.type === "score") {
      adjustScoreMutation.mutate({ 
        id: selectedInfluencer.id, 
        delta: confirmDialog.delta,
        displayReason: confirmDialog.displayReason
      });
      setScoreDelta("");
    } else {
      adjustPenaltyMutation.mutate({ 
        id: selectedInfluencer.id, 
        delta: confirmDialog.delta,
        displayReason: confirmDialog.displayReason
      });
      setPenaltyDelta("");
    }
    setConfirmDialog(null);
    setDisplayReason("");
  };

  const handleClose = () => {
    setNewNote("");
    setActiveTab("dashboard");
    setExpandedCampaigns([]);
    setDetailView(null);
    setScoreDelta("");
    setPenaltyDelta("");
    setDisplayReason("");
    setConfirmDialog(null);
    onClose();
  };

  type HistoryEvent = {
    id: string;
    type: 'score' | 'penalty';
    delta: number;
    reason: string;
    createdAt: Date | null;
  };

  const combinedHistory: HistoryEvent[] = [
    ...(scoreEvents || []).map((e) => ({
      id: e.id,
      type: 'score' as const,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
    ...(penaltyEvents || []).map((e) => ({
      id: e.id,
      type: 'penalty' as const,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
  ].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = dashboardStats?.stats;

  const completedApps = dashboardStats?.recentApplications?.filter(
    (a) => a.status === "uploaded" || a.status === "completed"
  ) || [];

  const missedApps = dashboardStats?.recentApplications?.filter(
    (a) => a.status === "deadline_missed"
  ) || [];

  const cashApps = completedApps.filter(
    (a) => a.campaign?.campaignType === "link_in_bio" || a.campaign?.campaignType === "amazon_video_upload"
  );

  const renderProgressBar = (status: string) => {
    const currentStep = statusConfig[status]?.step || 0;
    if (status === "rejected" || status === "deadline_missed") return null;

    return (
      <div className="flex items-center gap-1 w-full mt-3">
        {progressSteps.map((step, index) => {
          const stepNum = index + 1;
          const isComplete = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={step.label} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    isComplete ? "bg-primary" : "bg-muted"
                  )}
                />
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <step.icon
                  className={cn(
                    "h-2.5 w-2.5",
                    isComplete ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[9px]",
                    isCurrent ? "text-primary font-medium" : isComplete ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderApplicationDetails = (app: ApplicationWithDetails) => {
    const campaign = app.campaign;
    const status = statusConfig[app.status] || statusConfig.pending;
    const issues = app.issues || [];

    return (
      <div className="space-y-3 pt-2">
        {renderProgressBar(app.status)}

        <div className={cn("rounded-lg p-3 mt-3", status.bgColor)}>
          <p className={cn("text-xs", status.textColor)}>
            {app.status === "uploaded" && app.pointsAwarded && app.pointsAwarded > 0
              ? `Content verified! +${app.pointsAwarded} points awarded.`
              : status.description}
          </p>
        </div>

        {app.shipping && (app.status === "shipped" || app.status === "delivered") && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Shipping Info</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {app.shipping.courier && <span>Courier: {app.shipping.courier}</span>}
              {app.shipping.trackingNumber && (
                <span className="ml-2">Tracking: {app.shipping.trackingNumber}</span>
              )}
            </div>
            {app.shipping.trackingUrl && (
              <a
                href={app.shipping.trackingUrl.startsWith('http') 
                  ? app.shipping.trackingUrl 
                  : `https://${app.shipping.trackingUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                Track Package
              </a>
            )}
          </div>
        )}

        {app.status === "uploaded" && app.contentUrl && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Upload className="h-3 w-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">Uploaded Video</span>
              </div>
              {app.pointsAwarded && app.pointsAwarded > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                  +{app.pointsAwarded} pts
                </Badge>
              )}
            </div>
            <a
              href={app.contentUrl.startsWith('http') ? app.contentUrl : `https://${app.contentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              View TikTok Video
            </a>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Comment History</p>
            {issues.map((issue) => (
              <div 
                key={issue.id} 
                className={cn(
                  "rounded-lg p-2 space-y-1.5 text-xs",
                  issue.status === "open" 
                    ? "bg-amber-500/5 border border-amber-500/20" 
                    : issue.status === "resolved"
                    ? "bg-green-500/5 border border-green-500/20"
                    : "bg-gray-500/5 border border-gray-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className={cn(
                      "h-3 w-3",
                      issue.status === "open" ? "text-amber-600" : 
                      issue.status === "resolved" ? "text-green-600" : "text-gray-500"
                    )} />
                    <span className="font-medium">Influencer Comment</span>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-[10px] h-4",
                      issue.status === "resolved" && "bg-green-500/10 text-green-600"
                    )}
                  >
                    {issue.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{issue.message}</p>
                <p className="text-[10px] text-muted-foreground">
                  {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, yyyy") : ""}
                </p>
                
                {issue.adminResponse && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2 mt-1">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="h-2.5 w-2.5 text-blue-600" />
                      <span className="text-[10px] font-medium text-blue-600">Admin Reply</span>
                    </div>
                    <p className="text-muted-foreground">{issue.adminResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground pt-1 border-t">
          <p>Applied: {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "-"}</p>
          {campaign?.deadline && (
            <p>Deadline: {format(new Date(campaign.deadline), "MMM d, yyyy")}</p>
          )}
        </div>
      </div>
    );
  };

  const renderDetailView = () => {
    if (!detailView) return null;

    const getTitle = () => {
      switch (detailView) {
        case "score": return "Score History";
        case "completed": return "Completed Campaigns";
        case "missed": return "Missed Deadlines";
        case "cash": return "Cash Earned";
      }
    };

    const getIcon = () => {
      switch (detailView) {
        case "score": return <Star className="h-5 w-5 text-primary" />;
        case "completed": return <Trophy className="h-5 w-5 text-green-500" />;
        case "missed": return <AlertCircle className="h-5 w-5 text-red-500" />;
        case "cash": return <DollarSign className="h-5 w-5 text-emerald-500" />;
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setDetailView(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="font-semibold">{getTitle()}</h3>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {detailView === "score" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                <p className="text-sm">
                  Total Score: <span className="font-bold text-primary">{stats?.score ?? 0}</span>
                </p>
              </div>
              {scoreEvents && scoreEvents.length > 0 ? (
                scoreEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      event.delta > 0 
                        ? "bg-green-500/5 border-green-500/20" 
                        : "bg-orange-500/5 border-orange-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {event.delta > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                        )}
                        <span className={cn(
                          "font-medium",
                          event.delta > 0 ? "text-green-600" : "text-orange-600"
                        )}>
                          {event.delta > 0 ? "+" : ""}{event.delta} points
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.reason}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a") : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No score history yet</p>
                </div>
              )}
            </div>
          )}

          {detailView === "completed" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20 mb-4">
                <p className="text-sm">
                  Total Completed: <span className="font-bold text-green-600">{completedApps.length}</span>
                </p>
              </div>
              {completedApps.length > 0 ? (
                completedApps.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.campaign?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                      </div>
                      <Badge className="bg-green-500/10 text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                    {app.pointsAwarded && app.pointsAwarded > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <Star className="h-3 w-3 fill-amber-500" />
                        +{app.pointsAwarded} points earned
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Completed: {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No completed campaigns yet</p>
                </div>
              )}
            </div>
          )}

          {detailView === "missed" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 mb-4">
                <p className="text-sm">
                  Total Missed: <span className="font-bold text-red-600">{missedApps.length}</span>
                </p>
              </div>
              {missedApps.length > 0 ? (
                missedApps.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.campaign?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                      </div>
                      <Badge className="bg-red-500/10 text-red-600 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Missed
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Deadline: {app.campaign?.deadline ? format(new Date(app.campaign.deadline), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>No missed deadlines!</p>
                </div>
              )}
            </div>
          )}

          {detailView === "cash" && (
            <div className="space-y-2 pr-4">
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 mb-4">
                <p className="text-sm">
                  Total Cash Earned: <span className="font-bold text-emerald-600">${stats?.cashEarned ?? 0}</span>
                </p>
              </div>
              {cashApps.length > 0 ? (
                cashApps.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.campaign?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">
                        <DollarSign className="h-3 w-3 mr-0.5" />
                        ${app.campaign?.campaignType === "link_in_bio" ? 30 : app.campaign?.campaignType === "amazon_video_upload" ? 50 : 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Reward Type: Gift + Paid</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No cash earnings yet</p>
                  <p className="text-xs mt-1">Complete "Gift + Paid" campaigns to earn cash!</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        {selectedInfluencer && (
          <>
            <SheetHeader>
              <SheetTitle>{getInfluencerDisplayName(selectedInfluencer, "Influencer Details")}</SheetTitle>
              <SheetDescription>{selectedInfluencer.email}</SheetDescription>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-fit"
                onClick={() => setShowEmailDialog(true)}
                data-testid="button-email-influencer"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Influencer
              </Button>
            </SheetHeader>

            {selectedInfluencer.blocked && (
              <div className="flex items-center gap-3 p-3 mt-4 bg-red-600/10 rounded-lg border border-red-600/30">
                <ShieldX className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium text-red-600">Account Blocked</p>
                  <p className="text-sm text-muted-foreground">
                    This user is permanently blocked from the platform
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUnblockConfirm(true)}
                    disabled={unblockMutation.isPending}
                    data-testid="button-unblock"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Unblock
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-user"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {selectedInfluencer.suspended && !selectedInfluencer.blocked && (
              <div className="flex items-center gap-3 p-3 mt-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Ban className="h-5 w-5 text-orange-500" />
                <div className="flex-1">
                  <p className="font-medium text-orange-600">Account Suspended</p>
                  <p className="text-sm text-muted-foreground">
                    This user cannot apply to any campaigns
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUnsuspendConfirm(true)}
                    disabled={unsuspendMutation.isPending}
                    data-testid="button-unsuspend"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Unsuspend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setShowBlockConfirm(true)}
                    disabled={blockMutation.isPending}
                    data-testid="button-block-from-suspended"
                  >
                    <ShieldX className="h-4 w-4 mr-1" />
                    Block
                  </Button>
                </div>
              </div>
            )}

            {selectedInfluencer.restricted && !selectedInfluencer.blocked && (
              <div className="flex items-center gap-3 p-3 mt-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-600">Account Restricted</p>
                  <p className="text-sm text-muted-foreground">
                    Penalty count: {selectedInfluencer.penalty}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unlockMutation.mutate(selectedInfluencer.id)}
                  disabled={unlockMutation.isPending}
                  data-testid="button-unlock"
                >
                  <Unlock className="h-4 w-4 mr-1" />
                  Unlock
                </Button>
              </div>
            )}

            {!selectedInfluencer.suspended && !selectedInfluencer.restricted && !selectedInfluencer.blocked && (
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => setShowSuspendConfirm(true)}
                  disabled={suspendMutation.isPending}
                  data-testid="button-suspend"
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setShowBlockConfirm(true)}
                  disabled={blockMutation.isPending}
                  data-testid="button-block"
                >
                  <ShieldX className="h-4 w-4 mr-1" />
                  Block
                </Button>
              </div>
            )}

            {detailView ? (
              <div className="mt-6">
                {renderDetailView()}
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="profile" data-testid="tab-profile">
                    <User className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">
                    <History className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="messages" data-testid="tab-messages" className="relative">
                    <MessageCircle className="h-4 w-4" />
                    {(chatRoom?.adminUnreadCount ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                        {chatRoom?.adminUnreadCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">
                    <MessageSquare className="h-4 w-4" />
                    {notes && notes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                        {notes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" data-testid="tab-campaigns">
                    <Package className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("score")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Star className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">{stats?.score ?? selectedInfluencer.score ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Score</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("completed")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Trophy className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">{stats?.completedCount ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("missed")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">{stats?.missedCount ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Missed</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover-elevate transition-all"
                      onClick={() => setDetailView("cash")}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold">${stats?.cashEarned ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Cash Earned</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <p className="text-sm font-medium">Score Adjustment</p>
                        </div>
                        <p className="text-xl font-bold">{selectedInfluencer.score ?? 0} pts</p>
                      </div>
                      <div className="mb-2">
                        <Input
                          type="text"
                          maxLength={50}
                          value={displayReason}
                          onChange={(e) => setDisplayReason(e.target.value)}
                          placeholder="Reason (shown to influencer, optional)"
                          className="h-8 text-sm"
                          data-testid="input-display-reason"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {displayReason.length}/50 characters
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <p className="text-xs text-green-600 font-medium">Add Points</p>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600 font-medium">+</span>
                            <Input
                              type="number"
                              min="1"
                              value={scoreDelta}
                              onChange={(e) => setScoreDelta(e.target.value)}
                              placeholder="0"
                              className="h-7 w-14 text-center text-sm"
                              data-testid="input-score-delta"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 border-green-300 hover:bg-green-50"
                              onClick={handleScoreConfirm}
                              disabled={!scoreDelta || parseInt(scoreDelta) === 0 || adjustScoreMutation.isPending}
                              data-testid="button-score-confirm"
                            >
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-red-600 font-medium">Deduct Points</p>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">-</span>
                            <Input
                              type="number"
                              min="1"
                              value={penaltyDelta}
                              onChange={(e) => setPenaltyDelta(e.target.value)}
                              placeholder="0"
                              className="h-7 w-14 text-center text-sm"
                              data-testid="input-penalty-delta"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 border-red-300 hover:bg-red-50"
                              onClick={handlePenaltyConfirm}
                              disabled={!penaltyDelta || parseInt(penaltyDelta) === 0 || adjustPenaltyMutation.isPending}
                              data-testid="button-penalty-confirm"
                            >
                              <CheckCircle className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {dashboardStats?.recentApplications && dashboardStats.recentApplications.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recent Campaigns</h4>
                      <Accordion 
                        type="multiple" 
                        value={expandedCampaigns}
                        onValueChange={setExpandedCampaigns}
                        className="space-y-2"
                      >
                        {dashboardStats.recentApplications.map((app) => {
                          const status = statusConfig[app.status] || statusConfig.pending;
                          const StatusIcon = status.icon;
                          const hasComments = app.issues && app.issues.length > 0;

                          return (
                            <AccordionItem
                              key={app.id}
                              value={app.id}
                              className="border rounded-lg overflow-hidden bg-card"
                            >
                              <AccordionTrigger className="hover:no-underline px-3 py-2 [&>svg]:hidden">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="font-medium text-sm truncate">{app.campaign?.name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{app.campaign?.brandName}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hasComments && (
                                      <MessageSquare className="h-3 w-3 text-amber-500" />
                                    )}
                                    <Badge
                                      variant="secondary"
                                      className={cn("text-xs", status.color)}
                                    >
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {status.label}
                                    </Badge>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                {renderApplicationDetails(app)}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p>Total Applications: {stats?.totalApplications ?? 0}</p>
                    <p>Points from Campaigns: {stats?.totalPointsFromCampaigns ?? 0}</p>
                    <p>
                      Joined:{" "}
                      {selectedInfluencer.createdAt
                        ? format(new Date(selectedInfluencer.createdAt), "MMMM d, yyyy")
                        : "-"}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="profile" className="mt-4 space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-medium">Contact Info</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">TikTok</p>
                        {selectedInfluencer.tiktokHandle ? (
                          <a
                            href={`https://tiktok.com/@${selectedInfluencer.tiktokHandle.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <SiTiktok className="h-3 w-3" />
                            @{selectedInfluencer.tiktokHandle.replace("@", "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="flex items-center gap-1">
                            <SiTiktok className="h-3 w-3" />
                            -
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Instagram</p>
                        {selectedInfluencer.instagramHandle ? (
                          <a
                            href={`https://instagram.com/${selectedInfluencer.instagramHandle.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <SiInstagram className="h-3 w-3" />
                            @{selectedInfluencer.instagramHandle.replace("@", "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="flex items-center gap-1">
                            <SiInstagram className="h-3 w-3" />
                            -
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p>{selectedInfluencer.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">PayPal</p>
                        <p className="truncate">{selectedInfluencer.paypalEmail || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Bio Link (Linktree)</p>
                        {selectedInfluencer.bioLinkProfileUrl ? (
                          <a
                            href={selectedInfluencer.bioLinkProfileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline break-all"
                          >
                            {selectedInfluencer.bioLinkProfileUrl}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <p>-</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Amazon Storefront</p>
                        {selectedInfluencer.amazonStorefrontUrl ? (
                          <a
                            href={selectedInfluencer.amazonStorefrontUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline break-all"
                            data-testid="influencer-amazon-storefront"
                          >
                            {selectedInfluencer.amazonStorefrontUrl}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <p>-</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Shipping Address</h3>
                    <p className="text-sm text-muted-foreground">
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
                          {selectedInfluencer.city}, {selectedInfluencer.state}{" "}
                          {selectedInfluencer.zipCode}
                        </>
                      )}
                      {selectedInfluencer.country && (
                        <>
                          <br />
                          {selectedInfluencer.country}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>
                      Profile:{" "}
                      {selectedInfluencer.profileCompleted ? "Complete" : "Incomplete"}
                    </p>
                    <p>
                      Joined:{" "}
                      {selectedInfluencer.createdAt
                        ? format(new Date(selectedInfluencer.createdAt), "MMMM d, yyyy")
                        : "-"}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">Score History</h3>
                    {combinedHistory.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {combinedHistory.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border",
                              event.type === 'score'
                                ? event.delta > 0
                                  ? "bg-green-500/5 border-green-500/20"
                                  : "bg-orange-500/5 border-orange-500/20"
                                : "bg-red-500/5 border-red-500/20"
                            )}
                          >
                            <div className={cn(
                              "rounded-full p-1.5",
                              event.type === 'score'
                                ? event.delta > 0 ? "bg-green-500/10" : "bg-orange-500/10"
                                : "bg-red-500/10"
                            )}>
                              {event.type === 'score' ? (
                                event.delta > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-orange-600" />
                                )
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  event.type === 'score'
                                    ? event.delta > 0 ? "text-green-600" : "text-orange-600"
                                    : "text-red-600"
                                )}>
                                  {event.type === 'penalty' ? "-" : (event.delta > 0 ? "+" : "")}{event.type === 'penalty' ? event.delta : event.delta}
                                  {event.type === 'penalty' ? " (deducted)" : " pts"}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {event.reason}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.createdAt
                                  ? format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No history yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="messages" className="mt-4">
                  <div className="flex flex-col h-[400px]">
                    <div className="flex items-center justify-between pb-3 border-b mb-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Chat with {getInfluencerDisplayName(selectedInfluencer, "Influencer")}</span>
                        {chatRoom?.status === 'ended' && (
                          <Badge variant="secondary" className="text-xs">Ended</Badge>
                        )}
                        {chatRoom?.status === 'expired' && (
                          <Badge variant="secondary" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      {chatRoom && chatRoom.status === 'active' && chatMessages.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          onClick={() => setShowEndChatDialog(true)}
                          data-testid="button-end-chat"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          End chat
                        </Button>
                      )}
                    </div>
                    
                    <ScrollArea className="flex-1 pr-4">
                      {chatRoomLoading || chatMessagesLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                          <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                          <p className="text-sm">No messages yet</p>
                          <p className="text-xs mt-1">Send a message to start the conversation</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex gap-2",
                                msg.senderType === "admin" ? "justify-end" : "justify-start"
                              )}
                              data-testid={`chat-msg-${msg.id}`}
                            >
                              {msg.senderType === "influencer" && (
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-primary">
                                    {selectedInfluencer?.name?.[0]?.toUpperCase() || "I"}
                                  </span>
                                </div>
                              )}
                              <div
                                className={cn(
                                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                                  msg.senderType === "admin"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                {/* Attachment preview */}
                                {msg.attachmentUrl && (
                                  <div className="mb-2">
                                    {msg.attachmentType?.startsWith('image/') ? (
                                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                        <img 
                                          src={msg.attachmentUrl} 
                                          alt={msg.attachmentName || 'Image'} 
                                          className="max-w-full rounded-md max-h-[200px] object-cover"
                                        />
                                      </a>
                                    ) : (
                                      <a 
                                        href={msg.attachmentUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-md",
                                          msg.senderType === "admin"
                                            ? "bg-primary-foreground/10"
                                            : "bg-background"
                                        )}
                                      >
                                        {(() => {
                                          const FileIcon = getFileIcon(msg.attachmentType || '');
                                          return <FileIcon className="h-4 w-4 flex-shrink-0" />;
                                        })()}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs truncate">{msg.attachmentName}</p>
                                          {msg.attachmentSize && (
                                            <p className="text-xs opacity-70">{formatFileSize(msg.attachmentSize)}</p>
                                          )}
                                        </div>
                                        <Download className="h-3 w-3 flex-shrink-0 opacity-70" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                {/* Message body - hide if it's just the default attachment message */}
                                {msg.body && !msg.body.startsWith('Sent an attachment:') && (
                                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                )}
                                <p className={cn(
                                  "text-xs mt-1 opacity-70",
                                  msg.senderType === "admin" ? "text-right" : "text-left"
                                )}>
                                  {format(new Date(msg.createdAt), "h:mm a")}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    <div className="border-t pt-3 mt-3 space-y-2">
                      {/* File error message */}
                      {chatFileError && (
                        <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                          {chatFileError}
                        </div>
                      )}
                      
                      {/* Selected file preview */}
                      {selectedChatFile && (
                        <div className="flex items-center gap-2 bg-muted px-2 py-1.5 rounded-md text-sm">
                          {(() => {
                            const FileIcon = getFileIcon(selectedChatFile.type);
                            return <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />;
                          })()}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{selectedChatFile.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(selectedChatFile.size)}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={removeChatFile}
                            data-testid="button-remove-chat-attachment"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {/* Hidden file input */}
                        <input
                          ref={chatFileInputRef}
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.csv,.xls,.xlsx,.zip,.mp4"
                          onChange={handleChatFileSelect}
                          data-testid="input-chat-file-admin"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => chatFileInputRef.current?.click()}
                          disabled={!chatRoom || sendChatMutation.isPending}
                          title="Attach file (max 10MB)"
                          data-testid="button-attach-chat-file"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={handleChatKeyPress}
                          placeholder={chatRoom ? "Type a message..." : "Loading chat..."}
                          className="flex-1"
                          disabled={!chatRoom || sendChatMutation.isPending}
                          data-testid="input-chat-admin"
                        />
                        <Button
                          size="icon"
                          onClick={handleSendChatMessage}
                          disabled={!chatRoom || (!chatMessage.trim() && !selectedChatFile) || sendChatMutation.isPending}
                          data-testid="button-send-chat"
                        >
                          {sendChatMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note about this influencer..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 resize-none"
                        rows={2}
                        data-testid="input-note"
                      />
                      <Button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addNoteMutation.isPending}
                        data-testid="button-add-note"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {notes && notes.length > 0 ? (
                        notes
                          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                          .map((note) => (
                            <div
                              key={note.id}
                              className="p-3 rounded-lg border bg-muted/30"
                            >
                              <p className="text-sm">{note.note}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {note.createdAt
                                  ? format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")
                                  : "-"}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No notes yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="campaigns" className="mt-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">Campaign History</h3>
                    {applications && applications.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {applications.map((app) => (
                          <div
                            key={app.id}
                            className="p-3 rounded-lg border"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {app.campaign?.name || "Unknown Campaign"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {app.campaign?.brandName}
                                </p>
                              </div>
                              <Badge
                                className={cn(
                                  app.status === "completed" || app.status === "uploaded"
                                    ? "bg-green-500/10 text-green-600"
                                    : app.status === "rejected" || app.status === "deadline_missed"
                                    ? "bg-red-500/10 text-red-600"
                                    : app.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-600"
                                    : "bg-blue-500/10 text-blue-600"
                                )}
                              >
                                {app.status}
                              </Badge>
                            </div>
                            {app.pointsAwarded && app.pointsAwarded > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                                <Star className="h-3 w-3 fill-amber-500" />
                                +{app.pointsAwarded} points
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Applied:{" "}
                              {app.appliedAt
                                ? format(new Date(app.appliedAt), "MMM d, yyyy")
                                : "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No campaign applications</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </SheetContent>

      {/* Confirmation Dialog for Score/Penalty Changes */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", confirmDialog?.type === "penalty" ? "text-red-500" : "text-green-500")} />
              {confirmDialog?.type === "penalty" ? "Deduct Points" : "Add Points"}
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              {confirmDialog?.type === "score" ? (
                <div className="space-y-2">
                  <p>
                    Current Score: <strong>{confirmDialog.currentValue}</strong>
                  </p>
                  <p className="text-green-600 font-medium">
                    +{confirmDialog.delta} points
                  </p>
                  <p>
                    New Score: <strong>{Math.min(100, confirmDialog.currentValue + confirmDialog.delta)}</strong>
                    {confirmDialog.currentValue + confirmDialog.delta > 100 && (
                      <span className="text-xs text-muted-foreground ml-1">(capped at 100)</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    Current Score: <strong>{confirmDialog?.currentValue}</strong>
                  </p>
                  <p className="text-red-600 font-medium">
                    -{confirmDialog?.delta} points (penalty)
                  </p>
                  <p>
                    New Score: <strong>{Math.max(0, (confirmDialog?.currentValue ?? 0) - (confirmDialog?.delta ?? 0))}</strong>
                    {(confirmDialog?.currentValue ?? 0) - (confirmDialog?.delta ?? 0) < 0 && (
                      <span className="text-xs text-muted-foreground ml-1">(capped at 0)</span>
                    )}
                  </p>
                </div>
              )}
              {confirmDialog?.displayReason && (
                <div className="bg-muted p-2 rounded-md mt-2">
                  <p className="text-xs text-muted-foreground">Reason (visible to influencer):</p>
                  <p className="text-sm font-medium">{confirmDialog.displayReason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground pt-2">
                Are you sure?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              data-testid="button-cancel-change"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChange}
              disabled={adjustScoreMutation.isPending || adjustPenaltyMutation.isPending}
              data-testid="button-confirm-change"
            >
              {(adjustScoreMutation.isPending || adjustPenaltyMutation.isPending) ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Ban className="h-5 w-5" />
              Suspend this account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to suspend <strong>{getInfluencerDisplayName(selectedInfluencer, "this user")}</strong>'s account.
              </p>
              <p>
                This will prevent them from applying to any campaigns. An email notification will be sent to inform them.
              </p>
              <p className="font-medium text-orange-600">
                This action should only be used for policy violations or suspicious activity.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                if (selectedInfluencer) {
                  suspendMutation.mutate(selectedInfluencer.id);
                }
                setShowSuspendConfirm(false);
              }}
              data-testid="button-confirm-suspend"
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnsuspendConfirm} onOpenChange={setShowUnsuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsuspend this account?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to unsuspend <strong>{getInfluencerDisplayName(selectedInfluencer, "this user")}</strong>'s account. 
              They will regain the ability to apply to campaigns and participate in collaborations.
              An email notification will be sent to inform them of this change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unsuspend">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInfluencer) {
                  unsuspendMutation.mutate(selectedInfluencer.id);
                }
                setShowUnsuspendConfirm(false);
              }}
              data-testid="button-confirm-unsuspend"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Unsuspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldX className="h-5 w-5" />
              Block this account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to permanently block <strong>{getInfluencerDisplayName(selectedInfluencer, "this user")}</strong>'s account.
              </p>
              <p>
                This is a severe action. The user will be completely locked out of the platform with no appeal option.
              </p>
              <p className="font-medium text-red-600">
                Use this only for serious violations such as fraud, harassment, or repeated policy breaches.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-block">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (selectedInfluencer) {
                  blockMutation.mutate(selectedInfluencer.id);
                }
                setShowBlockConfirm(false);
              }}
              data-testid="button-confirm-block"
            >
              <ShieldX className="h-4 w-4 mr-2" />
              Block Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock this account?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to unblock <strong>{getInfluencerDisplayName(selectedInfluencer, "this user")}</strong>'s account. 
              They will regain access to the platform and can participate in campaigns again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unblock">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInfluencer) {
                  unblockMutation.mutate(selectedInfluencer.id);
                }
                setShowUnblockConfirm(false);
              }}
              data-testid="button-confirm-unblock"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to permanently delete <strong>{getInfluencerDisplayName(selectedInfluencer, "this user")}</strong>'s account.
              </p>
              <p className="font-medium text-red-600">
                This action cannot be undone. All data will be permanently removed.
              </p>
              <p>
                This user will NOT be able to sign up again with the same email address.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (selectedInfluencer) {
                  deleteMutation.mutate(selectedInfluencer.id);
                }
                setShowDeleteConfirm(false);
              }}
              data-testid="button-confirm-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Chat Confirmation Dialog */}
      <AlertDialog open={showEndChatDialog} onOpenChange={setShowEndChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              End this chat?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete all chat messages and attached files with <strong>{getInfluencerDisplayName(selectedInfluencer, "this influencer")}</strong>.
              </p>
              <p className="font-medium text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-end-chat">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => endChatMutation.mutate()}
              disabled={endChatMutation.isPending}
              data-testid="button-confirm-end-chat"
            >
              {endChatMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  End Chat
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Influencer
            </DialogTitle>
            <DialogDescription>
              Send a direct email to {getInfluencerDisplayName(selectedInfluencer, "this influencer")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Enter email subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Enter your message..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                data-testid="input-email-body"
              />
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Note:</p>
              <p>The email will include a footer with: "Please DO NOT reply to this email" notice, dashboard link (collaboom.io/dashboard), and Collaboom team signature.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailDialog(false);
                setEmailSubject("");
                setEmailBody("");
              }}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedInfluencer && emailSubject.trim() && emailBody.trim()) {
                  sendEmailMutation.mutate({
                    id: selectedInfluencer.id,
                    subject: emailSubject,
                    body: emailBody,
                  });
                }
              }}
              disabled={sendEmailMutation.isPending || !emailSubject.trim() || !emailBody.trim()}
              data-testid="button-send-email"
            >
              {sendEmailMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
