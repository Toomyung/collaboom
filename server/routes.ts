import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { updateProfileSchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Session types
declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: "influencer" | "admin";
  }
}

// Auth middleware
function requireAuth(userType?: "influencer" | "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (userType && req.session.userType !== userType) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "collaboom-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // =====================
  // CONFIG ROUTES
  // =====================

  // Get Supabase config (safe to expose anon key)
  app.get("/api/config/supabase", (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ message: "Supabase configuration missing" });
    }
    
    return res.json({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    });
  });

  // =====================
  // AUTH ROUTES
  // =====================

  // Supabase auth callback - sync Google login with backend session
  app.post("/api/auth/supabase/callback", async (req, res) => {
    try {
      const { user, accessToken } = req.body;
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "Invalid user data" });
      }

      // Check if influencer exists
      let influencer = await storage.getInfluencerByEmail(user.email);
      
      if (!influencer) {
        // Create new influencer from Google auth
        influencer = await storage.createInfluencerFromSupabase({
          email: user.email,
          supabaseId: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });
      } else {
        // Update existing influencer with Supabase info if needed
        if (!influencer.supabaseId) {
          await storage.updateInfluencer(influencer.id, {
            supabaseId: user.id,
            name: influencer.name || user.user_metadata?.full_name || user.user_metadata?.name || null,
            profileImageUrl: influencer.profileImageUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          });
          influencer = await storage.getInfluencer(influencer.id);
        }
      }

      if (!influencer) {
        return res.status(500).json({ message: "Failed to create or find influencer" });
      }

      // Set session
      req.session.userId = influencer.id;
      req.session.userType = "influencer";

      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        return res.json({ 
          success: true, 
          influencer: {
            id: influencer.id,
            email: influencer.email,
            name: influencer.name,
          }
        });
      });
    } catch (error: any) {
      console.error("Supabase callback error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null, influencer: null, admin: null });
    }

    if (req.session.userType === "influencer") {
      const influencer = await storage.getInfluencer(req.session.userId);
      if (!influencer) {
        req.session.destroy(() => {});
        return res.json({ user: null, influencer: null, admin: null });
      }
      return res.json({
        user: {
          id: influencer.id,
          email: influencer.email,
          name: influencer.name,
          role: "influencer",
        },
        influencer,
        admin: null,
      });
    }

    if (req.session.userType === "admin") {
      const admin = await storage.getAdmin(req.session.userId);
      if (!admin) {
        req.session.destroy(() => {});
        return res.json({ user: null, influencer: null, admin: null });
      }
      return res.json({
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: "admin",
        },
        influencer: null,
        admin,
      });
    }

    return res.json({ user: null, influencer: null, admin: null });
  });

  // Influencer registration
  app.post("/api/auth/influencer/register", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existing = await storage.getInfluencerByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const influencer = await storage.createInfluencer(email, passwordHash);

      req.session.userId = influencer.id;
      req.session.userType = "influencer";

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Influencer login
  app.post("/api/auth/influencer/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const influencer = await storage.getInfluencerByEmail(email);
      if (!influencer) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await (storage as any).verifyInfluencerPassword(influencer.id, password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = influencer.id;
      req.session.userType = "influencer";

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Admin login
  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await (storage as any).verifyAdminPassword(admin.id, password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = admin.id;
      req.session.userType = "admin";

      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Session save failed" });
        }
        return res.json({ success: true });
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    return res.json({ success: true });
  });

  // =====================
  // INFLUENCER ROUTES
  // =====================

  // Update influencer profile
  app.put("/api/me", requireAuth("influencer"), async (req, res) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      const influencer = await storage.updateInfluencer(req.session.userId!, data);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      return res.json(influencer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: error.message });
    }
  });

  // Get influencer notifications
  app.get("/api/me/notifications", requireAuth("influencer"), async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      
      const notifications = await storage.getNotificationsByInfluencer(
        req.session.userId!,
        { limit, offset }
      );
      
      return res.json(notifications);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get campaigns (public)
  app.get("/api/campaigns", async (req, res) => {
    const campaigns = await storage.getActiveCampaigns();
    return res.json(campaigns);
  });

  // Get single campaign (public)
  app.get("/api/campaigns/:id", async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    return res.json(campaign);
  });

  // Get influencer's applications
  app.get("/api/applications", requireAuth("influencer"), async (req, res) => {
    const applications = await storage.getApplicationsByInfluencer(req.session.userId!);
    return res.json(applications);
  });

  // Get influencer's applications with details
  app.get("/api/applications/detailed", requireAuth("influencer"), async (req, res) => {
    const applications = await storage.getApplicationsWithDetails(req.session.userId!);
    return res.json(applications);
  });

  // Apply to campaign
  app.post("/api/campaigns/:id/apply", requireAuth("influencer"), async (req, res) => {
    try {
      const campaignId = req.params.id;
      const influencerId = req.session.userId!;

      // Get influencer
      const influencer = await storage.getInfluencer(influencerId);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      // Check if profile is complete
      if (!influencer.profileCompleted) {
        return res.status(400).json({ message: "Please complete your profile first" });
      }

      // Check if restricted
      if (influencer.restricted) {
        return res.status(403).json({ message: "Your account is restricted" });
      }

      // Get campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Check campaign status
      if (campaign.status !== "active") {
        return res.status(400).json({ message: "Campaign is not accepting applications" });
      }

      // Check if already applied
      const existing = await storage.getApplicationByInfluencerAndCampaign(influencerId, campaignId);
      if (existing) {
        return res.status(400).json({ message: "You have already applied to this campaign" });
      }

      // Create application
      const application = await storage.createApplication({
        campaignId,
        influencerId,
      });

      return res.json(application);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Cancel application
  app.post("/api/applications/:id/cancel", requireAuth("influencer"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.influencerId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (application.status !== "pending") {
        return res.status(400).json({ message: "Only pending applications can be cancelled" });
      }

      // For now, we'll just delete the application from the in-memory storage
      // In a real DB, you might want to keep a record with cancelled status
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Report issue
  app.post("/api/applications/:id/report-issue", requireAuth("influencer"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.influencerId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { message } = req.body;
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Create shipping issue in storage
      const issue = await storage.createShippingIssue({
        applicationId: application.id,
        influencerId: application.influencerId,
        campaignId: application.campaignId,
        message: message.trim(),
      });

      return res.json({ success: true, issue });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get issues for an application (influencer)
  app.get("/api/applications/:id/issues", requireAuth("influencer"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.influencerId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const issues = await storage.getShippingIssuesByApplication(req.params.id);
      return res.json(issues);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // ADMIN ROUTES
  // =====================

  // Admin stats
  app.get("/api/admin/stats", requireAuth("admin"), async (req, res) => {
    const stats = await storage.getAdminStats();
    return res.json(stats);
  });

  // Admin activity (mock)
  app.get("/api/admin/activity", requireAuth("admin"), async (req, res) => {
    return res.json([]);
  });

  // Get all campaigns (admin)
  app.get("/api/admin/campaigns", requireAuth("admin"), async (req, res) => {
    const campaigns = await storage.getAllCampaigns();
    return res.json(campaigns);
  });

  // Get single campaign (admin)
  app.get("/api/admin/campaigns/:id", requireAuth("admin"), async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    return res.json(campaign);
  });

  // Get campaign applications (admin)
  app.get("/api/admin/campaigns/:id/applications", requireAuth("admin"), async (req, res) => {
    const applications = await storage.getApplicationsWithDetailsByCampaign(req.params.id);
    return res.json(applications);
  });

  // Create campaign
  app.post("/api/admin/campaigns", requireAuth("admin"), async (req, res) => {
    try {
      const data = insertCampaignSchema.parse({
        ...req.body,
        createdByAdminId: req.session.userId,
      });
      const campaign = await storage.createCampaign(data);
      return res.json(campaign);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: error.message });
    }
  });

  // Update campaign
  app.put("/api/admin/campaigns/:id", requireAuth("admin"), async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      return res.json(campaign);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Approve application
  app.post("/api/admin/applications/:id/approve", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Guard against duplicate approval calls
      if (application.status === "approved" || application.status === "shipped" || 
          application.status === "delivered" || application.status === "uploaded" || 
          application.status === "completed") {
        return res.status(400).json({ message: "Application is already approved" });
      }

      if (application.status !== "pending") {
        return res.status(400).json({ message: "Application cannot be approved from current status" });
      }

      // Get campaign to check inventory (re-fetch to get latest count)
      const campaign = await storage.getCampaign(application.campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Strict inventory check
      if ((campaign.approvedCount ?? 0) >= campaign.inventory) {
        return res.status(400).json({ message: "Campaign is full - no more inventory available" });
      }

      // Update application status first
      const updatedApp = await storage.updateApplication(application.id, {
        status: "approved",
        approvedAt: new Date(),
      });
      
      if (!updatedApp) {
        return res.status(500).json({ message: "Failed to update application" });
      }

      // Increment campaign count
      await storage.incrementCampaignApprovedCount(campaign.id);

      // Create shipping record (only if doesn't exist)
      const existingShipping = await storage.getShippingByApplication(application.id);
      if (!existingShipping) {
        await storage.createShipping({ applicationId: application.id });
      }

      // Log notification for approval
      await storage.createNotification({
        influencerId: application.influencerId,
        campaignId: application.campaignId,
        applicationId: application.id,
        type: "approved",
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Reject application
  app.post("/api/admin/applications/:id/reject", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Guard against rejecting already processed applications
      if (application.status === "rejected") {
        return res.status(400).json({ message: "Application is already rejected" });
      }

      // Can only reject pending applications
      if (application.status !== "pending") {
        return res.status(400).json({ message: "Only pending applications can be rejected" });
      }

      await storage.updateApplication(application.id, {
        status: "rejected",
        rejectedAt: new Date(),
      });

      // Log notification for rejection
      await storage.createNotification({
        influencerId: application.influencerId,
        campaignId: application.campaignId,
        applicationId: application.id,
        type: "rejected",
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Revoke approval (admin can undo an approval)
  app.post("/api/admin/applications/:id/revoke", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Can only revoke approved applications that haven't shipped yet
      if (application.status !== "approved") {
        return res.status(400).json({ message: "Can only revoke approved applications before shipping" });
      }

      // Get campaign and decrement count
      const campaign = await storage.getCampaign(application.campaignId);
      if (campaign) {
        await storage.decrementCampaignApprovedCount(campaign.id);
      }

      // Reset application to pending
      await storage.updateApplication(application.id, {
        status: "pending",
        approvedAt: null,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Bulk approve
  app.post("/api/admin/applications/bulk-approve", requireAuth("admin"), async (req, res) => {
    try {
      const { applicationIds } = req.body;
      if (!Array.isArray(applicationIds)) {
        return res.status(400).json({ message: "applicationIds must be an array" });
      }

      let approved = 0;
      let skipped = 0;
      
      // Use Set to ensure no duplicate IDs are processed
      const uniqueIds = Array.from(new Set<string>(applicationIds));

      for (const id of uniqueIds) {
        const application = await storage.getApplication(id);
        
        // Skip if not found or not pending
        if (!application || application.status !== "pending") {
          skipped++;
          continue;
        }
        
        // Re-fetch campaign for latest count
        const campaign = await storage.getCampaign(application.campaignId);
        if (!campaign || (campaign.approvedCount ?? 0) >= campaign.inventory) {
          skipped++;
          continue;
        }
        
        // Update application
        await storage.updateApplication(id, {
          status: "approved",
          approvedAt: new Date(),
        });
        
        // Increment campaign count
        await storage.incrementCampaignApprovedCount(campaign.id);
        
        // Create shipping record only if doesn't exist
        const existingShipping = await storage.getShippingByApplication(id);
        if (!existingShipping) {
          await storage.createShipping({ applicationId: id });
        }
        
        approved++;
      }

      return res.json({ success: true, approved, skipped });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Upload shipping CSV
  app.post("/api/admin/campaigns/:id/shipping/upload-csv", requireAuth("admin"), async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ message: "CSV data is required" });
      }

      const lines = csvData.trim().split("\n");
      const header = lines[0].toLowerCase();
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(",");
        if (parts.length < 4) continue;
        
        const [email, trackingNumber, courier, shippedDate, deliveredDate] = parts.map((p: string) => p.trim());
        
        // Find influencer by email
        const influencer = await storage.getInfluencerByEmail(email);
        if (!influencer) continue;
        
        // Find their application for this campaign
        const application = await storage.getApplicationByInfluencerAndCampaign(
          influencer.id,
          req.params.id
        );
        if (!application || application.status !== "approved") continue;
        
        // Update shipping
        const shippedAt = shippedDate ? new Date(shippedDate) : new Date();
        const deliveredAt = deliveredDate ? new Date(deliveredDate) : null;
        
        await storage.updateShippingByApplication(application.id, {
          trackingNumber,
          courier,
          status: deliveredAt ? "delivered" : "shipped",
          shippedAt,
          deliveredAt,
        });
        
        // Update application status
        await storage.updateApplication(application.id, {
          status: deliveredAt ? "delivered" : "shipped",
          shippedAt,
          deliveredAt,
        });

        // Log shipping notification
        await storage.createNotification({
          influencerId: influencer.id,
          campaignId: req.params.id,
          applicationId: application.id,
          type: deliveredAt ? "shipping_delivered" : "shipping_shipped",
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Mark upload as verified
  app.post("/api/admin/uploads/:applicationId/mark-uploaded", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Update application status
      await storage.updateApplication(application.id, {
        status: "uploaded",
        uploadedAt: new Date(),
      });

      // Get or create upload record
      let upload = await storage.getUploadByApplication(application.id);
      if (!upload) {
        upload = await storage.createUpload({ applicationId: application.id });
      }
      await storage.updateUploadByApplication(application.id, {
        status: "verified",
        verifiedAt: new Date(),
      });

      // Award score
      const influencer = await storage.getInfluencer(application.influencerId);
      if (influencer) {
        let scoreBonus = 10; // Base score for completing
        
        // First time bonus
        if (application.firstTime) {
          scoreBonus += 5;
          await storage.addScoreEvent({
            influencerId: influencer.id,
            campaignId: application.campaignId,
            applicationId: application.id,
            delta: 5,
            reason: "first_upload",
          });
        }
        
        await storage.addScoreEvent({
          influencerId: influencer.id,
          campaignId: application.campaignId,
          applicationId: application.id,
          delta: 10,
          reason: "upload_success",
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Mark as missed deadline
  app.post("/api/admin/uploads/:applicationId/mark-missed", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Update application status
      await storage.updateApplication(application.id, {
        status: "deadline_missed",
        deadlineMissedAt: new Date(),
      });

      // Update upload record
      let upload = await storage.getUploadByApplication(application.id);
      if (!upload) {
        upload = await storage.createUpload({ applicationId: application.id });
      }
      await storage.updateUploadByApplication(application.id, {
        status: "missed",
      });

      // Check if this is first-time ghosting (influencer has no completed campaigns)
      const influencer = await storage.getInfluencer(application.influencerId);
      if (influencer) {
        // Check for previous completed applications to detect first-time ghosting
        const allApplications = await storage.getApplicationsByInfluencer(influencer.id);
        const hasCompletedBefore = allApplications.some(app => 
          app.id !== application.id && app.status === "completed"
        );
        
        // First-time ghosting: penalty +5 and immediate restriction
        // Subsequent misses: penalty +1
        const isFirstTimeGhosting = !hasCompletedBefore && (influencer.penalty ?? 0) === 0;
        const penaltyAmount = isFirstTimeGhosting ? 5 : 1;
        
        await storage.addPenaltyEvent({
          influencerId: influencer.id,
          campaignId: application.campaignId,
          applicationId: application.id,
          delta: penaltyAmount,
          reason: isFirstTimeGhosting ? "first_ghosting" : "deadline_missed",
        });

        // Log notification for tracking
        await storage.createNotification({
          influencerId: influencer.id,
          campaignId: application.campaignId,
          applicationId: application.id,
          type: isFirstTimeGhosting ? "account_restricted" : "deadline_missed",
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get all influencers (admin) with pagination
  app.get("/api/admin/influencers", requireAuth("admin"), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(50, parseInt(req.query.pageSize as string) || 20);
      const search = req.query.search as string | undefined;
      const campaignId = req.query.campaignId as string | undefined;

      const result = await storage.getInfluencersPaginated({
        page,
        pageSize,
        search,
        campaignId,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("Error fetching influencers:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Adjust influencer score
  app.post("/api/admin/influencers/:id/score", requireAuth("admin"), async (req, res) => {
    try {
      const { delta, reason } = req.body;
      if (typeof delta !== "number") {
        return res.status(400).json({ message: "delta must be a number" });
      }

      await storage.addScoreEvent({
        influencerId: req.params.id,
        delta,
        reason: reason || "admin_manual",
        createdByAdminId: req.session.userId,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Adjust influencer penalty
  app.post("/api/admin/influencers/:id/penalty", requireAuth("admin"), async (req, res) => {
    try {
      const { delta, reason } = req.body;
      if (typeof delta !== "number") {
        return res.status(400).json({ message: "delta must be a number" });
      }

      await storage.addPenaltyEvent({
        influencerId: req.params.id,
        delta,
        reason: reason || "admin_manual",
        createdByAdminId: req.session.userId,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Unlock influencer account
  app.post("/api/admin/influencers/:id/unlock", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      await storage.updateInfluencer(req.params.id, {
        restricted: false,
        penalty: 0,
      });

      // Add rollback event
      await storage.addPenaltyEvent({
        influencerId: req.params.id,
        delta: -(influencer.penalty ?? 0),
        reason: "rollback",
        createdByAdminId: req.session.userId,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // ADMIN NOTES
  // =====================

  // Get admin notes for an influencer
  app.get("/api/admin/influencers/:id/notes", requireAuth("admin"), async (req, res) => {
    try {
      const notes = await storage.getNotesByInfluencer(req.params.id);
      return res.json(notes);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Add admin note for an influencer
  app.post("/api/admin/influencers/:id/notes", requireAuth("admin"), async (req, res) => {
    try {
      const { note, campaignId, applicationId } = req.body;
      if (!note || typeof note !== "string" || note.trim().length === 0) {
        return res.status(400).json({ message: "Note content is required" });
      }

      const newNote = await storage.addAdminNote({
        influencerId: req.params.id,
        adminId: req.session.userId!,
        note: note.trim(),
        campaignId: campaignId || undefined,
        applicationId: applicationId || undefined,
      });

      return res.json(newNote);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // SCORE/PENALTY HISTORY
  // =====================

  // Get score events for an influencer
  app.get("/api/admin/influencers/:id/score-events", requireAuth("admin"), async (req, res) => {
    try {
      const events = await storage.getScoreEventsByInfluencer(req.params.id);
      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get penalty events for an influencer
  app.get("/api/admin/influencers/:id/penalty-events", requireAuth("admin"), async (req, res) => {
    try {
      const events = await storage.getPenaltyEventsByInfluencer(req.params.id);
      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get applications for an influencer (for history view)
  app.get("/api/admin/influencers/:id/applications", requireAuth("admin"), async (req, res) => {
    try {
      const applications = await storage.getApplicationsByInfluencer(req.params.id);
      // Enrich with campaign data
      const enriched = await Promise.all(
        applications.map(async (app) => {
          const campaign = await storage.getCampaign(app.campaignId);
          return { ...app, campaign };
        })
      );
      return res.json(enriched);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // SHIPPING ISSUES (ADMIN)
  // =====================

  // Get all open shipping issues
  app.get("/api/admin/issues", requireAuth("admin"), async (req, res) => {
    try {
      const issues = await storage.getAllOpenShippingIssues();
      return res.json(issues);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Resolve a shipping issue
  app.post("/api/admin/issues/:id/resolve", requireAuth("admin"), async (req, res) => {
    try {
      const { response } = req.body;
      
      const issue = await storage.updateShippingIssue(req.params.id, {
        status: "resolved",
        resolvedByAdminId: req.session.userId,
        resolvedAt: new Date(),
        adminResponse: response || null,
      });

      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      return res.json({ success: true, issue });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Dismiss a shipping issue
  app.post("/api/admin/issues/:id/dismiss", requireAuth("admin"), async (req, res) => {
    try {
      const { response } = req.body;
      
      const issue = await storage.updateShippingIssue(req.params.id, {
        status: "dismissed",
        resolvedByAdminId: req.session.userId,
        resolvedAt: new Date(),
        adminResponse: response || null,
      });

      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      return res.json({ success: true, issue });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
