import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
import { MessageCircle, X, Send, Loader2, AlertTriangle, Paperclip, FileText, Image, Film, File, Download, Info, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

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

interface ChatRoom {
  id: string;
  influencerId: string;
  lastMessageAt: string | null;
  canSend: boolean;
  unreadCount: number;
  status: 'active' | 'ended' | 'expired';
  firstMessageAt?: string | null;
  expiresAt?: string | null;
}

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

export function ChatMessenger() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();

  // Listen for external open-chat events (e.g., from notification clicks)
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent<{ messageId?: string }>) => {
      setIsOpen(true);
      if (e.detail?.messageId) {
        setHighlightMessageId(e.detail.messageId);
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightMessageId(null), 3000);
      }
    };
    
    window.addEventListener('open-chat', handleOpenChat as EventListener);
    return () => {
      window.removeEventListener('open-chat', handleOpenChat as EventListener);
    };
  }, []);

  const { data: room, isLoading: roomLoading } = useQuery<ChatRoom>({
    queryKey: ['/api/chat/room'],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/room/${room?.id}/messages`],
    enabled: !!room?.id && isOpen,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/chat/unread-count'],
  });

  const sendMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string; file: File | null }) => {
      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('attachment', file);
      }
      const res = await fetch(`/api/chat/room/${room?.id}/messages`, {
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
      setMessage("");
      setSelectedFile(null);
      setFileError(null);
      queryClient.invalidateQueries({ queryKey: [`/api/chat/room/${room?.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/room'] });
    },
    onError: (error: Error) => {
      setFileError(error.message);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/chat/room/${room?.id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
    },
  });

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data: { roomId: string; message: ChatMessage }) => {
      if (data.roomId === room?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat/room/${room?.id}/messages`], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['/api/chat/room'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'], refetchType: 'active' });
      }
    };

    socket.on("chat:message:new", handleNewMessage);
    return () => {
      socket.off("chat:message:new", handleNewMessage);
    };
  }, [socket, room?.id]);

  useEffect(() => {
    if (isOpen && room?.id && unreadData && unreadData.count > 0) {
      markReadMutation.mutate();
    }
  }, [isOpen, room?.id, unreadData?.count]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // If there's a highlighted message, scroll to it; otherwise scroll to end
      if (highlightMessageId) {
        const messageEl = document.getElementById(`message-${highlightMessageId}`);
        if (messageEl) {
          messageEl.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, highlightMessageId]);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileError(null);
    
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Maximum size is 10MB. (Current: ${formatFileSize(file.size)})`);
      return;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('File type not supported. Allowed: images, PDF, CSV, Excel, ZIP, MP4');
      return;
    }
    
    setSelectedFile(file);
    // Clear input to allow re-selecting same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  const handleSendClick = () => {
    if ((!message.trim() && !selectedFile) || !room?.canSend) return;
    setShowConfirmDialog(true);
  };

  const confirmSend = () => {
    setShowConfirmDialog(false);
    sendMutation.mutate({ content: message.trim(), file: selectedFile });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const unreadCount = unreadData?.count || 0;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-background border rounded-lg shadow-xl overflow-hidden"
            data-testid="chat-messenger-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">Chat with Collaboom</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary-foreground hover:bg-primary/90"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 14-day policy info banner */}
            {room && room.expiresAt && room.status === 'active' && (
              <button
                onClick={() => setShowPolicyDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b text-xs text-muted-foreground hover:bg-muted/80 transition-colors w-full text-left"
                data-testid="button-chat-policy-info"
              >
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>
                  {room.expiresAt && (
                    <>Chat expires {format(new Date(room.expiresAt), "MMM d, yyyy")}</>
                  )}
                </span>
                <Info className="h-3 w-3 ml-auto opacity-60" />
              </button>
            )}

            <ScrollArea className="h-[300px] p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                  <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs mt-1">Send a message to start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      id={`message-${msg.id}`}
                      className={cn(
                        "flex gap-2 transition-all duration-500",
                        msg.senderType === "influencer" ? "justify-end" : "justify-start",
                        highlightMessageId === msg.id && "bg-primary/10 -mx-2 px-2 py-1 rounded-lg"
                      )}
                      data-testid={`chat-message-${msg.id}`}
                    >
                      {msg.senderType === "admin" && (
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src="/collaboom-logo.png" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">CB</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                          msg.senderType === "influencer"
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
                                  msg.senderType === "influencer"
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
                          msg.senderType === "influencer" ? "text-right" : "text-left"
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

            <div className="border-t p-3">
              {room?.canSend === false ? (
                <div className="text-center text-xs text-muted-foreground py-2">
                  Please wait for a reply before sending another message.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Be detailed - you can only send one message until we reply.
                  </p>
                  
                  {/* File error message */}
                  {fileError && (
                    <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                      {fileError}
                    </div>
                  )}
                  
                  {/* Selected file preview */}
                  {selectedFile && (
                    <div className="flex items-center gap-2 bg-muted px-2 py-1.5 rounded-md text-sm">
                      {(() => {
                        const FileIcon = getFileIcon(selectedFile.type);
                        return <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />;
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={removeSelectedFile}
                        data-testid="button-remove-attachment"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-1">
                      <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Describe your question or issue in detail..."
                        className="flex-1 min-h-[60px] resize-none text-sm"
                        disabled={sendMutation.isPending}
                        data-testid="input-chat-message"
                      />
                    </div>
                    <div className="flex flex-col gap-1 self-end">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.csv,.xls,.xlsx,.zip,.mp4"
                        onChange={handleFileSelect}
                        data-testid="input-file-attachment"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sendMutation.isPending}
                        title="Attach file (max 10MB)"
                        data-testid="button-attach-file"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleSendClick}
                        disabled={(!message.trim() && !selectedFile) || sendMutation.isPending}
                        data-testid="button-send-message"
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-4 right-4 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={!isOpen && unreadCount > 0 ? {
          y: [0, -8, 0, -4, 0],
          transition: {
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 2,
          }
        } : {}}
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg relative"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-open-chat"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
          {!isOpen && unreadCount > 0 && (
            <motion.span 
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </motion.div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle className="text-base">Before you send...</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  After sending this message, you won't be able to send another one until our team replies.
                </p>
                <p className="font-medium text-foreground">
                  Please make sure your message includes all the details we need to help you.
                </p>
                <p className="text-xs text-muted-foreground">
                  Response time: 1-2 business days
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-send">
              Go back and edit
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend} data-testid="button-confirm-send">
              Yes, send message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 14-day policy info dialog */}
      <AlertDialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Clock className="h-5 w-5" />
              <AlertDialogTitle className="text-base">Chat Policy</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  To keep your data safe and maintain privacy, chat conversations are automatically deleted <strong>14 days</strong> after the first message.
                </p>
                {room?.expiresAt && (
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">This chat will expire on</p>
                    <p className="font-medium text-foreground">
                      {format(new Date(room.expiresAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Please save any important information before the conversation expires.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowPolicyDialog(false)}
              data-testid="button-close-policy-dialog"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
