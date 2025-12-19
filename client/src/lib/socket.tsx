import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { queryClient } from "./queryClient";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinCampaign: () => {},
  leaveCampaign: () => {},
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
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("[Socket] Disconnected");
    });

    socketInstance.on("campaign:created", (data: { campaignId: string }) => {
      console.log("[Socket] Campaign created:", data.campaignId);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    });

    socketInstance.on("campaign:updated", (data: { campaignId: string }) => {
      console.log("[Socket] Campaign updated:", data.campaignId);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId] });
    });

    socketInstance.on("campaign:deleted", (data: { campaignId: string }) => {
      console.log("[Socket] Campaign deleted:", data.campaignId);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    });

    socketInstance.on("comment:created", (data: { campaignId: string; applicationId: string }) => {
      console.log("[Socket] Comment created:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId, "comments"] });
    });

    socketInstance.on("comment:deleted", (data: { campaignId: string; applicationId: string }) => {
      console.log("[Socket] Comment deleted:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId, "comments"] });
    });

    socketInstance.on("application:created", (data: { campaignId: string; applicationId: string }) => {
      console.log("[Socket] Application created:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId] });
    });

    socketInstance.on("application:updated", (data: { campaignId: string; applicationId: string; status?: string }) => {
      console.log("[Socket] Application updated:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/my-ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/all-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", data.applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", data.campaignId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    });

    socketInstance.on("influencer:updated", (data: { influencerId: string }) => {
      console.log("[Socket] Influencer updated:", data.influencerId);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    });

    socketInstance.on("score:updated", (data: { influencerId: string; newScore: number; tier: string }) => {
      console.log("[Socket] Score updated:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    });

    socketInstance.on("notification:created", (data: { influencerId: string }) => {
      console.log("[Socket] Notification created:", data.influencerId);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
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

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinCampaign, leaveCampaign }}>
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
