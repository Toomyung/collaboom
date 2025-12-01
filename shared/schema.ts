import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  name: text("name"),
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
  profileCompleted: boolean("profile_completed").default(false),
  score: integer("score").default(0),
  penalty: integer("penalty").default(0),
  restricted: boolean("restricted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInfluencerSchema = createInsertSchema(influencers).pick({
  email: true,
  name: true,
  tiktokHandle: true,
  instagramHandle: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  zipCode: true,
  paypalEmail: true,
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tiktokHandle: z.string().min(1, "TikTok handle is required"),
  instagramHandle: z.string().optional(),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\-\+\(\)]+$/, "Phone number can only contain digits, spaces, and +/- characters"),
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
    .regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 digits (e.g., 12345) or 9 digits with hyphen (e.g., 12345-6789)"),
  paypalEmail: z.string().email("Valid PayPal email is required").optional().or(z.literal("")),
});

export type InsertInfluencer = z.infer<typeof insertInfluencerSchema>;
export type Influencer = typeof influencers.$inferSelect;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brandName: text("brand_name").notNull(),
  productName: text("product_name"), // Product name for the campaign
  category: text("category").notNull(), // 'beauty' | 'food' | 'lifestyle'
  rewardType: text("reward_type").notNull(), // 'gift' | 'paid'
  rewardAmount: integer("reward_amount"), // Amount in USD for 'paid' type (e.g., 20, 50, 100)
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
  category: string;
  rewardType: string;
  rewardAmount: number | null;
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
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'shipped' | 'delivered' | 'uploaded' | 'deadline_missed' | 'completed'
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  uploadedAt: timestamp("uploaded_at"),
  deadlineMissedAt: timestamp("deadline_missed_at"),
  firstTime: boolean("first_time").default(false),
  notesInternal: text("notes_internal"),
  // Shipping address (admin-editable, separate from influencer's original address)
  shippingAddressLine1: text("shipping_address_line1"),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZipCode: text("shipping_zip_code"),
  shippingCountry: text("shipping_country"),
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
  reason: text("reason").notNull(), // 'first_upload', 'upload_success', 'streak_3', 'brand_feedback', 'admin_manual'
  createdByAdminId: varchar("created_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScoreEventSchema = createInsertSchema(scoreEvents).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  delta: true,
  reason: true,
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
  createdByAdminId: varchar("created_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPenaltyEventSchema = createInsertSchema(penaltyEvents).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  delta: true,
  reason: true,
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

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull(),
  campaignId: varchar("campaign_id"),
  applicationId: varchar("application_id"),
  type: text("type").notNull(), // 'welcome', 'approved', 'rejected', 'shipping_shipped', 'shipping_delivered', 'deadline_48h', 'deadline_missed', 'account_restricted'
  channel: text("channel").notNull().default("email"),
  status: text("status").notNull().default("sent"), // 'queued' | 'sent' | 'failed'
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  influencerId: true,
  campaignId: true,
  applicationId: true,
  type: true,
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
};
