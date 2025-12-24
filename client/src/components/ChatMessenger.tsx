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
import { MessageCircle, X, Send, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: string;
  influencerId: string;
  lastMessageAt: string | null;
  canSend: boolean;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderType: 'influencer' | 'admin';
  senderId: string;
  body: string;
  createdAt: string;
}

export function ChatMessenger() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/chat/room/${room?.id}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/chat/room/${room?.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/room'] });
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

  const handleSendClick = () => {
    if (!message.trim() || !room?.canSend) return;
    setShowConfirmDialog(true);
  };

  const confirmSend = () => {
    setShowConfirmDialog(false);
    sendMutation.mutate(message.trim());
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
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
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
                  <div className="flex gap-2">
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
                    <Button
                      size="icon"
                      onClick={handleSendClick}
                      disabled={!message.trim() || sendMutation.isPending}
                      className="self-end"
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-4 right-4 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
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
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
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
    </>
  );
}
