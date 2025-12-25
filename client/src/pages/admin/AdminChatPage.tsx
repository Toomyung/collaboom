import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { InfluencerDetailSheet } from "@/components/admin/InfluencerDetailSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Search,
  User,
  Send,
  Loader2,
  ArrowLeft,
  Trash2,
} from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { getInfluencerDisplayName } from "@/lib/influencer-utils";
import type { Influencer } from "@shared/schema";

interface ChatRoomWithDetails {
  id: string;
  influencerId: string;
  lastMessageAt: string | null;
  lastAdminReadAt: string | null;
  lastInfluencerReadAt: string | null;
  createdAt: string;
  influencer?: Influencer;
  lastMessage?: ChatMessage;
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

export default function AdminChatPage() {
  const { toast } = useToast();
  const { socket } = useSocket();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [message, setMessage] = useState("");
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [showEndChatDialog, setShowEndChatDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoomWithDetails[]>({
    queryKey: ["/api/admin/chat/rooms"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/room/${selectedRoom?.id}/messages`],
    enabled: !!selectedRoom?.id,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/admin/chat/room/${selectedRoom?.id}/messages`, { content });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/chat/room/${selectedRoom?.id}/messages`], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"], refetchType: 'active' });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (roomId: string) => {
      await apiRequest("POST", `/api/admin/chat/room/${roomId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"] });
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/chat/room/${selectedRoom?.id}/end`);
    },
    onSuccess: () => {
      setShowEndChatDialog(false);
      setSelectedRoom(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"], refetchType: 'active' });
      toast({ title: "Chat ended", description: "All messages have been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to end chat", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { roomId: string; message: ChatMessage }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"], refetchType: 'active' });
      if (data.roomId === selectedRoom?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat/room/${selectedRoom?.id}/messages`], refetchType: 'active' });
      }
    };

    socket.on("chat:message:new", handleNewMessage);
    return () => {
      socket.off("chat:message:new", handleNewMessage);
    };
  }, [socket, selectedRoom?.id]);

  useEffect(() => {
    if (selectedRoom?.id && selectedRoom.unreadCount > 0) {
      markReadMutation.mutate(selectedRoom.id);
    }
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedRoom) {
      inputRef.current?.focus();
    }
  }, [selectedRoom]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const influencerName = getInfluencerDisplayName(room.influencer, "").toLowerCase();
    return (
      influencerName.includes(searchLower) ||
      room.influencer?.email?.toLowerCase().includes(searchLower) ||
      room.influencer?.tiktokHandle?.toLowerCase().includes(searchLower)
    );
  });

  const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Messages</h1>
            {totalUnread > 0 && (
              <Badge variant="destructive">{totalUnread} unread</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search influencers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-chat"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={cn(
                        "w-full p-3 text-left hover-elevate transition-colors",
                        selectedRoom?.id === room.id && "bg-accent"
                      )}
                      data-testid={`chat-room-${room.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={room.influencer?.profileImageUrl || undefined} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {getInfluencerDisplayName(room.influencer, "Unknown")}
                            </span>
                            {room.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center">
                                {room.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {room.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {room.lastMessage.senderType === 'admin' ? 'You: ' : ''}
                              {room.lastMessage.body}
                            </p>
                          )}
                          {room.lastMessageAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(room.lastMessageAt), "MMM d, h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col">
            {!selectedRoom ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Select a conversation</p>
                  <p className="text-sm mt-1">Choose from your existing conversations</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedRoom(null)}
                    data-testid="button-back-to-rooms"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedRoom.influencer?.profileImageUrl || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <button
                      onClick={() => setSelectedInfluencerId(selectedRoom.influencerId)}
                      className="font-medium hover:underline"
                      data-testid="link-influencer-detail"
                    >
                      {getInfluencerDisplayName(selectedRoom.influencer, "Unknown")}
                    </button>
                    {selectedRoom.influencer?.tiktokHandle && (
                      <p className="text-xs text-muted-foreground">
                        @{selectedRoom.influencer.tiktokHandle}
                      </p>
                    )}
                  </div>
                  {messages.length > 0 && (
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

                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            msg.senderType === "admin" ? "justify-end" : "justify-start"
                          )}
                          data-testid={`chat-message-${msg.id}`}
                        >
                          {msg.senderType === "influencer" && (
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={selectedRoom.influencer?.profileImageUrl || undefined} />
                              <AvatarFallback>
                                <User className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                              msg.senderType === "admin"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
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

                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sendMutation.isPending}
                      data-testid="input-admin-chat-message"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || sendMutation.isPending}
                      data-testid="button-admin-send-message"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <InfluencerDetailSheet
        influencerId={selectedInfluencerId}
        open={!!selectedInfluencerId}
        onClose={() => setSelectedInfluencerId(null)}
      />

      <AlertDialog open={showEndChatDialog} onOpenChange={setShowEndChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              End this chat?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete all chat messages and attached files with <strong>{getInfluencerDisplayName(selectedRoom?.influencer, "this influencer")}</strong>.
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
    </AdminLayout>
  );
}
