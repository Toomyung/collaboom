import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Banned emails (for deleted users who cannot sign up again)
export const bannedEmails = pgTable("banned_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  supabaseId: text("supabase_id"),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow(),
});

export type BannedEmail = typeof bannedEmails.$inferSelect;

// Admin users
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).pick({
  email: true,
  password: true,
  name: true,
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

// Influencers
export const influencers = pgTable("influencers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supabaseId: text("supabase_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name"), // Deprecated - kept for backward compatibility
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  tiktokHandle: text("tiktok_handle").unique(),
  instagramHandle: text("instagram_handle"),
  phone: text("phone"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("United States"),
  paypalEmail: text("paypal_email"),
  bioLinkProfileUrl: text("bio_link_profile_url"), // Linktree/Beacons URL for Link in Bio campaigns
  amazonStorefrontUrl: text("amazon_storefront_url"), // Amazon Storefront URL for Amazon Video campaigns
  profileCompleted: boolean("profile_completed").default(false),
  score: integer("score").default(0),
  penalty: integer("penalty").default(0),
  completedCampaigns: integer("completed_campaigns").default(0), // Track completed campaigns for tier system
  restricted: boolean("restricted").default(false),
  suspended: boolean("suspended").default(false),
  suspendedAt: timestamp("suspended_at"),
  appealSubmitted: boolean("appeal_submitted").default(false),
  blocked: boolean("blocked").default(false),
  blockedAt: timestamp("blocked_at"),
  pendingTierUpgrade: text("pending_tier_upgrade"), // 'standard' | 'vip' | null - for showing tier upgrade celebration popup
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInfluencerSchema = createInsertSchema(influencers).pick({
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  tiktokHandle: true,
  instagramHandle: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  zipCode: true,
  paypalEmail: true,
  bioLinkProfileUrl: true,
  amazonStorefrontUrl: true,
});

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .regex(/^[a-zA-Z\s\-\.]+$/, "First name must contain only English letters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .regex(/^[a-zA-Z\s\-\.]+$/, "Last name must contain only English letters"),
  tiktokHandle: z.string()
    .min(1, "TikTok handle is required")
    .regex(/^[a-zA-Z0-9_.]+$/, "TikTok handle can only contain English letters, numbers, underscores, and periods"),
  instagramHandle: z.string()
    .regex(/^[a-zA-Z0-9_.]*$/, "Instagram handle can only contain English letters, numbers, underscores, and periods")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^\+1\s?\(\d{3}\)\s?\d{3}-\d{4}$/, "Please enter a valid US phone number"),
  addressLine1: z.string()
    .min(1, "Address is required")
    .regex(/^[a-zA-Z0-9\s\.,#\-\/]+$/, "Address must contain only English letters, numbers, and common punctuation"),
  addressLine2: z.string()
    .regex(/^[a-zA-Z0-9\s\.,#\-\/]*$/, "Address must contain only English letters, numbers, and common punctuation")
    .optional()
    .or(z.literal("")),
  city: z.string()
    .min(1, "City is required")
    .regex(/^[a-zA-Z\s\-\.]+$/, "City must contain only English letters"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string()
    .min(1, "ZIP code is required")
    .regex(/^[\d\-—]{1,10}$/, "ZIP code must be up to 10 characters (digits and dashes only)"),
  paypalEmail: z.string().email("Valid PayPal email is required").optional().or(z.literal("")),
  bioLinkProfileUrl: z.string()
    .url("Please enter a valid URL (e.g., https://linktr.ee/yourname)")
    .refine(url => {
      if (!url) return true;
      // Accept any https URL (Linktree, Beacons, or similar services)
      return url.startsWith('https://');
    }, "Please enter a valid https URL for your bio link")
    .refine(url => {
      if (!url) return true;
      const lowerUrl = url.toLowerCase();
      // Reject login/register/signup pages - these are not valid profile URLs
      const isInvalidPage = 
        lowerUrl.includes('/login') || 
        lowerUrl.includes('/register') || 
        lowerUrl.includes('/signin') || 
        lowerUrl.includes('/signup') ||
        lowerUrl.includes('universal-login');
      return !isInvalidPage;
    }, "Please enter your actual profile URL, not a login page")
    .optional()
    .or(z.literal("")),
  amazonStorefrontUrl: z.string()
    .url("Please enter a valid Amazon Storefront URL")
    .refine(url => {
      if (!url) return true;
      return url.toLowerCase().includes('amazon.com');
    }, "Please enter a valid Amazon Storefront URL")
    .optional()
    .or(z.literal("")),
});

export type InsertInfluencer = z.infer<typeof insertInfluencerSchema>;
export type Influencer = typeof influencers.$inferSelect;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Campaign Types
export const campaignTypeEnum = ['gifting', 'link_in_bio', 'amazon_video_upload'] as const;
export type CampaignType = typeof campaignTypeEnum[number];

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brandName: text("brand_name").notNull(),
  productName: text("product_name"), // Product name for the campaign
  campaignType: text("campaign_type").notNull().default("gifting"), // 'gifting' | 'product_cost_covered' | 'amazon_video_upload'
  category: text("category").notNull(), // 'beauty' | 'food' | 'lifestyle'
  inventory: integer("inventory").notNull(),
  approvedCount: integer("approved_count").default(0),
  imageUrl: text("image_url"), // Legacy single image (deprecated)
  imageUrls: text("image_urls").array(), // Array of image URLs (up to 6)
  amazonUrl: text("amazon_url"),
  instagramUrl: text("instagram_url"), // Brand Instagram URL
  tiktokUrl: text("tiktok_url"), // Brand TikTok URL
  officialWebsiteUrl: text("official_website_url"), // Official website URL
  guidelinesSummary: text("guidelines_summary"),
  guidelinesUrl: text("guidelines_url"),
  contentOverview: text("content_overview"), // Brief overview of content expectations
  requiredHashtags: text("required_hashtags").array(),
  requiredMentions: text("required_mentions").array(),
  productDetail: text("product_detail"), // Detailed product information
  stepByStepProcess: text("step_by_step_process"), // Step-by-step process for influencers
  eligibilityRequirements: text("eligibility_requirements"), // Eligibility and requirements
  // Video Guidelines
  videoEssentialCuts: text("video_essential_cuts"), // Essential cuts/scenes for the video
  videoAboutProduct: text("video_about_product"), // How to present the product in video
  videoDetails: text("video_details"), // Detailed video requirements
  videoReferenceUrls: text("video_reference_urls").array(), // TikTok reference video URLs
  videoKeyPoints: text("video_key_points"), // Key points to highlight
  applicationDeadline: timestamp("application_deadline"), // Deadline to apply for the campaign
  deadline: timestamp("deadline").notNull(), // Upload deadline (content submission deadline)
  campaignTimeline: text("campaign_timeline"), // Free-form campaign timeline description
  productCost: integer("product_cost"), // Legacy field - no longer used (was for product_cost_covered campaigns)
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'full' | 'closed' | 'archived'
  createdByAdminId: varchar("created_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  approvedCount: true,
  createdAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Minimal Campaign type for list views (optimized payload)
export type MinimalCampaign = {
  id: string;
  name: string;
  brandName: string;
  productName: string | null;
  campaignType: CampaignType;
  category: string;
  inventory: number;
  approvedCount: number | null;
  thumbnailUrl: string | null;
  status: string;
  deadline: Date;
  applicationDeadline: Date | null;
};

// Applications
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  influencerId: varchar("influencer_id").notNull(),
  sequenceNumber: integer("sequence_number"), // Auto-generated per campaign: 1, 2, 3... (read-only)
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'shipped' | 'delivered' | 'uploaded' | 'deadline_missed' | 'completed'
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionViewedAt: timestamp("rejection_viewed_at"), // When user first saw the rejection
  dismissedAt: timestamp("dismissed_at"), // When user dismissed the rejection notification
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  uploadedAt: timestamp("uploaded_at"),
  deadlineMissedAt: timestamp("deadline_missed_at"),
  firstTime: boolean("first_time").default(false),
  notesInternal: text("notes_internal"),
  contentUrl: text("content_url"), // URL of uploaded video content (TikTok link)
  contentSubmittedAt: timestamp("content_submitted_at"), // When influencer submitted the video URL
  pointsAwarded: integer("points_awarded"), // Points awarded when content is verified
  // Shipping info (admin-editable, separate from influencer's original data)
  shippingPhone: text("shipping_phone"),
  shippingAddressLine1: text("shipping_address_line1"),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZipCode: text("shipping_zip_code"),
  shippingCountry: text("shipping_country"),
  // Link in Bio campaign fields - Influencer submits their Linktree/Beacons link with product purchase link
  bioLinkUrl: text("bio_link_url"), // The Linktree/Beacons link URL containing product purchase link
  bioLinkSubmittedAt: timestamp("bio_link_submitted_at"), // When influencer submitted the bio link
  bioLinkVerifiedAt: timestamp("bio_link_verified_at"), // When admin verified the bio link
  bioLinkVerifiedByAdminId: varchar("bio_link_verified_by_admin_id"),
  // Amazon Video Upload campaign fields - Influencer submits their Amazon Storefront link
  amazonStorefrontUrl: text("amazon_storefront_url"), // The Amazon Storefront URL where video is posted
  amazonStorefrontSubmittedAt: timestamp("amazon_storefront_submitted_at"), // When influencer submitted the storefront link
  amazonStorefrontVerifiedAt: timestamp("amazon_storefront_verified_at"), // When admin verified the storefront link
  amazonStorefrontVerifiedByAdminId: varchar("amazon_storefront_verified_by_admin_id"),
  // Legacy product cost covered fields (kept for backward compatibility)
  productCostSentAt: timestamp("product_cost_sent_at"),
  productCostSentByAdminId: varchar("product_cost_sent_by_admin_id"),
  productCostAmount: integer("product_cost_amount"),
  productCostPaypalTransactionId: text("product_cost_paypal_transaction_id"),
  purchaseScreenshotUrl: text("purchase_screenshot_url"),
  purchaseSubmittedAt: timestamp("purchase_submitted_at"),
  purchaseVerifiedAt: timestamp("purchase_verified_at"),
  purchaseVerifiedByAdminId: varchar("purchase_verified_by_admin_id"),
  amazonOrderId: text("amazon_order_id"),
  reimbursementSentAt: timestamp("reimbursement_sent_at"),
  reimbursementSentByAdminId: varchar("reimbursement_sent_by_admin_id"),
  reimbursementAmount: integer("reimbursement_amount"),
  reimbursementPaypalTransactionId: text("reimbursement_paypal_transaction_id"),
  // Cash reward fields - Used for link_in_bio ($30) and amazon_video_upload ($50)
  cashRewardSentAt: timestamp("cash_reward_sent_at"), // When admin sent the $30/$50 cash reward
  cashRewardSentByAdminId: varchar("cash_reward_sent_by_admin_id"),
  cashRewardAmount: integer("cash_reward_amount"), // Cash reward amount ($30 for link_in_bio, $50 for amazon_video_upload)
  cashRewardPaypalTransactionId: text("cash_reward_paypal_transaction_id"), // PayPal transaction ID for cash reward
  // Email threading - stores the first email's Message-ID for threading subsequent emails
  emailThreadId: text("email_thread_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  campaignId: true,
  influencerId: true,
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// Shipping
export const shipping = pgTable("shipping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().unique(),
  status: text("status").notNull().default("pending"), // 'pending' | 'shipped' | 'delivered'
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  courier: text("courier"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShippingSchema = createInsertSchema(shipping).pick({
  applicationId: true,
  trackingNumber: true,
  trackingUrl: true,
  courier: true,
});

export type InsertShipping = z.infer<typeof insertShippingSchema>;
export type Shipping = typeof shipping.$inferSelect;

// Uploads
export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().unique(),
  status: text("status").notNull().default("not_uploaded"), // 'not_uploaded' | 'uploaded' | 'verified' | 'missed'
  tiktokVideoUrl: text("tiktok_video_url"),
  detectedAt: timestamp("detected_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadSchema = createInsertSchema(uploads).pick({
  applicationId: true,
  tiktokVideoUrl: true,
});

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;

// Score Events
export const scoreEvents = pgTable("score_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  campaignId: varchar("campaign_id"),
  applicationId: varchar("application_id"),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(), // 'signup_bonus', 'address_completion', 'upload_verified', 'admin_adjustment', etc.
  displayReason: text("display_reason"), // User-visible reason (max 50 chars) - shown to influencers
  createdByAdminId: varchar("created_by_admin_id"),
  seenAt: timestamp("seen_at"), // When the user saw the points popup (null = not yet seen)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScoreEventSchema = createInsertSchema(scoreEvents).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  delta: true,
  reason: true,
  displayReason: true,
  createdByAdminId: true,
});

export type InsertScoreEvent = z.infer<typeof insertScoreEventSchema>;
export type ScoreEvent = typeof scoreEvents.$inferSelect;

// Penalty Events
export const penaltyEvents = pgTable("penalty_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  campaignId: varchar("campaign_id"),
  applicationId: varchar("application_id"),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(), // 'deadline_missed', 'first_ghosting', 'admin_manual', 'rollback'
  displayReason: text("display_reason"), // User-visible reason (max 50 chars) - shown to influencers
  createdByAdminId: varchar("created_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPenaltyEventSchema = createInsertSchema(penaltyEvents).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  delta: true,
  reason: true,
  displayReason: true,
  createdByAdminId: true,
});

export type InsertPenaltyEvent = z.infer<typeof insertPenaltyEventSchema>;
export type PenaltyEvent = typeof penaltyEvents.$inferSelect;

// Admin Notes
export const adminNotes = pgTable("admin_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  campaignId: varchar("campaign_id"),
  applicationId: varchar("application_id"),
  adminId: varchar("admin_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminNoteSchema = createInsertSchema(adminNotes).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  adminId: true,
  note: true,
});

export type InsertAdminNote = z.infer<typeof insertAdminNoteSchema>;
export type AdminNote = typeof adminNotes.$inferSelect;

// Notifications (email and in-app)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  campaignId: varchar("campaign_id"),
  applicationId: varchar("application_id"),
  type: text("type").notNull(), // 'welcome', 'approved', 'rejected', 'shipping_shipped', 'shipping_delivered', 'deadline_48h', 'deadline_missed', 'account_restricted', 'comment_reply', 'score_updated', 'tier_upgraded'
  title: text("title"), // For in-app notifications
  message: text("message"), // For in-app notifications
  channel: text("channel").notNull().default("email"), // 'email' | 'in_app' | 'both'
  status: text("status").notNull().default("sent"), // 'queued' | 'sent' | 'failed'
  read: boolean("read").default(false), // For in-app notifications
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  type: true,
  title: true,
  message: true,
  channel: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Shipping Issues (reported by influencers)
export const shippingIssues = pgTable("shipping_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull(),
  influencerId: varchar("influencer_id").notNull(),
  campaignId: varchar("campaign_id").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'resolved' | 'dismissed'
  resolvedByAdminId: varchar("resolved_by_admin_id"),
  resolvedAt: timestamp("resolved_at"),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShippingIssueSchema = createInsertSchema(shippingIssues).pick({
  applicationId: true,
  influencerId: true,
  campaignId: true,
  message: true,
});

export type InsertShippingIssue = z.infer<typeof insertShippingIssueSchema>;
export type ShippingIssue = typeof shippingIssues.$inferSelect;

// Extended types for frontend with joined data
export type ApplicationWithDetails = Application & {
  campaign: Campaign;
  influencer?: Influencer;
  shipping?: Shipping;
  upload?: Upload;
};

export type CampaignWithStats = Campaign & {
  applicationCount?: number;
  pendingCount?: number;
};

export type ShippingIssueWithDetails = ShippingIssue & {
  influencer?: Influencer;
  campaign?: Campaign;
  applicationStatus?: string;
};

// Support Tickets (general questions from influencers)
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'resolved' | 'closed'
  resolvedByAdminId: varchar("resolved_by_admin_id"),
  resolvedAt: timestamp("resolved_at"),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).pick({
  influencerId: true,
  subject: true,
  message: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type SupportTicketWithDetails = SupportTicket & {
  influencer?: Influencer;
};

// Payout Requests (for cash rewards from paid campaigns)
export const payoutRequests = pgTable("payout_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  amount: integer("amount").notNull(), // Amount in dollars
  paypalEmail: text("paypal_email").notNull(), // PayPal email for payout
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'rejected'
  processedByAdminId: varchar("processed_by_admin_id"),
  processedAt: timestamp("processed_at"),
  adminNote: text("admin_note"),
  paypalTransactionId: text("paypal_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).pick({
  influencerId: true,
  amount: true,
  paypalEmail: true,
});

export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;

export type PayoutRequestWithDetails = PayoutRequest & {
  influencer?: Influencer;
};
