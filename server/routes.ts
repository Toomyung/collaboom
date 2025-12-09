import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { updateProfileSchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendApplicationApprovedEmail, sendShippingNotificationEmail, sendAdminReplyEmail, sendUploadVerifiedEmail, sendSupportTicketResponseEmail, sendAccountSuspendedEmail, sendAccountUnsuspendedEmail, sendAccountBlockedEmail, sendDirectAdminEmail, sendTierUpgradeEmail } from "./emailService";
import { ensureBucketExists, uploadMultipleImages, isBase64Image, listAllStorageImages, deleteImagesFromStorage, extractFilePathFromUrl } from "./supabaseStorage";
import {
  authLimiter,
  strictAuthLimiter,
  uploadLimiter,
  loginSchema,
  noteSchema,
  issueReportSchema,
  scoreAdjustmentSchema,
  shippingSchema,
  bulkApproveSchema,
  csvUploadSchema,
  issueResponseSchema,
  sanitizeObject,
  sanitizeString,
  paramValidator,
  validateUUID,
  logSecurityEvent,
} from "./security";

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
  // Trust proxy - required for secure cookies and rate limiting behind Replit proxy
  // Replit uses proxies in both development and production
  app.set("trust proxy", 1);

  // Validate required secrets in production
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (isProduction && !sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  // Session middleware with secure configuration
  app.use(
    session({
      secret: sessionSecret || "dev-only-secret-key-not-for-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction, // HTTPS only in production
        httpOnly: true, // Prevent XSS access to cookie
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax", // CSRF protection - blocks cross-site POST requests
      },
    })
  );

  // =====================
  // CONFIG ROUTES
  // =====================

  // Test email endpoint (development only)
  app.post("/api/test/send-email", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not available in production" });
    }
    
    const { type } = req.body;
    
    // Test IDs for consistent threading in tests
    const testInfluencerId = "test-influencer-001";
    const testCampaignId = "test-campaign-001";
    
    try {
      if (type === "welcome") {
        const result = await sendWelcomeEmail("hello@collaboom.io", "Test User");
        return res.json({ success: true, result });
      } else if (type === "approval") {
        const result = await sendApplicationApprovedEmail(
          "hello@collaboom.io",
          "Test User",
          "Summer K-Beauty Campaign",
          "Glow Beauty"
        );
        return res.json({ success: true, result });
      } else if (type === "shipping") {
        const result = await sendShippingNotificationEmail(
          "hello@collaboom.io",
          "Test User",
          "Summer K-Beauty Campaign",
          "Glow Beauty",
          "FedEx",
          "123456789012",
          "https://fedex.com/track/123456789012"
        );
        return res.json({ success: true, result });
      }
      
      return res.status(400).json({ message: "Invalid email type. Use: welcome, approval, or shipping" });
    } catch (error) {
      console.error("Test email error:", error);
      return res.status(500).json({ message: "Failed to send test email", error: String(error) });
    }
  });

  // Get auth provider config (safe to expose public key)
  app.get("/api/config/auth", (req, res) => {
    const providerUrl = process.env.SUPABASE_URL;
    const publicKey = process.env.SUPABASE_ANON_KEY;
    
    if (!providerUrl || !publicKey) {
      return res.status(500).json({ message: "Authentication configuration unavailable" });
    }
    
    // Cache for 1 hour - config doesn't change frequently
    res.set('Cache-Control', 'public, max-age=3600');
    
    return res.json({
      url: providerUrl,
      anonKey: publicKey,
    });
  });

  // =====================
  // AUTH ROUTES
  // =====================

  // Supabase auth callback - sync Google login with backend session
  app.post("/api/auth/supabase/callback", async (req, res) => {
    const startTime = Date.now();
    try {
      const { user, accessToken } = req.body;
      
      if (!user || !user.email || !user.id) {
        return res.status(400).json({ message: "Invalid user data" });
      }

      // First try to find influencer by Supabase ID (most reliable)
      const t1 = Date.now();
      let influencer = await storage.getInfluencerBySupabaseId(user.id);
      console.log(`[Auth Timing] getInfluencerBySupabaseId: ${Date.now() - t1}ms`);
      
      if (!influencer) {
        // Fallback: Check by email (for legacy accounts or email changes)
        const t2 = Date.now();
        influencer = await storage.getInfluencerByEmail(user.email);
        console.log(`[Auth Timing] getInfluencerByEmail: ${Date.now() - t2}ms`);
        
        if (!influencer) {
          // Check if this email is banned (deleted users cannot sign up again)
          const isBanned = await storage.isBannedEmail(user.email);
          if (isBanned) {
            return res.status(403).json({ 
              message: "This email address has been permanently banned from Collaboom. Please contact hello@toomyungpeople.com if you believe this is an error.",
              banned: true
            });
          }

          // Create new influencer from Google auth
          const t3 = Date.now();
          influencer = await storage.createInfluencerFromSupabase({
            email: user.email,
            supabaseId: user.id,
            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          });
          console.log(`[Auth Timing] createInfluencerFromSupabase: ${Date.now() - t3}ms`);
          
          // Award signup bonus points (+50)
          await storage.addScoreEvent({
            influencerId: influencer.id,
            delta: 50,
            reason: "signup_bonus",
          });
          // Refresh influencer to get updated score
          influencer = await storage.getInfluencer(influencer.id) || influencer;
          console.log(`[Auth] Signup bonus +50 points awarded to ${user.email}`);
          
          // Send welcome email for new signups (non-blocking)
          const influencerName = influencer.name || user.user_metadata?.full_name || "Creator";
          sendWelcomeEmail(user.email, influencerName).catch(err => {
            console.error("Failed to send welcome email:", err);
          });
        } else {
          // Update existing influencer with Supabase info
          const t4 = Date.now();
          await storage.updateInfluencer(influencer.id, {
            supabaseId: user.id,
            name: influencer.name || user.user_metadata?.full_name || user.user_metadata?.name || null,
            profileImageUrl: influencer.profileImageUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          });
          influencer = await storage.getInfluencer(influencer.id);
          console.log(`[Auth Timing] updateInfluencer + refetch: ${Date.now() - t4}ms`);
        }
      } else {
        // Influencer found by supabaseId - update profile image if changed
        if (user.user_metadata?.avatar_url && influencer.profileImageUrl !== user.user_metadata.avatar_url) {
          const t5 = Date.now();
          await storage.updateInfluencer(influencer.id, {
            profileImageUrl: user.user_metadata.avatar_url,
          });
          influencer = await storage.getInfluencer(influencer.id);
          console.log(`[Auth Timing] update profile image: ${Date.now() - t5}ms`);
        }
      }

      if (!influencer) {
        return res.status(500).json({ message: "Failed to create or find influencer" });
      }

      // Set session
      req.session.userId = influencer.id;
      req.session.userType = "influencer";

      // Explicitly save session before responding
      const t6 = Date.now();
      req.session.save((err) => {
        console.log(`[Auth Timing] session.save: ${Date.now() - t6}ms`);
        console.log(`[Auth Timing] TOTAL: ${Date.now() - startTime}ms`);
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

  // Note: Influencer registration/login is only via Google Sign-In (Supabase OAuth)
  // See /api/auth/supabase/callback for the Google login flow

  // Admin login
  app.post("/api/auth/admin/login", strictAuthLimiter, async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        logSecurityEvent('admin_login_validation_failed', { ip: req.ip });
        return res.status(400).json({ message: "Invalid input" });
      }

      const { email, password } = validationResult.data;

      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        logSecurityEvent('admin_login_unknown_email', { ip: req.ip });
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await (storage as any).verifyAdminPassword(admin.id, password);
      if (!valid) {
        logSecurityEvent('admin_login_wrong_password', { ip: req.ip, adminId: admin.id });
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = admin.id;
      req.session.userType = "admin";

      logSecurityEvent('admin_login_success', { ip: req.ip, adminId: admin.id });

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Session save failed" });
        }
        return res.json({ success: true });
      });
    } catch (error: any) {
      logSecurityEvent('admin_login_error', { ip: req.ip, error: error.message });
      return res.status(500).json({ message: "Login failed" });
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
      
      // Validate social handles - only allow English letters, numbers, underscores, and periods
      const socialHandleRegex = /^[a-zA-Z0-9_.]+$/;
      
      if (data.tiktokHandle && !socialHandleRegex.test(data.tiktokHandle)) {
        return res.status(400).json({ 
          message: "TikTok handle can only contain English letters, numbers, underscores, and periods.",
          field: "tiktokHandle"
        });
      }
      
      if (data.instagramHandle && !socialHandleRegex.test(data.instagramHandle)) {
        return res.status(400).json({ 
          message: "Instagram handle can only contain English letters, numbers, underscores, and periods.",
          field: "instagramHandle"
        });
      }
      
      // Check if TikTok handle is already taken by another user
      if (data.tiktokHandle) {
        const existingInfluencer = await storage.getInfluencerByTiktokHandle(data.tiktokHandle);
        if (existingInfluencer && existingInfluencer.id !== req.session.userId) {
          return res.status(400).json({ 
            message: "This TikTok handle is already registered by another user. Please use a different handle.",
            field: "tiktokHandle"
          });
        }
      }
      
      // Check if Instagram handle is already taken by another user
      if (data.instagramHandle) {
        const existingInfluencer = await storage.getInfluencerByInstagramHandle(data.instagramHandle);
        if (existingInfluencer && existingInfluencer.id !== req.session.userId) {
          return res.status(400).json({ 
            message: "This Instagram handle is already registered by another user. Please use a different handle.",
            field: "instagramHandle"
          });
        }
      }
      
      // Get current influencer data to check if address is being completed for the first time
      const currentInfluencer = await storage.getInfluencer(req.session.userId!);
      if (!currentInfluencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      
      // Check if address is being completed (all required address fields present in update)
      const isAddressComplete = data.addressLine1 && data.city && data.state && data.zipCode;
      const wasAddressIncomplete = !currentInfluencer.addressLine1 || !currentInfluencer.city || 
                                   !currentInfluencer.state || !currentInfluencer.zipCode;
      
      // Maintain backward compatibility: populate legacy 'name' field from firstName + lastName
      const updateData = {
        ...data,
        name: data.firstName && data.lastName 
          ? `${data.firstName} ${data.lastName}` 
          : data.firstName || data.lastName || currentInfluencer.name,
      };
      
      const influencer = await storage.updateInfluencer(req.session.userId!, updateData);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      
      // Award address completion bonus (+10) only once - first time address is completed
      let pointsAwarded = 0;
      if (isAddressComplete && wasAddressIncomplete) {
        // Check if address bonus was already awarded
        const existingEvents = await storage.getScoreEventsByInfluencer(req.session.userId!);
        const hasAddressBonus = existingEvents.some(e => e.reason === "address_completion");
        
        if (!hasAddressBonus) {
          await storage.addScoreEvent({
            influencerId: req.session.userId!,
            delta: 10,
            reason: "address_completion",
          });
          pointsAwarded = 10;
          console.log(`[Profile] Address completion bonus +10 points awarded to ${influencer.email}`);
        }
      }
      
      return res.json({ ...influencer, pointsAwarded });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      // Handle database unique constraint errors
      if (error.message?.includes("unique constraint") && error.message?.includes("tiktok_handle")) {
        return res.status(400).json({ 
          message: "This TikTok handle is already registered by another user. Please use a different handle.",
          field: "tiktokHandle"
        });
      }
      if (error.message?.includes("unique constraint") && error.message?.includes("instagram_handle")) {
        return res.status(400).json({ 
          message: "This Instagram handle is already registered by another user. Please use a different handle.",
          field: "instagramHandle"
        });
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

  // Get influencer's own score events (transparency feature)
  // Combines both score events (additions) and penalty events (deductions shown as negative)
  app.get("/api/me/score-events", requireAuth("influencer"), async (req, res) => {
    try {
      const scoreEvents = await storage.getScoreEventsByInfluencer(req.session.userId!);
      const penaltyEvents = await storage.getPenaltyEventsByInfluencer(req.session.userId!);
      
      // Enrich score events with campaign information
      const enrichedScoreEvents = await Promise.all(scoreEvents.map(async (event) => {
        let campaign = null;
        if (event.campaignId) {
          campaign = await storage.getCampaign(event.campaignId);
        }
        return {
          ...event,
          type: 'score' as const,
          campaign: campaign ? { id: campaign.id, name: campaign.name, brandName: campaign.brandName } : null
        };
      }));
      
      // Convert penalty events to negative score events for display
      const enrichedPenaltyEvents = await Promise.all(penaltyEvents.map(async (event) => {
        let campaign = null;
        if (event.campaignId) {
          campaign = await storage.getCampaign(event.campaignId);
        }
        return {
          ...event,
          delta: -event.delta, // Make delta negative for display
          type: 'penalty' as const,
          seenAt: null, // Penalty events don't have seenAt
          campaign: campaign ? { id: campaign.id, name: campaign.name, brandName: campaign.brandName } : null
        };
      }));
      
      // Combine and sort by createdAt (newest first)
      const allEvents = [...enrichedScoreEvents, ...enrichedPenaltyEvents].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      return res.json(allEvents);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get influencer's own penalty events (transparency feature)
  app.get("/api/me/penalty-events", requireAuth("influencer"), async (req, res) => {
    try {
      const events = await storage.getPenaltyEventsByInfluencer(req.session.userId!);
      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get unseen score events for popup notifications
  app.get("/api/me/score-events/unseen", requireAuth("influencer"), async (req, res) => {
    try {
      const events = await storage.getUnseenScoreEvents(req.session.userId!);
      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Mark score events as seen
  app.post("/api/me/score-events/mark-seen", requireAuth("influencer"), async (req, res) => {
    try {
      const { eventIds } = req.body;
      if (!Array.isArray(eventIds)) {
        return res.status(400).json({ message: "eventIds must be an array" });
      }
      await storage.markScoreEventsAsSeen(eventIds);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Clear pending tier upgrade (after showing celebration popup)
  app.post("/api/me/clear-tier-upgrade", requireAuth("influencer"), async (req, res) => {
    try {
      await storage.updateInfluencer(req.session.userId!, { pendingTierUpgrade: null });
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get influencer's reported issues (to view admin responses)
  app.get("/api/my-issues", requireAuth("influencer"), async (req, res) => {
    try {
      const issues = await storage.getShippingIssuesByInfluencer(req.session.userId!);
      return res.json(issues);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get campaigns (public) - with optional pagination and field selection
  app.get("/api/campaigns", async (req, res) => {
    const startTime = Date.now();
    const page = parseInt(req.query.page as string) || undefined;
    const pageSize = parseInt(req.query.pageSize as string) || 12;
    const minimal = req.query.minimal === 'true';
    
    // If no pagination requested, return all (backward compatible)
    if (!page) {
      const campaigns = await storage.getActiveCampaigns();
      // If minimal, strip heavy fields for list view - only return first thumbnail
      if (minimal) {
        const minimalCampaigns = campaigns.map(c => {
          // Get only the first image for thumbnail (much smaller payload)
          const thumbnailUrl = c.imageUrls?.[0] || c.imageUrl || null;
          return {
            id: c.id,
            name: c.name,
            brandName: c.brandName,
            productName: c.productName,
            campaignType: c.campaignType || 'gifting',
            category: c.category,
            rewardType: c.rewardType,
            rewardAmount: c.rewardAmount,
            inventory: c.inventory,
            approvedCount: c.approvedCount,
            thumbnailUrl, // Single thumbnail instead of full imageUrls array
            status: c.status,
            deadline: c.deadline,
            applicationDeadline: c.applicationDeadline,
          };
        });
        const duration = Date.now() - startTime;
        const responseSize = JSON.stringify(minimalCampaigns).length;
        console.log(`[PERF] GET /api/campaigns?minimal=true - ${duration}ms, ${campaigns.length} items, ${(responseSize / 1024).toFixed(1)}KB`);
        return res.json(minimalCampaigns);
      }
      const duration = Date.now() - startTime;
      console.log(`[PERF] GET /api/campaigns - ${duration}ms, ${campaigns.length} items`);
      return res.json(campaigns);
    }
    
    // Paginated response
    const result = await storage.getActiveCampaignsPaginated({ page, pageSize });
    
    // If minimal, strip heavy fields - only return first thumbnail
    if (minimal) {
      result.items = result.items.map(c => {
        const thumbnailUrl = c.imageUrls?.[0] || c.imageUrl || null;
        return {
          id: c.id,
          name: c.name,
          brandName: c.brandName,
          productName: c.productName,
          campaignType: c.campaignType || 'gifting',
          category: c.category,
          rewardType: c.rewardType,
          rewardAmount: c.rewardAmount,
          inventory: c.inventory,
          approvedCount: c.approvedCount,
          thumbnailUrl,
          status: c.status,
          deadline: c.deadline,
          applicationDeadline: c.applicationDeadline,
        };
      }) as any;
    }
    
    return res.json(result);
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

  // Get just the campaign IDs the influencer has applied to (lightweight)
  app.get("/api/applications/my-ids", requireAuth("influencer"), async (req, res) => {
    const applications = await storage.getApplicationsByInfluencer(req.session.userId!);
    const campaignIds = applications.map(a => a.campaignId);
    return res.json(campaignIds);
  });

  // Get influencer's applications with details
  app.get("/api/applications/detailed", requireAuth("influencer"), async (req, res) => {
    const applications = await storage.getApplicationsWithDetails(req.session.userId!);
    return res.json(applications);
  });

  // Get all application history (including dismissed ones)
  app.get("/api/applications/all-history", requireAuth("influencer"), async (req, res) => {
    const applications = await storage.getAllApplicationsHistory(req.session.userId!);
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

      // Check if suspended
      if (influencer.suspended) {
        return res.status(403).json({ message: "Your account is suspended" });
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

      // Check PayPal requirement for paid campaigns
      const isPaidCampaign = campaign.campaignType === "product_cost_covered" || campaign.campaignType === "amazon_video";
      if (isPaidCampaign && !influencer.paypalEmail) {
        return res.status(400).json({ 
          message: "PayPal email required for paid campaigns. Please add your PayPal email in your profile to apply for this campaign.",
          requiresPaypal: true
        });
      }

      // Check application deadline
      const applicationDeadline = campaign.applicationDeadline 
        ? new Date(campaign.applicationDeadline) 
        : new Date(campaign.deadline);
      if (applicationDeadline.getTime() < Date.now()) {
        return res.status(400).json({ message: "The application deadline has passed" });
      }

      // Check if already applied
      const existing = await storage.getApplicationByInfluencerAndCampaign(influencerId, campaignId);
      if (existing) {
        return res.status(400).json({ message: "You have already applied to this campaign" });
      }

      // Tier-based restrictions
      // Tier definitions:
      // - Starting: completedCampaigns === 0 OR score < 50
      // - Standard: completedCampaigns >= 1 AND score >= 50 AND score < 85
      // - VIP: completedCampaigns >= 1 AND score >= 85
      const completedCampaigns = influencer.completedCampaigns ?? 0;
      const score = influencer.score ?? 0;
      const isStartingInfluencer = completedCampaigns === 0 || score < 50;
      const isVIP = completedCampaigns >= 1 && score >= 85;

      // Starting influencer: can only have 1 active campaign at a time
      if (isStartingInfluencer) {
        const existingApplications = await storage.getApplicationsByInfluencer(influencerId);
        const activeApplications = existingApplications.filter(app => 
          !["rejected", "uploaded", "completed", "deadline_missed"].includes(app.status)
        );
        if (activeApplications.length > 0) {
          return res.status(400).json({ 
            message: "As a Starting Influencer, you can only work on one campaign at a time. Complete your current campaign to apply to more!" 
          });
        }
      }

      // Create application
      const application = await storage.createApplication({
        campaignId,
        influencerId,
      });

      // VIP auto-approval: automatically approve without admin review
      if (isVIP) {
        await storage.updateApplication(application.id, {
          status: "approved",
          approvedAt: new Date(),
        });
        
        // Increment campaign approved count
        await storage.updateCampaign(campaignId, {
          approvedCount: (campaign.approvedCount ?? 0) + 1,
        });

        // Send approval email (non-blocking)
        sendApplicationApprovedEmail(
          influencer.email,
          influencer.name || influencer.email.split("@")[0],
          campaign.name,
          campaign.brandName
        ).then(async (result) => {
          if (result.success && result.messageId) {
            // Store the Message-ID for email threading
            await storage.updateApplication(application.id, {
              emailThreadId: result.messageId,
            });
            // Create notification
            storage.createNotification({
              influencerId: influencer.id,
              campaignId: campaign.id,
              applicationId: application.id,
              type: "approved",
            }).catch(console.error);
          }
        }).catch(console.error);

        // Return with auto-approved status
        const updatedApplication = await storage.getApplication(application.id);
        return res.json({ ...updatedApplication, autoApproved: true });
      }

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
        return res.status(400).json({ message: "Only pending applications can be cancelled. Once approved, applications cannot be cancelled." });
      }

      // Delete the application from the database
      await storage.deleteApplication(application.id);

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Dismiss rejected application notification
  app.post("/api/applications/:id/dismiss", requireAuth("influencer"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.influencerId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!["rejected", "uploaded", "completed"].includes(application.status)) {
        return res.status(400).json({ message: "Only rejected, uploaded, or completed applications can be dismissed" });
      }

      await storage.updateApplication(application.id, {
        dismissedAt: new Date(),
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Mark rejection(s) as viewed
  app.post("/api/applications/mark-rejection-viewed", requireAuth("influencer"), async (req, res) => {
    try {
      const { applicationIds } = req.body;
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({ message: "applicationIds required" });
      }

      for (const id of applicationIds) {
        const application = await storage.getApplication(id);
        if (application && application.influencerId === req.session.userId && application.status === "rejected") {
          if (!application.rejectionViewedAt) {
            await storage.updateApplication(application.id, {
              rejectionViewedAt: new Date(),
            });
          }
        }
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Report issue / Leave comment
  app.post("/api/applications/:id/report-issue", requireAuth("influencer"), async (req, res) => {
    try {
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid application ID" });
      }

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.influencerId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if there's already a pending (unanswered) comment for this application
      const existingIssues = await storage.getShippingIssuesByApplication(application.id);
      const hasPendingComment = existingIssues.some(issue => issue.status === "open");
      
      if (hasPendingComment) {
        return res.status(400).json({ 
          message: "You already have a pending comment on this campaign. Please wait for a response before submitting another.",
          code: "PENDING_COMMENT_EXISTS"
        });
      }

      const validationResult = issueReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const issue = await storage.createShippingIssue({
        applicationId: application.id,
        influencerId: application.influencerId,
        campaignId: application.campaignId,
        message: validationResult.data.message,
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

  // Product Cost Covered: Submit purchase proof (influencer)
  app.post("/api/applications/:id/submit-purchase", requireAuth("influencer"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.influencerId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if campaign is product_cost_covered
      const campaign = await storage.getCampaign(application.campaignId);
      if (!campaign || campaign.campaignType !== "product_cost_covered") {
        return res.status(400).json({ message: "This campaign does not require purchase proof" });
      }

      // Check if application is approved
      if (application.status !== "approved") {
        return res.status(400).json({ message: "Application must be approved to submit purchase proof" });
      }

      const { screenshotUrl, amazonOrderId } = req.body;
      if (!screenshotUrl) {
        return res.status(400).json({ message: "Purchase screenshot URL is required" });
      }

      // Update application with purchase proof
      await storage.updateApplication(application.id, {
        purchaseScreenshotUrl: screenshotUrl,
        purchaseSubmittedAt: new Date(),
        amazonOrderId: amazonOrderId || null,
      });

      return res.json({ success: true });
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
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const statuses = req.query.statuses as string | undefined;

    const result = await storage.getCampaignsPaginated({
      page,
      pageSize,
      search,
      status,
      statuses,
    });
    return res.json(result);
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
      // Sanitize all text inputs
      const sanitizedBody = sanitizeObject(req.body);
      
      // Validate that paid campaigns have a reward amount
      if (sanitizedBody.rewardType === 'paid' && (!sanitizedBody.rewardAmount || sanitizedBody.rewardAmount <= 0)) {
        return res.status(400).json({ message: "Reward amount is required for paid campaigns" });
      }
      
      // Parse deadline strings to Date if provided
      let deadline = sanitizedBody.deadline;
      if (deadline && typeof deadline === 'string') {
        deadline = new Date(deadline);
      }
      
      let applicationDeadline = sanitizedBody.applicationDeadline;
      if (applicationDeadline && typeof applicationDeadline === 'string') {
        applicationDeadline = new Date(applicationDeadline);
      }

      // Generate a temporary ID for image upload
      const tempId = `new-${Date.now()}`;
      
      // Upload base64 images to Supabase Storage
      let imageUrls = sanitizedBody.imageUrls || [];
      if (imageUrls.length > 0 && imageUrls.some((img: string) => isBase64Image(img))) {
        try {
          await ensureBucketExists();
          imageUrls = await uploadMultipleImages(imageUrls, tempId);
          console.log(`[Storage] Uploaded ${imageUrls.length} images for new campaign`);
        } catch (uploadError: any) {
          console.error('[Storage] Failed to upload images:', uploadError);
          return res.status(500).json({ message: "Failed to upload images: " + uploadError.message });
        }
      }
      
      const data = insertCampaignSchema.parse({
        ...sanitizedBody,
        imageUrls,
        deadline,
        applicationDeadline,
        // Clear rewardAmount if gift type
        rewardAmount: sanitizedBody.rewardType === 'gift' ? null : sanitizedBody.rewardAmount,
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
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      // Sanitize all text inputs
      const data = sanitizeObject({ ...req.body });
      
      // Parse deadline strings back to Date if provided
      if (data.deadline && typeof data.deadline === 'string') {
        data.deadline = new Date(data.deadline);
      }
      if (data.applicationDeadline && typeof data.applicationDeadline === 'string') {
        data.applicationDeadline = new Date(data.applicationDeadline);
      }
      
      // Validate that paid campaigns have a reward amount
      if (data.rewardType === 'paid' && (!data.rewardAmount || data.rewardAmount <= 0)) {
        return res.status(400).json({ message: "Reward amount is required for paid campaigns" });
      }
      
      // Clear rewardAmount if switching to gift type
      if (data.rewardType === 'gift') {
        data.rewardAmount = null;
      }

      // Upload any new base64 images to Supabase Storage
      if (data.imageUrls && data.imageUrls.length > 0 && data.imageUrls.some((img: string) => isBase64Image(img))) {
        try {
          await ensureBucketExists();
          data.imageUrls = await uploadMultipleImages(data.imageUrls, req.params.id);
          console.log(`[Storage] Uploaded ${data.imageUrls.length} images for campaign ${req.params.id}`);
        } catch (uploadError: any) {
          console.error('[Storage] Failed to upload images:', uploadError);
          return res.status(500).json({ message: "Failed to upload images: " + uploadError.message });
        }
      }
      
      const campaign = await storage.updateCampaign(req.params.id, data);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      return res.json(campaign);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Finish campaign (close it - sets status to 'closed')
  app.post("/api/admin/campaigns/:id/finish", requireAuth("admin"), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status === "archived") {
        return res.status(400).json({ message: "Cannot finish an archived campaign" });
      }

      if (campaign.status === "closed") {
        return res.status(400).json({ message: "Campaign is already finished" });
      }

      const updated = await storage.updateCampaign(req.params.id, { status: "closed" });
      return res.json({ success: true, campaign: updated });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Archive campaign
  app.post("/api/admin/campaigns/:id/archive", requireAuth("admin"), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const updated = await storage.updateCampaign(req.params.id, { status: "archived" });
      return res.json({ success: true, campaign: updated });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Restore (unarchive) campaign
  app.post("/api/admin/campaigns/:id/restore", requireAuth("admin"), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status !== "archived") {
        return res.status(400).json({ message: "Campaign is not archived" });
      }

      // Restore to draft status
      const updated = await storage.updateCampaign(req.params.id, { status: "draft" });
      return res.json({ success: true, campaign: updated });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Delete campaign permanently
  app.delete("/api/admin/campaigns/:id", requireAuth("admin"), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Security: Only archived campaigns can be deleted permanently
      if (campaign.status !== 'archived') {
        return res.status(400).json({ 
          message: "Only archived campaigns can be deleted. Please archive the campaign first." 
        });
      }

      // Delete campaign and all related data
      await storage.deleteCampaign(req.params.id);
      return res.json({ success: true });
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

      // Send approval email and store thread ID for future emails
      const influencer = await storage.getInfluencer(application.influencerId);
      if (influencer?.email) {
        sendApplicationApprovedEmail(
          influencer.email,
          influencer.name || "Creator",
          campaign.name,
          campaign.brandName
        ).then(async (result) => {
          if (result.success && result.messageId) {
            await storage.updateApplication(application.id, {
              emailThreadId: result.messageId
            });
            console.log(`Stored emailThreadId for application ${application.id}: ${result.messageId}`);
          }
        }).catch(err => {
          console.error("Failed to send approval email:", err);
        });
      }

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

  // Mark as delivered
  app.post("/api/admin/applications/:id/delivered", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Can only mark shipped applications as delivered
      if (application.status !== "shipped") {
        return res.status(400).json({ message: "Can only mark shipped applications as delivered" });
      }

      await storage.updateApplication(application.id, {
        status: "delivered",
        deliveredAt: new Date(),
      });

      // Update shipping record if exists
      const shipping = await storage.getShippingByApplication(application.id);
      if (shipping) {
        await storage.updateShipping(shipping.id, {
          status: "delivered",
          deliveredAt: new Date(),
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Undo delivered (revert to shipped)
  app.post("/api/admin/applications/:id/undo-delivered", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Can only undo delivered applications
      if (application.status !== "delivered") {
        return res.status(400).json({ message: "Can only undo delivered applications" });
      }

      await storage.updateApplication(application.id, {
        status: "shipped",
        deliveredAt: null,
      });

      // Update shipping record if exists
      const shipping = await storage.getShippingByApplication(application.id);
      if (shipping) {
        await storage.updateShipping(shipping.id, {
          status: "shipped",
          deliveredAt: null,
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Save content URL (video link)
  app.patch("/api/admin/applications/:id/content-url", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const { contentUrl } = req.body;
      
      await storage.updateApplication(application.id, {
        contentUrl: contentUrl || null,
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

  // Product Cost Covered: Verify purchase proof
  app.post("/api/admin/applications/:id/verify-purchase", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if campaign is product_cost_covered
      const campaign = await storage.getCampaign(application.campaignId);
      if (!campaign || campaign.campaignType !== "product_cost_covered") {
        return res.status(400).json({ message: "This campaign is not a Product Cost Covered campaign" });
      }

      // Check if purchase proof was submitted
      if (!application.purchaseScreenshotUrl) {
        return res.status(400).json({ message: "No purchase proof has been submitted" });
      }

      // Mark purchase as verified
      await storage.updateApplication(application.id, {
        purchaseVerifiedAt: new Date(),
        purchaseVerifiedByAdminId: req.session?.user?.id || null,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Product Cost Covered: Send reimbursement
  app.post("/api/admin/applications/:id/send-reimbursement", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if campaign is product_cost_covered
      const campaign = await storage.getCampaign(application.campaignId);
      if (!campaign || campaign.campaignType !== "product_cost_covered") {
        return res.status(400).json({ message: "This campaign is not a Product Cost Covered campaign" });
      }

      // Check if purchase was verified
      if (!application.purchaseVerifiedAt) {
        return res.status(400).json({ message: "Purchase proof must be verified before reimbursement" });
      }

      const { amount, paypalTransactionId } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Reimbursement amount is required" });
      }

      // Mark reimbursement as sent
      await storage.updateApplication(application.id, {
        reimbursementSentAt: new Date(),
        reimbursementSentByAdminId: req.session?.user?.id || null,
        reimbursementAmount: amount,
        reimbursementPaypalTransactionId: paypalTransactionId || null,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Product Cost Covered / Amazon Video: Send cash reward ($30/$50)
  app.post("/api/admin/applications/:id/send-reward", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if campaign is a paid campaign
      const campaign = await storage.getCampaign(application.campaignId);
      if (!campaign || (campaign.campaignType !== "product_cost_covered" && campaign.campaignType !== "amazon_video")) {
        return res.status(400).json({ message: "This campaign does not have a cash reward" });
      }

      // Check if content has been verified/completed
      if (application.status !== "completed") {
        return res.status(400).json({ message: "Content must be verified before sending reward" });
      }

      const { paypalTransactionId } = req.body;

      // Mark reward as sent
      await storage.updateApplication(application.id, {
        cashRewardSentAt: new Date(),
        cashRewardPaypalTransactionId: paypalTransactionId || null,
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

  // Add shipping info for a single application (inline form)
  app.post("/api/admin/applications/:applicationId/ship", requireAuth("admin"), async (req, res) => {
    try {
      const { courier, trackingNumber, trackingUrl } = req.body;
      
      if (!courier || !trackingNumber) {
        return res.status(400).json({ message: "Courier and tracking number are required" });
      }

      const application = await storage.getApplication(req.params.applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.status !== "approved") {
        return res.status(400).json({ message: "Can only ship approved applications" });
      }

      const shippedAt = new Date();

      // Update shipping record
      await storage.updateShippingByApplication(application.id, {
        trackingNumber,
        trackingUrl,
        courier,
        status: "shipped",
        shippedAt,
      });

      // Update application status
      await storage.updateApplication(application.id, {
        status: "shipped",
        shippedAt,
      });

      // Log shipping notification
      await storage.createNotification({
        influencerId: application.influencerId,
        campaignId: application.campaignId,
        applicationId: application.id,
        type: "shipping_shipped",
      });

      // Send shipping notification email (threaded with approval email)
      const influencer = await storage.getInfluencer(application.influencerId);
      const campaign = await storage.getCampaign(application.campaignId);
      if (influencer?.email && campaign) {
        sendShippingNotificationEmail(
          influencer.email,
          influencer.name || "Creator",
          campaign.name,
          campaign.brandName,
          courier,
          trackingNumber,
          trackingUrl,
          application.emailThreadId
        ).catch(err => {
          console.error("Failed to send shipping notification:", err);
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Update shipping address for an application (admin-editable, doesn't modify influencer's original)
  app.patch("/api/admin/applications/:id/shipping-address", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const { phone, addressLine1, addressLine2, city, state, zipCode, country } = req.body;

      // Update application with shipping info (phone and address)
      const updated = await storage.updateApplication(application.id, {
        shippingPhone: phone || null,
        shippingAddressLine1: addressLine1 || null,
        shippingAddressLine2: addressLine2 || null,
        shippingCity: city || null,
        shippingState: state || null,
        shippingZipCode: zipCode || null,
        shippingCountry: country || "United States",
      });

      return res.json({ success: true, application: updated });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Export approved influencers to CSV
  app.get("/api/admin/campaigns/:id/export-csv", requireAuth("admin"), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Get all approved applications with influencer data
      const applications = await storage.getApplicationsWithDetailsByCampaign(req.params.id);
      const approvedApps = applications.filter((a) => 
        ["approved", "shipped", "delivered", "uploaded", "completed"].includes(a.status)
      );

      // Build CSV header
      const headers = [
        "Email",
        "Name",
        "TikTok Handle",
        "Instagram Handle",
        "Phone",
        "Address Line 1",
        "Address Line 2",
        "City",
        "State",
        "ZIP Code",
        "Country",
        "Status",
        "Courier",
        "Tracking Number",
        "Tracking URL",
      ];

      // Build CSV rows
      const rows = approvedApps.map((app) => {
        const inf = app.influencer;
        // Use shipping address if set, otherwise fall back to influencer's original address
        const addressLine1 = app.shippingAddressLine1 || inf?.addressLine1 || "";
        const addressLine2 = app.shippingAddressLine2 || inf?.addressLine2 || "";
        const city = app.shippingCity || inf?.city || "";
        const state = app.shippingState || inf?.state || "";
        const zipCode = app.shippingZipCode || inf?.zipCode || "";
        const country = app.shippingCountry || inf?.country || "United States";

        return [
          inf?.email || "",
          inf?.name || "",
          inf?.tiktokHandle || "",
          inf?.instagramHandle || "",
          inf?.phone || "",
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          country,
          app.status,
          "",
          "",
          "",
        ];
      });

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${campaign.name.replace(/[^a-z0-9]/gi, "_")}_influencers.csv"`
      );
      return res.send(csvContent);
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

      // Get points from request body (default 5)
      const points = typeof req.body.points === 'number' ? req.body.points : 5;

      // Update application status with points awarded
      await storage.updateApplication(application.id, {
        status: "uploaded",
        uploadedAt: new Date(),
        pointsAwarded: points,
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
      const campaign = await storage.getCampaign(application.campaignId);
      
      if (influencer) {
        // Track previous tier for upgrade detection
        // Tier definitions:
        // - Starting: completedCampaigns === 0 OR score < 50
        // - Standard: completedCampaigns >= 1 AND score >= 50 AND score < 85
        // - VIP: completedCampaigns >= 1 AND score >= 85
        const previousCompletedCampaigns = influencer.completedCampaigns ?? 0;
        const previousScore = influencer.score ?? 0;
        
        // Determine previous tier using consistent logic
        const calculateTier = (completed: number, score: number) => {
          if (completed === 0 || score < 50) return "starting";
          if (score >= 85) return "vip";
          return "standard";
        };
        const previousTier = calculateTier(previousCompletedCampaigns, previousScore);

        // Award the specified points
        await storage.addScoreEvent({
          influencerId: influencer.id,
          campaignId: application.campaignId,
          applicationId: application.id,
          delta: points,
          reason: "upload_success",
        });
        
        // First time bonus (additional 5 points)
        if (application.firstTime) {
          await storage.addScoreEvent({
            influencerId: influencer.id,
            campaignId: application.campaignId,
            applicationId: application.id,
            delta: 5,
            reason: "first_upload",
          });
        }

        // Increment completed campaigns count
        await storage.updateInfluencer(influencer.id, {
          completedCampaigns: previousCompletedCampaigns + 1,
        });

        // Get updated influencer to check new tier
        const updatedInfluencer = await storage.getInfluencer(influencer.id);
        if (updatedInfluencer) {
          const newCompletedCampaigns = updatedInfluencer.completedCampaigns ?? 0;
          const newScore = updatedInfluencer.score ?? 0;
          
          // Determine new tier using same consistent logic
          const newTier = calculateTier(newCompletedCampaigns, newScore);

          // Only send tier upgrade email when tier actually changes
          if (previousTier !== newTier) {
            if (previousTier === "starting" && newTier === "standard") {
              // Starting → Standard upgrade (first campaign completed AND score >= 50)
              // Set pending tier upgrade for celebration popup
              await storage.updateInfluencer(updatedInfluencer.id, { pendingTierUpgrade: "standard" });
              
              sendTierUpgradeEmail(
                updatedInfluencer.email,
                updatedInfluencer.name || updatedInfluencer.email.split("@")[0],
                "standard"
              ).then(() => {
                console.log(`Tier upgrade email (standard) sent to ${updatedInfluencer.email}`);
              }).catch(console.error);
            } else if (newTier === "vip" && previousTier !== "vip") {
              // → VIP upgrade (score reached 85+)
              // Set pending tier upgrade for celebration popup
              await storage.updateInfluencer(updatedInfluencer.id, { pendingTierUpgrade: "vip" });
              
              sendTierUpgradeEmail(
                updatedInfluencer.email,
                updatedInfluencer.name || updatedInfluencer.email.split("@")[0],
                "vip"
              ).then(() => {
                console.log(`Tier upgrade email (vip) sent to ${updatedInfluencer.email}`);
              }).catch(console.error);
            }
          }
        }

        // Send upload verified email (non-blocking)
        if (influencer.email && campaign) {
          sendUploadVerifiedEmail(
            influencer.email,
            influencer.name || influencer.email.split("@")[0],
            campaign.name,
            campaign.brandName,
            points,
            application.emailThreadId
          ).then((result) => {
            if (result.success) {
              // Log notification to database
              storage.createNotification({
                influencerId: influencer.id,
                campaignId: campaign.id,
                applicationId: application.id,
                type: "upload_verified",
              }).catch(console.error);
            }
          }).catch(console.error);
        }
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

      // Apply penalty for missed deadline (subtracts from score, no auto-restriction)
      const influencer = await storage.getInfluencer(application.influencerId);
      if (influencer) {
        // Check for previous completed applications to determine penalty amount
        const allApplications = await storage.getApplicationsByInfluencer(influencer.id);
        const hasCompletedBefore = allApplications.some(app => 
          app.id !== application.id && app.status === "completed"
        );
        
        // First-time ghosting: -5 points, subsequent misses: -1 point
        const isFirstTimeGhosting = !hasCompletedBefore;
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
          type: "deadline_missed",
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Undo missed (revert to delivered)
  app.post("/api/admin/uploads/:applicationId/undo-missed", requireAuth("admin"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.status !== "deadline_missed") {
        return res.status(400).json({ message: "Can only undo missed applications" });
      }

      // Revert application status to delivered
      await storage.updateApplication(application.id, {
        status: "delivered",
        deadlineMissedAt: null,
      });

      // Update upload record if exists
      const upload = await storage.getUploadByApplication(application.id);
      if (upload) {
        await storage.updateUploadByApplication(application.id, {
          status: "pending",
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
      const status = req.query.status as "suspended" | "blocked" | undefined;

      const result = await storage.getInfluencersPaginated({
        page,
        pageSize,
        search,
        campaignId,
        status,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("Error fetching influencers:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Get single influencer by ID (admin)
  app.get("/api/admin/influencers/:id", requireAuth("admin"), async (req, res) => {
    try {
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid influencer ID" });
      }
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      return res.json(influencer);
    } catch (error: any) {
      console.error("Error fetching influencer:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Get influencer dashboard stats (admin) - same data influencer sees on their dashboard
  app.get("/api/admin/influencers/:id/dashboard-stats", requireAuth("admin"), async (req, res) => {
    try {
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid influencer ID" });
      }
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      // Get all applications for this influencer
      const applications = await storage.getApplicationsByInfluencer(req.params.id);
      
      // Enrich with campaign data and shipping issues (comments)
      const enrichedApplications = await Promise.all(
        applications.map(async (app) => {
          const campaign = await storage.getCampaign(app.campaignId);
          const issues = await storage.getShippingIssuesByApplication(app.id);
          const shipping = await storage.getShippingByApplication(app.id);
          return { ...app, campaign, issues, shipping };
        })
      );

      // Calculate stats
      const completedApps = enrichedApplications.filter(
        (a) => a.status === "uploaded" || a.status === "completed"
      );
      const missedApps = enrichedApplications.filter(
        (a) => a.status === "deadline_missed"
      );
      const cashEarned = completedApps
        .filter((a) => a.campaign?.rewardType === "gift_paid")
        .reduce((sum, a) => sum + (a.campaign?.rewardAmount || 0), 0);
      
      // Total points earned from campaigns
      const totalPointsFromCampaigns = completedApps.reduce(
        (sum, a) => sum + (a.pointsAwarded || 0),
        0
      );

      // Get score events for history
      const scoreEvents = await storage.getScoreEventsByInfluencer(req.params.id);
      const penaltyEvents = await storage.getPenaltyEventsByInfluencer(req.params.id);

      return res.json({
        influencer,
        stats: {
          score: influencer.score ?? 0,
          penalty: influencer.penalty ?? 0,
          completedCount: completedApps.length,
          missedCount: missedApps.length,
          cashEarned,
          totalPointsFromCampaigns,
          totalApplications: enrichedApplications.length,
        },
        recentApplications: enrichedApplications
          .filter((a) => !a.dismissedAt)
          .sort((a, b) => new Date(b.appliedAt!).getTime() - new Date(a.appliedAt!).getTime())
          .slice(0, 10),
        scoreEventsCount: scoreEvents.length,
        penaltyEventsCount: penaltyEvents.length,
      });
    } catch (error: any) {
      console.error("Error fetching influencer dashboard stats:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Adjust influencer score
  app.post("/api/admin/influencers/:id/score", requireAuth("admin"), async (req, res) => {
    try {
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid influencer ID" });
      }

      const validationResult = scoreAdjustmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const { delta, reason, displayReason } = validationResult.data;

      await storage.addScoreEvent({
        influencerId: req.params.id,
        delta,
        reason: reason || "admin_manual",
        displayReason: displayReason || undefined,
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
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid influencer ID" });
      }

      const validationResult = scoreAdjustmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const { delta, reason, displayReason } = validationResult.data;

      await storage.addPenaltyEvent({
        influencerId: req.params.id,
        delta,
        reason: reason || "admin_manual",
        displayReason: displayReason || undefined,
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

  // Suspend influencer account (manual admin action)
  app.post("/api/admin/influencers/:id/suspend", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      if (influencer.suspended) {
        return res.status(400).json({ message: "Account is already suspended" });
      }

      await storage.updateInfluencer(req.params.id, {
        suspended: true,
        suspendedAt: new Date(),
      });

      // Send suspension email
      if (influencer.email) {
        await sendAccountSuspendedEmail(
          influencer.email,
          influencer.name || "Creator"
        );
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Unsuspend influencer account
  app.post("/api/admin/influencers/:id/unsuspend", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      if (!influencer.suspended) {
        return res.status(400).json({ message: "Account is not suspended" });
      }

      await storage.updateInfluencer(req.params.id, {
        suspended: false,
        suspendedAt: null,
        appealSubmitted: false, // Reset so they can submit a new appeal if suspended again
      });

      // Send unsuspension email
      if (influencer.email) {
        await sendAccountUnsuspendedEmail(
          influencer.email,
          influencer.name || "Creator"
        );
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Block influencer account (permanent ban - no appeal option)
  app.post("/api/admin/influencers/:id/block", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      if (influencer.blocked) {
        return res.status(400).json({ message: "Account is already blocked" });
      }

      await storage.updateInfluencer(req.params.id, {
        blocked: true,
        blockedAt: new Date(),
        // Also ensure they're not just suspended
        suspended: false,
        suspendedAt: null,
        appealSubmitted: false,
      });

      // Send block notification email
      if (influencer.email) {
        await sendAccountBlockedEmail(
          influencer.email,
          influencer.name || "Creator"
        );
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Unblock influencer account
  app.post("/api/admin/influencers/:id/unblock", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      if (!influencer.blocked) {
        return res.status(400).json({ message: "Account is not blocked" });
      }

      await storage.updateInfluencer(req.params.id, {
        blocked: false,
        blockedAt: null,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Delete blocked influencer account (permanent deletion - user cannot sign up again)
  app.delete("/api/admin/influencers/:id", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      if (!influencer.blocked) {
        return res.status(400).json({ message: "Can only delete blocked accounts. Block the user first." });
      }

      // Delete influencer (this also adds their email to banned list)
      await storage.deleteInfluencer(req.params.id);

      return res.json({ success: true, message: "Account permanently deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Send direct email to influencer
  app.post("/api/admin/influencers/:id/email", requireAuth("admin"), async (req, res) => {
    try {
      const influencer = await storage.getInfluencer(req.params.id);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }

      if (!influencer.email) {
        return res.status(400).json({ message: "Influencer has no email address" });
      }

      const { subject, body } = req.body;
      if (!subject || !body) {
        return res.status(400).json({ message: "Subject and body are required" });
      }

      if (typeof subject !== "string" || subject.trim().length === 0) {
        return res.status(400).json({ message: "Subject cannot be empty" });
      }

      if (typeof body !== "string" || body.trim().length === 0) {
        return res.status(400).json({ message: "Email body cannot be empty" });
      }

      const result = await sendDirectAdminEmail(
        influencer.email,
        influencer.name || "Creator",
        subject.trim(),
        body.trim()
      );

      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send email" });
      }

      return res.json({ success: true, message: "Email sent successfully" });
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
      if (!validateUUID(req.params.id)) {
        return res.status(400).json({ message: "Invalid influencer ID" });
      }

      const validationResult = noteSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }

      const { note, campaignId, applicationId } = validationResult.data;

      const newNote = await storage.addAdminNote({
        influencerId: req.params.id,
        adminId: req.session.userId!,
        note,
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

  // Get issues for a specific application (admin)
  app.get("/api/admin/applications/:id/issues", requireAuth("admin"), async (req, res) => {
    try {
      const issues = await storage.getShippingIssuesByApplication(req.params.id);
      return res.json(issues);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get all shipping issues (all statuses for filtering on frontend)
  app.get("/api/admin/issues", requireAuth("admin"), async (req, res) => {
    try {
      const issues = await storage.getAllShippingIssues();
      return res.json(issues);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Resolve a shipping issue
  app.post("/api/admin/issues/:id/resolve", requireAuth("admin"), async (req, res) => {
    try {
      const { response } = req.body;
      
      // Get issue details first for email
      const allIssues = await storage.getAllShippingIssues();
      const issueWithDetails = allIssues.find(i => i.id === req.params.id);
      
      const issue = await storage.updateShippingIssue(req.params.id, {
        status: "resolved",
        resolvedByAdminId: req.session.userId,
        resolvedAt: new Date(),
        adminResponse: response || null,
      });

      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Send email to influencer if there's a response (threaded with campaign emails)
      if (response && issueWithDetails?.influencer && issueWithDetails?.campaign) {
        const { influencer, campaign, message, applicationId } = issueWithDetails;
        const application = await storage.getApplication(applicationId);
        sendAdminReplyEmail(
          influencer.email,
          influencer.name || "Creator",
          campaign.name,
          campaign.brandName,
          message,
          response,
          application?.emailThreadId
        ).catch(err => {
          console.error("Failed to send admin reply email:", err);
        });
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

  // =====================
  // SUPPORT TICKETS
  // =====================

  // Create a support ticket (influencer)
  app.post("/api/support-tickets", requireAuth("influencer"), async (req, res) => {
    try {
      const { subject, message } = req.body;
      
      // Check if user has any unanswered tickets (open status without admin response)
      const existingTickets = await storage.getSupportTicketsByInfluencer(req.session.userId!);
      const hasUnansweredTicket = existingTickets.some(
        ticket => ticket.status === "open" && !ticket.adminResponse
      );
      
      if (hasUnansweredTicket) {
        return res.status(400).json({ 
          message: "You already have an open ticket waiting for a response. Please wait for admin to reply before submitting a new ticket." 
        });
      }
      
      // Validate required fields
      if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
        return res.status(400).json({ message: "Subject is required" });
      }
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }
      if (subject.trim().length > 200) {
        return res.status(400).json({ message: "Subject must be 200 characters or less" });
      }
      if (message.trim().length > 5000) {
        return res.status(400).json({ message: "Message must be 5000 characters or less" });
      }
      
      const ticket = await storage.createSupportTicket({
        influencerId: req.session.userId!,
        subject: subject.trim(),
        message: message.trim(),
      });
      
      return res.json(ticket);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Submit suspension appeal (influencer - creates a support ticket)
  app.post("/api/suspension-appeal", requireAuth("influencer"), async (req, res) => {
    try {
      const { message } = req.body;
      
      // Check if user is actually suspended
      const influencer = await storage.getInfluencer(req.session.userId!);
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      
      if (!influencer.suspended) {
        return res.status(400).json({ message: "Your account is not suspended" });
      }
      
      // Check if user already has an open suspension appeal
      const existingTickets = await storage.getSupportTicketsByInfluencer(req.session.userId!);
      const hasOpenAppeal = existingTickets.some(
        ticket => ticket.status === "open" && 
        ticket.subject.includes("[Suspension Appeal]") && 
        !ticket.adminResponse
      );
      
      if (hasOpenAppeal) {
        return res.status(400).json({ 
          message: "You already have a pending suspension appeal. Please wait for admin to review it." 
        });
      }
      
      // Validate message
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "Appeal message is required" });
      }
      if (message.trim().length > 5000) {
        return res.status(400).json({ message: "Message must be 5000 characters or less" });
      }
      
      const ticket = await storage.createSupportTicket({
        influencerId: req.session.userId!,
        subject: "[Suspension Appeal] Account Review Request",
        message: message.trim(),
      });
      
      // Mark that the user has submitted an appeal so the popup doesn't show again
      await storage.updateInfluencer(req.session.userId!, { appealSubmitted: true });
      
      return res.json(ticket);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get my support tickets (influencer)
  app.get("/api/support-tickets/my", requireAuth("influencer"), async (req, res) => {
    try {
      const tickets = await storage.getSupportTicketsByInfluencer(req.session.userId!);
      return res.json(tickets);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Get all support tickets (admin)
  app.get("/api/admin/support-tickets", requireAuth("admin"), async (req, res) => {
    try {
      // Always return all tickets - frontend handles filtering by status
      const tickets = await storage.getAllSupportTickets();
      return res.json(tickets);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Respond to support ticket (admin)
  app.post("/api/admin/support-tickets/:id/respond", requireAuth("admin"), async (req, res) => {
    try {
      const { response, status } = req.body;
      
      // Validate response
      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return res.status(400).json({ message: "Response is required" });
      }
      if (response.trim().length > 5000) {
        return res.status(400).json({ message: "Response must be 5000 characters or less" });
      }
      
      // Get the ticket first to get influencer info for email
      const existingTickets = await storage.getAllSupportTickets();
      const existingTicket = existingTickets.find(t => t.id === req.params.id);
      
      if (!existingTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Get the influencer info
      const influencer = await storage.getInfluencer(existingTicket.influencerId);
      
      // Validate status
      const validStatuses = ["resolved", "closed"];
      const finalStatus = validStatuses.includes(status) ? status : "resolved";
      
      // Build update object - only set resolved fields if actually resolving/closing
      const updateData: any = {
        adminResponse: response.trim(),
        status: finalStatus,
        resolvedByAdminId: req.session.userId,
        resolvedAt: new Date(),
      };
      
      const ticket = await storage.updateSupportTicket(req.params.id, updateData);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Send email notification to influencer
      if (influencer?.email) {
        sendSupportTicketResponseEmail(
          influencer.email,
          influencer.name || "Creator",
          existingTicket.subject,
          existingTicket.message,
          response.trim()
        ).catch(err => {
          console.error("Failed to send support ticket response email:", err);
        });
      }
      
      return res.json({ success: true, ticket });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // IMAGE MIGRATION
  // =====================

  // Migrate base64 images to Supabase Storage (admin only)
  app.post("/api/admin/migrate-images", requireAuth("admin"), async (req, res) => {
    try {
      await ensureBucketExists();
      
      // Get all campaigns
      const result = await storage.getCampaignsPaginated({ page: 1, pageSize: 1000 });
      const campaigns = result.items;
      
      let migratedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      for (const campaign of campaigns) {
        const imageUrls = campaign.imageUrls || [];
        
        // Check if any images are base64
        const hasBase64 = imageUrls.some((url: string) => isBase64Image(url));
        
        if (!hasBase64) {
          skippedCount++;
          continue;
        }
        
        try {
          const newUrls = await uploadMultipleImages(imageUrls, campaign.id);
          await storage.updateCampaign(campaign.id, { imageUrls: newUrls });
          migratedCount++;
          console.log(`[Migration] Migrated images for campaign: ${campaign.name}`);
        } catch (err: any) {
          errors.push(`Campaign ${campaign.name}: ${err.message}`);
          console.error(`[Migration] Failed for campaign ${campaign.name}:`, err);
        }
      }
      
      return res.json({
        success: true,
        migrated: migratedCount,
        skipped: skippedCount,
        errors,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Check migration status
  app.get("/api/admin/migration-status", requireAuth("admin"), async (req, res) => {
    try {
      const result = await storage.getCampaignsPaginated({ page: 1, pageSize: 1000 });
      const campaigns = result.items;
      
      let base64Count = 0;
      let urlCount = 0;
      
      for (const campaign of campaigns) {
        const imageUrls = campaign.imageUrls || [];
        const hasBase64 = imageUrls.some((url: string) => isBase64Image(url));
        
        if (hasBase64) {
          base64Count++;
        } else if (imageUrls.length > 0) {
          urlCount++;
        }
      }
      
      return res.json({
        total: campaigns.length,
        needsMigration: base64Count,
        alreadyMigrated: urlCount,
        noImages: campaigns.length - base64Count - urlCount,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Clean up orphan images from Storage (images without corresponding campaigns)
  app.post("/api/admin/cleanup-orphan-images", requireAuth("admin"), async (req, res) => {
    try {
      // Get all image file paths from Storage
      const storageFiles = await listAllStorageImages();
      
      if (storageFiles.length === 0) {
        return res.json({
          success: true,
          message: "No images found in Storage",
          orphanCount: 0,
          deletedCount: 0,
        });
      }
      
      // Get all campaigns and their image URLs
      const result = await storage.getCampaignsPaginated({ page: 1, pageSize: 1000 });
      const campaigns = result.items;
      
      // Extract all valid file paths from campaign imageUrls
      const validFilePaths = new Set<string>();
      
      for (const campaign of campaigns) {
        const imageUrls = campaign.imageUrls || [];
        if (campaign.imageUrl) {
          imageUrls.push(campaign.imageUrl);
        }
        
        for (const url of imageUrls) {
          if (url && url.includes('supabase.co/storage')) {
            const filePath = extractFilePathFromUrl(url);
            if (filePath) {
              validFilePaths.add(filePath);
            }
          }
        }
      }
      
      // Find orphan files (in Storage but not in any campaign)
      const orphanFiles = storageFiles.filter(file => !validFilePaths.has(file));
      
      if (orphanFiles.length === 0) {
        return res.json({
          success: true,
          message: "No orphan images found",
          totalInStorage: storageFiles.length,
          validCount: validFilePaths.size,
          orphanCount: 0,
          deletedCount: 0,
        });
      }
      
      // Convert file paths back to URLs for deletion
      const supabaseUrl = process.env.SUPABASE_URL;
      const orphanUrls = orphanFiles.map(file => 
        `${supabaseUrl}/storage/v1/object/public/collaboom-campaign/${file}`
      );
      
      // Delete orphan images
      const deleteResult = await deleteImagesFromStorage(orphanUrls);
      
      return res.json({
        success: deleteResult.verified,
        message: deleteResult.verified 
          ? `Successfully cleaned up ${deleteResult.deleted} orphan images`
          : `Cleanup incomplete: ${deleteResult.deleted}/${orphanFiles.length} deleted. Check Supabase Storage RLS policies.`,
        totalInStorage: storageFiles.length,
        validCount: validFilePaths.size,
        orphanCount: orphanFiles.length,
        deletedCount: deleteResult.deleted,
        verified: deleteResult.verified,
        errors: deleteResult.errors,
      });
    } catch (error: any) {
      console.error('[Orphan Cleanup] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Preview orphan images without deleting (dry run)
  app.get("/api/admin/orphan-images", requireAuth("admin"), async (req, res) => {
    try {
      // Get all image file paths from Storage
      const storageFiles = await listAllStorageImages();
      
      // Get all campaigns and their image URLs
      const result = await storage.getCampaignsPaginated({ page: 1, pageSize: 1000 });
      const campaigns = result.items;
      
      // Extract all valid file paths from campaign imageUrls
      const validFilePaths = new Set<string>();
      
      for (const campaign of campaigns) {
        const imageUrls = campaign.imageUrls || [];
        if (campaign.imageUrl) {
          imageUrls.push(campaign.imageUrl);
        }
        
        for (const url of imageUrls) {
          if (url && url.includes('supabase.co/storage')) {
            const filePath = extractFilePathFromUrl(url);
            if (filePath) {
              validFilePaths.add(filePath);
            }
          }
        }
      }
      
      // Find orphan files
      const orphanFiles = storageFiles.filter(file => !validFilePaths.has(file));
      
      return res.json({
        totalInStorage: storageFiles.length,
        validCount: validFilePaths.size,
        orphanCount: orphanFiles.length,
        orphanFiles: orphanFiles,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
