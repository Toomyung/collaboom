import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import type { SessionData } from "express-session";

let io: SocketIOServer | null = null;

export interface SocketEvents {
  "campaign:created": { campaignId: string };
  "campaign:updated": { campaignId: string };
  "campaign:deleted": { campaignId: string };
  "comment:created": { campaignId: string; applicationId: string };
  "comment:deleted": { campaignId: string; applicationId: string };
  "application:created": { campaignId: string; applicationId: string };
  "application:updated": { campaignId: string; applicationId: string; status?: string };
  "influencer:updated": { influencerId: string };
  "score:updated": { influencerId: string; newScore: number; tier: string };
  "notification:created": { influencerId: string };
}

export function initializeSocket(httpServer: HttpServer, sessionMiddleware: any): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket: Socket) => {
    const req = socket.request as any;
    const session: SessionData = req.session;

    if (session?.userId) {
      socket.join(`user:${session.userId}`);
      console.log(`[Socket.IO] User ${session.userId} joined room user:${session.userId}`);
      
      if (session.userType === "admin") {
        socket.join("admin");
      }
    }

    socket.join("public");

    socket.on("join:campaign", (campaignId: string) => {
      socket.join(`campaign:${campaignId}`);
    });

    socket.on("leave:campaign", (campaignId: string) => {
      socket.leave(`campaign:${campaignId}`);
    });

    socket.on("disconnect", () => {
    });
  });

  console.log("[Socket.IO] Initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitEvent<K extends keyof SocketEvents>(
  event: K,
  data: SocketEvents[K],
  rooms?: string | string[]
): void {
  if (!io) return;

  if (rooms) {
    const roomArray = Array.isArray(rooms) ? rooms : [rooms];
    roomArray.forEach((room) => {
      io!.to(room).emit(event, data);
    });
  } else {
    io.emit(event, data);
  }
}

export function emitCampaignCreated(campaignId: string): void {
  emitEvent("campaign:created", { campaignId }, "public");
}

export function emitCampaignUpdated(campaignId: string): void {
  emitEvent("campaign:updated", { campaignId }, ["public", `campaign:${campaignId}`]);
}

export function emitCampaignDeleted(campaignId: string): void {
  emitEvent("campaign:deleted", { campaignId }, "public");
}

export function emitCommentCreated(campaignId: string, applicationId: string): void {
  emitEvent("comment:created", { campaignId, applicationId }, `campaign:${campaignId}`);
}

export function emitCommentDeleted(campaignId: string, applicationId: string): void {
  emitEvent("comment:deleted", { campaignId, applicationId }, `campaign:${campaignId}`);
}

export function emitApplicationCreated(campaignId: string, applicationId: string): void {
  emitEvent("application:created", { campaignId, applicationId }, ["public", "admin", `campaign:${campaignId}`]);
}

export function emitApplicationUpdated(campaignId: string, applicationId: string, status?: string): void {
  emitEvent("application:updated", { campaignId, applicationId, status }, ["public", "admin", `campaign:${campaignId}`]);
}

export function emitInfluencerUpdated(influencerId: string): void {
  emitEvent("influencer:updated", { influencerId }, ["public", "admin"]);
}

export function emitScoreUpdated(influencerId: string, newScore: number, tier: string): void {
  emitEvent("score:updated", { influencerId, newScore, tier }, ["public", "admin"]);
}

export function emitNotificationCreated(influencerId: string): void {
  // Emit to the specific user's room for privacy and efficiency
  emitEvent("notification:created", { influencerId }, [`user:${influencerId}`]);
}

// Generic emit to a specific user
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Generic emit to all admins
export function emitToAdmins(event: string, data: any): void {
  if (!io) return;
  io.to("admin").emit(event, data);
}
