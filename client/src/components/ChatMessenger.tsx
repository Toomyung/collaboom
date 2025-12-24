import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();

  const { data: room, isLoading: roomLoading } = useQuery<ChatRoom>({
    queryKey: ['/api/chat/room'],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/room', room?.id, 'messages'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/chat/room', room?.id, 'messages'] });
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
        queryClient.invalidateQueries({ queryKey: ['/api/chat/room', room?.id, 'messages'], refetchType: 'active' });
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
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!message.trim() || !room?.canSend) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
                      className={cn(
                        "flex gap-2",
                        msg.senderType === "influencer" ? "justify-end" : "justify-start"
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
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sendMutation.isPending}
                    data-testid="input-chat-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    data-testid="button-send-message"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
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
    </>
  );
}
