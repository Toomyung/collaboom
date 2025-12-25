import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { queryClient } from "./queryClient";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
  joinUserRoom: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinCampaign: () => {},
  leaveCampaign: () => {},
  joinUserRoom: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("[Socket] Connected");
      // On connect/reconnect, try to join user room if session exists
      socketInstance.emit("join:user");
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("[Socket] Disconnected");
    });

    socketInstance.on("campaign:created", (data: { campaignId: string }) => {
      console.log("[Socket] Campaign created:", data.campaignId);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"], refetchType: 'active' });
    });

    socketInstance.on("campaign:updated", (data: { campaignId: string }) => {
      console.log("[Socket] Campaign updated:", data.campaignId);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId], refetchType: 'active' });
    });

    socketInstance.on("campaign:deleted", (data: { campaignId: string }) => {
      console.log("[Socket] Campaign deleted:", data.campaignId);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"], refetchType: 'active' });
    });

    socketInstance.on("comment:created", (data: { campaignId: string; applicationId: string }) => {
      console.log("[Socket] Comment created:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId, "comments"], refetchType: 'active' });
      // Invalidate admin issues list for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId, "applications"], refetchType: 'active' });
    });

    socketInstance.on("comment:updated", (data: { campaignId: string; applicationId: string; issueId: string; status: string }) => {
      console.log("[Socket] Comment updated:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId, "comments"], refetchType: 'active' });
      // Invalidate influencer's issues list
      queryClient.invalidateQueries({ queryKey: ["/api/my-issues"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"], refetchType: 'active' });
      // Invalidate admin issues list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"], refetchType: 'active' });
    });

    socketInstance.on("comment:deleted", (data: { campaignId: string; applicationId: string }) => {
      console.log("[Socket] Comment deleted:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId, "comments"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/my-issues"], refetchType: 'active' });
    });

    socketInstance.on("application:created", (data: { campaignId: string; applicationId: string }) => {
      console.log("[Socket] Application created:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId], refetchType: 'active' });
    });

    socketInstance.on("application:updated", (data: { campaignId: string; applicationId: string; status?: string }) => {
      console.log("[Socket] Application updated:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/my-ids"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all-history"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId, "applications"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"], refetchType: 'active' });
    });

    socketInstance.on("influencer:updated", (data: { influencerId: string }) => {
      console.log("[Socket] Influencer updated:", data.influencerId);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"], refetchType: 'active' });
    });

    socketInstance.on("score:updated", (data: { influencerId: string; newScore: number; tier: string }) => {
      console.log("[Socket] Score updated:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"], refetchType: 'active' });
    });

    socketInstance.on("notification:created", (data: { influencerId: string }) => {
      console.log("[Socket] Notification created:", data.influencerId);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"], refetchType: 'active' });
    });

    // Global chat message handler - ensures messages are ALWAYS refreshed
    socketInstance.on("chat:message:new", (data: { roomId: string; message: { senderType: string } }) => {
      console.log("[Socket] Chat message received:", { roomId: data.roomId, sender: data.message?.senderType });
      // Invalidate the specific room's messages query
      queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/chat/room/${data.roomId}/messages`], 
        refetchType: 'active' 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/chat/room/${data.roomId}/messages`], 
        refetchType: 'active' 
      });
      // Invalidate chat room data for both admin and influencer views
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/admin/chat/room/') || 
            key === '/api/chat/room'
          );
        },
        refetchType: 'active'
      });
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/unread-count"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread-count"], refetchType: 'active' });
      // Invalidate influencers list for admin (updates unread badge on influencer cards)
      // Use predicate to match all influencers queries (includes pagination params)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/admin/influencers');
        },
        refetchType: 'active' 
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinCampaign = useCallback((campaignId: string) => {
    if (socket) {
      socket.emit("join:campaign", campaignId);
    }
  }, [socket]);

  const leaveCampaign = useCallback((campaignId: string) => {
    if (socket) {
      socket.emit("leave:campaign", campaignId);
    }
  }, [socket]);

  const joinUserRoom = useCallback(() => {
    if (socket) {
      // Disconnect and reconnect to get fresh session cookie
      console.log("[Socket] Reconnecting to refresh session...");
      socket.disconnect();
      socket.connect();
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinCampaign, leaveCampaign, joinUserRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export function useCampaignSocket(campaignId: string | undefined) {
  const { joinCampaign, leaveCampaign } = useSocket();

  useEffect(() => {
    if (campaignId) {
      joinCampaign(campaignId);
      return () => leaveCampaign(campaignId);
    }
  }, [campaignId, joinCampaign, leaveCampaign]);
}
