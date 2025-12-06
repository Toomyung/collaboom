import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./db";
import * as bcrypt from 'bcryptjs';
import { deleteImagesFromStorage } from "./supabaseStorage";
import {
  admins, influencers, campaigns, applications, shipping, uploads,
  scoreEvents, penaltyEvents, adminNotes, notifications, shippingIssues, supportTickets,
  bannedEmails,
  type Admin, type InsertAdmin,
  type Influencer, type InsertInfluencer,
  type Campaign, type InsertCampaign,
  type Application, type InsertApplication, type ApplicationWithDetails,
  type Shipping, type InsertShipping,
  type Upload, type InsertUpload,
  type ScoreEvent, type InsertScoreEvent,
  type PenaltyEvent, type InsertPenaltyEvent,
  type AdminNote, type InsertAdminNote,
  type Notification, type InsertNotification,
  type ShippingIssue, type InsertShippingIssue, type ShippingIssueWithDetails,
  type SupportTicket, type InsertSupportTicket, type SupportTicketWithDetails,
} from "@shared/schema";
import { IStorage, GetCampaignsOptions, PaginatedCampaignsResult } from "./storage";

export class DatabaseStorage implements IStorage {
  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const passwordHash = await bcrypt.hash(admin.password, 10);
    const [newAdmin] = await db.insert(admins).values({
      email: admin.email,
      password: passwordHash,
      name: admin.name || null,
      role: 'admin',
    }).returning();
    return newAdmin;
  }

  async getInfluencer(id: string): Promise<Influencer | undefined> {
    const [influencer] = await db.select().from(influencers).where(eq(influencers.id, id));
    return influencer;
  }

  async getInfluencerByEmail(email: string): Promise<Influencer | undefined> {
    const [influencer] = await db.select().from(influencers).where(eq(influencers.email, email));
    return influencer;
  }

  async getInfluencerBySupabaseId(supabaseId: string): Promise<Influencer | undefined> {
    const [influencer] = await db.select().from(influencers).where(eq(influencers.supabaseId, supabaseId));
    return influencer;
  }

  async getInfluencerByTiktokHandle(handle: string): Promise<Influencer | undefined> {
    const [influencer] = await db.select().from(influencers).where(eq(influencers.tiktokHandle, handle));
    return influencer;
  }

  async getInfluencerByInstagramHandle(handle: string): Promise<Influencer | undefined> {
    const [influencer] = await db.select().from(influencers).where(eq(influencers.instagramHandle, handle));
    return influencer;
  }

  async createInfluencer(email: string, passwordHash: string): Promise<Influencer> {
    const [newInfluencer] = await db.insert(influencers).values({
      email,
      profileCompleted: false,
      score: 0,
      penalty: 0,
      restricted: false,
      country: 'United States',
    }).returning();
    return newInfluencer;
  }

  async createInfluencerFromSupabase(data: {
    email: string;
    supabaseId: string;
    name?: string | null;
    profileImageUrl?: string | null;
  }): Promise<Influencer> {
    const [newInfluencer] = await db.insert(influencers).values({
      email: data.email,
      supabaseId: data.supabaseId,
      name: data.name || null,
      profileImageUrl: data.profileImageUrl || null,
      profileCompleted: false,
      score: 0,
      penalty: 0,
      restricted: false,
      country: 'United States',
    }).returning();
    return newInfluencer;
  }

  async updateInfluencer(id: string, data: Partial<Influencer>): Promise<Influencer | undefined> {
    const influencer = await this.getInfluencer(id);
    if (!influencer) return undefined;

    const merged = { ...influencer, ...data };
    const requiredFields = ['name', 'tiktokHandle', 'phone', 'addressLine1', 'city', 'state', 'zipCode'];
    const isComplete = requiredFields.every(field => merged[field as keyof Influencer]);
    
    const updateData: Partial<Influencer> = { ...data };
    updateData.profileCompleted = isComplete;
    
    if ((merged.penalty ?? 0) >= 5 && !merged.restricted) {
      updateData.restricted = true;
    }

    const [updated] = await db.update(influencers)
      .set(updateData)
      .where(eq(influencers.id, id))
      .returning();
    return updated;
  }

  async getAllInfluencers(): Promise<Influencer[]> {
    return await db.select().from(influencers).orderBy(desc(influencers.createdAt));
  }

  async getInfluencersPaginated(options: {
    page?: number;
    pageSize?: number;
    search?: string;
    campaignId?: string;
  }): Promise<{
    items: Array<Influencer & { appliedCount: number; acceptedCount: number; completedCount: number }>;
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize || 20));
    const offset = (page - 1) * pageSize;

    let baseQuery = db.select().from(influencers);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(influencers);

    const conditions: any[] = [];

    if (options.search) {
      const searchPattern = `%${options.search.toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(${influencers.name}) LIKE ${searchPattern} OR LOWER(${influencers.email}) LIKE ${searchPattern} OR LOWER(${influencers.tiktokHandle}) LIKE ${searchPattern} OR LOWER(${influencers.instagramHandle}) LIKE ${searchPattern})`
      );
    }

    if (options.campaignId) {
      const influencerIds = await db
        .select({ influencerId: applications.influencerId })
        .from(applications)
        .where(eq(applications.campaignId, options.campaignId));
      
      const ids = influencerIds.map(r => r.influencerId);
      if (ids.length > 0) {
        conditions.push(sql`${influencers.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
      } else {
        return { items: [], totalCount: 0, page, pageSize };
      }
    }

    let influencerResults: Influencer[];
    let totalCount: number;

    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      influencerResults = await db
        .select()
        .from(influencers)
        .where(whereClause)
        .orderBy(desc(influencers.createdAt))
        .limit(pageSize)
        .offset(offset);
      
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(influencers)
        .where(whereClause);
      totalCount = Number(countResult[0]?.count || 0);
    } else {
      influencerResults = await db
        .select()
        .from(influencers)
        .orderBy(desc(influencers.createdAt))
        .limit(pageSize)
        .offset(offset);
      
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(influencers);
      totalCount = Number(countResult[0]?.count || 0);
    }

    const itemsWithStats = await Promise.all(
      influencerResults.map(async (inf) => {
        const apps = await db
          .select()
          .from(applications)
          .where(eq(applications.influencerId, inf.id));
        
        const appliedCount = apps.length;
        const acceptedCount = apps.filter(a => 
          ['approved', 'shipped', 'delivered', 'uploaded', 'verified'].includes(a.status)
        ).length;
        const completedCount = apps.filter(a => 
          a.status === 'verified'
        ).length;

        return {
          ...inf,
          appliedCount,
          acceptedCount,
          completedCount,
        };
      })
    );

    return {
      items: itemsWithStats,
      totalCount,
      page,
      pageSize,
    };
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    // Include 'closed' so influencers can still view closed campaigns (but not apply)
    return await db.select().from(campaigns).where(
      sql`${campaigns.status} IN ('active', 'full', 'closed')`
    ).orderBy(desc(campaigns.createdAt));
  }

  async getActiveCampaignsPaginated(options: { page: number; pageSize: number }): Promise<PaginatedCampaignsResult> {
    const page = Math.max(1, options.page);
    const pageSize = Math.min(50, Math.max(1, options.pageSize));
    const offset = (page - 1) * pageSize;

    // Get total count of active campaigns (including closed for visibility)
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(sql`${campaigns.status} IN ('active', 'full', 'closed')`);
    const totalCount = Number(countResult[0]?.count || 0);

    // Get paginated items
    const items = await db.select()
      .from(campaigns)
      .where(sql`${campaigns.status} IN ('active', 'full', 'closed')`)
      .orderBy(desc(campaigns.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      totalCount,
      page,
      pageSize,
    };
  }

  async getCampaignsPaginated(options: GetCampaignsOptions): Promise<PaginatedCampaignsResult> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const search = options.search;
    const status = options.status;
    const statuses = options.statuses;

    // Build conditions
    const conditions = [];
    if (search) {
      conditions.push(sql`LOWER(${campaigns.name}) LIKE LOWER(${'%' + search + '%'})`);
    }
    if (status && status !== 'all') {
      conditions.push(eq(campaigns.status, status));
    } else if (statuses) {
      // Support filtering by multiple statuses (comma-separated)
      const statusList = statuses.split(',').map(s => s.trim());
      conditions.push(sql`${campaigns.status} IN (${sql.join(statusList.map(s => sql`${s}`), sql`, `)})`);
    }

    // Get total count
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count || 0);

    // Get paginated items
    const items = await db.select()
      .from(campaigns)
      .where(whereClause)
      .orderBy(desc(campaigns.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      totalCount,
      page,
      pageSize,
    };
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values({
      name: campaign.name,
      brandName: campaign.brandName,
      productName: campaign.productName || null,
      category: campaign.category,
      rewardType: campaign.rewardType,
      rewardAmount: campaign.rewardAmount || null,
      inventory: campaign.inventory,
      approvedCount: 0,
      imageUrl: campaign.imageUrl || null,
      imageUrls: campaign.imageUrls || null,
      amazonUrl: campaign.amazonUrl || null,
      instagramUrl: (campaign as any).instagramUrl || null,
      tiktokUrl: (campaign as any).tiktokUrl || null,
      officialWebsiteUrl: (campaign as any).officialWebsiteUrl || null,
      guidelinesSummary: campaign.guidelinesSummary || null,
      guidelinesUrl: campaign.guidelinesUrl || null,
      contentOverview: (campaign as any).contentOverview || null,
      requiredHashtags: campaign.requiredHashtags || null,
      requiredMentions: campaign.requiredMentions || null,
      productDetail: (campaign as any).productDetail || null,
      stepByStepProcess: (campaign as any).stepByStepProcess || null,
      eligibilityRequirements: (campaign as any).eligibilityRequirements || null,
      // Video Guidelines
      videoEssentialCuts: (campaign as any).videoEssentialCuts || null,
      videoAboutProduct: (campaign as any).videoAboutProduct || null,
      videoDetails: (campaign as any).videoDetails || null,
      videoReferenceUrls: (campaign as any).videoReferenceUrls || null,
      videoKeyPoints: (campaign as any).videoKeyPoints || null,
      applicationDeadline: campaign.applicationDeadline ? new Date(campaign.applicationDeadline) : null,
      deadline: new Date(campaign.deadline),
      campaignTimeline: (campaign as any).campaignTimeline || null,
      status: campaign.status || 'draft',
      createdByAdminId: campaign.createdByAdminId || null,
    }).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = await this.getCampaign(id);
    if (!campaign) return undefined;

    const merged = { ...campaign, ...data };
    if ((merged.approvedCount ?? 0) >= merged.inventory && merged.status === 'active') {
      data.status = 'full';
    }

    const [updated] = await db.update(campaigns)
      .set(data)
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async incrementCampaignApprovedCount(id: string): Promise<void> {
    const campaign = await this.getCampaign(id);
    if (campaign) {
      const newCount = (campaign.approvedCount ?? 0) + 1;
      const newStatus = newCount >= campaign.inventory && campaign.status === 'active' ? 'full' : campaign.status;
      await db.update(campaigns)
        .set({ approvedCount: newCount, status: newStatus })
        .where(eq(campaigns.id, id));
    }
  }

  async decrementCampaignApprovedCount(id: string): Promise<void> {
    const campaign = await this.getCampaign(id);
    if (campaign && (campaign.approvedCount ?? 0) > 0) {
      await db.update(campaigns)
        .set({ approvedCount: (campaign.approvedCount ?? 1) - 1 })
        .where(eq(campaigns.id, id));
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    // Get campaign first to retrieve image URLs for Storage cleanup
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    
    if (campaign) {
      // Delete images from Supabase Storage (graceful - errors logged but don't block deletion)
      const imageUrls: string[] = [];
      if (campaign.imageUrls && Array.isArray(campaign.imageUrls)) {
        imageUrls.push(...campaign.imageUrls);
      }
      if (campaign.imageUrl) {
        imageUrls.push(campaign.imageUrl);
      }
      
      if (imageUrls.length > 0) {
        try {
          const result = await deleteImagesFromStorage(imageUrls);
          if (result.verified) {
            console.log(`[Campaign Delete] Storage cleanup: ${result.deleted} images deleted (verified)`);
          } else {
            console.warn(`[Campaign Delete] Storage cleanup incomplete: ${result.deleted}/${imageUrls.length} deleted`);
            if (result.errors.length > 0) {
              console.warn('[Campaign Delete] Storage errors:', result.errors);
            }
          }
        } catch (error) {
          console.error('[Campaign Delete] Storage cleanup failed (continuing with DB deletion):', error);
        }
      }
    }
    
    // Get all applications for this campaign
    const campaignApps = await db.select().from(applications).where(eq(applications.campaignId, id));
    
    // Delete related data for each application
    for (const app of campaignApps) {
      await db.delete(shipping).where(eq(shipping.applicationId, app.id));
      await db.delete(uploads).where(eq(uploads.applicationId, app.id));
      await db.delete(shippingIssues).where(eq(shippingIssues.applicationId, app.id));
    }
    
    // Delete notifications for this campaign
    await db.delete(notifications).where(eq(notifications.campaignId, id));
    
    // Delete all applications for this campaign
    await db.delete(applications).where(eq(applications.campaignId, id));
    
    // Finally delete the campaign
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application;
  }

  async getApplicationByInfluencerAndCampaign(influencerId: string, campaignId: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications)
      .where(and(eq(applications.influencerId, influencerId), eq(applications.campaignId, campaignId)));
    return application;
  }

  async getApplicationsByInfluencer(influencerId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.influencerId, influencerId));
  }

  async getApplicationsByCampaign(campaignId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.campaignId, campaignId));
  }

  async getApplicationsWithDetails(influencerId: string): Promise<ApplicationWithDetails[]> {
    // Optimized: Single query with LEFT JOINs instead of N+1 queries
    const results = await db
      .select({
        application: applications,
        campaign: campaigns,
        shipping: shipping,
        upload: uploads,
      })
      .from(applications)
      .leftJoin(campaigns, eq(applications.campaignId, campaigns.id))
      .leftJoin(shipping, eq(applications.id, shipping.applicationId))
      .leftJoin(uploads, eq(applications.id, uploads.applicationId))
      .where(eq(applications.influencerId, influencerId))
      .orderBy(desc(applications.appliedAt));

    return results
      .filter(r => r.campaign !== null)
      .map(r => ({
        ...r.application,
        campaign: r.campaign!,
        shipping: r.shipping || undefined,
        upload: r.upload || undefined,
      }));
  }

  async getAllApplicationsHistory(influencerId: string): Promise<ApplicationWithDetails[]> {
    // Optimized: Single query with LEFT JOINs instead of N+1 queries
    // Returns all applications including dismissed ones (full history)
    const results = await db
      .select({
        application: applications,
        campaign: campaigns,
        shipping: shipping,
        upload: uploads,
      })
      .from(applications)
      .leftJoin(campaigns, eq(applications.campaignId, campaigns.id))
      .leftJoin(shipping, eq(applications.id, shipping.applicationId))
      .leftJoin(uploads, eq(applications.id, uploads.applicationId))
      .where(eq(applications.influencerId, influencerId))
      .orderBy(desc(applications.appliedAt));

    return results
      .filter(r => r.campaign !== null)
      .map(r => ({
        ...r.application,
        campaign: r.campaign!,
        shipping: r.shipping || undefined,
        upload: r.upload || undefined,
      }));
  }

  async getApplicationsWithDetailsByCampaign(campaignId: string): Promise<ApplicationWithDetails[]> {
    // Optimized: Single query with LEFT JOINs instead of N+1 queries
    const results = await db
      .select({
        application: applications,
        campaign: campaigns,
        influencer: influencers,
        shipping: shipping,
        upload: uploads,
      })
      .from(applications)
      .leftJoin(campaigns, eq(applications.campaignId, campaigns.id))
      .leftJoin(influencers, eq(applications.influencerId, influencers.id))
      .leftJoin(shipping, eq(applications.id, shipping.applicationId))
      .leftJoin(uploads, eq(applications.id, uploads.applicationId))
      .where(eq(applications.campaignId, campaignId))
      .orderBy(desc(applications.appliedAt));

    return results
      .filter(r => r.campaign !== null)
      .map(r => ({
        ...r.application,
        campaign: r.campaign!,
        influencer: r.influencer || undefined,
        shipping: r.shipping || undefined,
        upload: r.upload || undefined,
      }));
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const previousApps = await this.getApplicationsByInfluencer(application.influencerId);
    const hasCompletedBefore = previousApps.some(a => a.status === 'completed');

    // Generate sequential number per campaign (1, 2, 3...)
    const campaignApps = await this.getApplicationsByCampaign(application.campaignId);
    const maxSeq = campaignApps.reduce((max, a) => Math.max(max, a.sequenceNumber || 0), 0);
    const sequenceNumber = maxSeq + 1;

    const [newApplication] = await db.insert(applications).values({
      campaignId: application.campaignId,
      influencerId: application.influencerId,
      sequenceNumber,
      status: 'pending',
      firstTime: !hasCompletedBefore,
    }).returning();
    return newApplication;
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application | undefined> {
    const [updated] = await db.update(applications)
      .set(data)
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    await db.delete(applications).where(eq(applications.id, id));
  }

  async getShippingByApplication(applicationId: string): Promise<Shipping | undefined> {
    const [shippingData] = await db.select().from(shipping).where(eq(shipping.applicationId, applicationId));
    return shippingData;
  }

  async createShipping(shippingData: InsertShipping): Promise<Shipping> {
    const [newShipping] = await db.insert(shipping).values({
      applicationId: shippingData.applicationId,
      status: 'pending',
      trackingNumber: shippingData.trackingNumber || null,
      courier: shippingData.courier || null,
    }).returning();
    return newShipping;
  }

  async updateShipping(id: string, data: Partial<Shipping>): Promise<Shipping | undefined> {
    const [updated] = await db.update(shipping)
      .set(data)
      .where(eq(shipping.id, id))
      .returning();
    return updated;
  }

  async updateShippingByApplication(applicationId: string, data: Partial<Shipping>): Promise<Shipping | undefined> {
    const shippingData = await this.getShippingByApplication(applicationId);
    if (!shippingData) return undefined;
    return this.updateShipping(shippingData.id, data);
  }

  async getUploadByApplication(applicationId: string): Promise<Upload | undefined> {
    const [upload] = await db.select().from(uploads).where(eq(uploads.applicationId, applicationId));
    return upload;
  }

  async createUpload(uploadData: InsertUpload): Promise<Upload> {
    const [newUpload] = await db.insert(uploads).values({
      applicationId: uploadData.applicationId,
      status: 'not_uploaded',
      tiktokVideoUrl: uploadData.tiktokVideoUrl || null,
    }).returning();
    return newUpload;
  }

  async updateUpload(id: string, data: Partial<Upload>): Promise<Upload | undefined> {
    const [updated] = await db.update(uploads)
      .set(data)
      .where(eq(uploads.id, id))
      .returning();
    return updated;
  }

  async updateUploadByApplication(applicationId: string, data: Partial<Upload>): Promise<Upload | undefined> {
    const upload = await this.getUploadByApplication(applicationId);
    if (!upload) return undefined;
    return this.updateUpload(upload.id, data);
  }

  async addScoreEvent(event: InsertScoreEvent): Promise<ScoreEvent> {
    const [newEvent] = await db.insert(scoreEvents).values({
      influencerId: event.influencerId,
      campaignId: event.campaignId || null,
      applicationId: event.applicationId || null,
      delta: event.delta,
      reason: event.reason,
      createdByAdminId: event.createdByAdminId || null,
    }).returning();

    const influencer = await this.getInfluencer(event.influencerId);
    if (influencer) {
      const newScore = Math.max(0, Math.min(100, (influencer.score ?? 0) + event.delta));
      await this.updateInfluencer(event.influencerId, { score: newScore });
    }

    return newEvent;
  }

  async getScoreEventsByInfluencer(influencerId: string): Promise<ScoreEvent[]> {
    return await db.select().from(scoreEvents)
      .where(eq(scoreEvents.influencerId, influencerId))
      .orderBy(desc(scoreEvents.createdAt));
  }

  async addPenaltyEvent(event: InsertPenaltyEvent): Promise<PenaltyEvent> {
    const [newEvent] = await db.insert(penaltyEvents).values({
      influencerId: event.influencerId,
      campaignId: event.campaignId || null,
      applicationId: event.applicationId || null,
      delta: event.delta,
      reason: event.reason,
      createdByAdminId: event.createdByAdminId || null,
    }).returning();

    const influencer = await this.getInfluencer(event.influencerId);
    if (influencer) {
      const newPenalty = Math.max(0, (influencer.penalty ?? 0) + event.delta);
      await this.updateInfluencer(event.influencerId, {
        penalty: newPenalty,
        restricted: newPenalty >= 5,
      });
    }

    return newEvent;
  }

  async getPenaltyEventsByInfluencer(influencerId: string): Promise<PenaltyEvent[]> {
    return await db.select().from(penaltyEvents)
      .where(eq(penaltyEvents.influencerId, influencerId))
      .orderBy(desc(penaltyEvents.createdAt));
  }

  async addAdminNote(note: InsertAdminNote): Promise<AdminNote> {
    const [newNote] = await db.insert(adminNotes).values({
      influencerId: note.influencerId,
      campaignId: note.campaignId || null,
      applicationId: note.applicationId || null,
      adminId: note.adminId,
      note: note.note,
    }).returning();
    return newNote;
  }

  async getNotesByInfluencer(influencerId: string): Promise<AdminNote[]> {
    return await db.select().from(adminNotes)
      .where(eq(adminNotes.influencerId, influencerId))
      .orderBy(desc(adminNotes.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values({
      influencerId: notification.influencerId,
      campaignId: notification.campaignId || null,
      applicationId: notification.applicationId || null,
      type: notification.type,
      channel: notification.channel || 'email',
      status: 'sent',
    }).returning();
    return newNotification;
  }

  async getNotificationsByInfluencer(influencerId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    
    return await db.select().from(notifications)
      .where(eq(notifications.influencerId, influencerId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createShippingIssue(issue: InsertShippingIssue): Promise<ShippingIssue> {
    const [newIssue] = await db.insert(shippingIssues).values({
      applicationId: issue.applicationId,
      influencerId: issue.influencerId,
      campaignId: issue.campaignId,
      message: issue.message,
      status: 'open',
    }).returning();
    return newIssue;
  }

  async getShippingIssuesByApplication(applicationId: string): Promise<ShippingIssue[]> {
    return await db.select().from(shippingIssues)
      .where(eq(shippingIssues.applicationId, applicationId));
  }

  async getShippingIssuesByInfluencer(influencerId: string): Promise<ShippingIssue[]> {
    return await db.select().from(shippingIssues)
      .where(eq(shippingIssues.influencerId, influencerId))
      .orderBy(desc(shippingIssues.createdAt));
  }

  async getAllOpenShippingIssues(): Promise<ShippingIssueWithDetails[]> {
    // Optimized: Single query with LEFT JOINs instead of N+1 queries
    const results = await db
      .select({
        issue: shippingIssues,
        influencer: influencers,
        campaign: campaigns,
        application: applications,
      })
      .from(shippingIssues)
      .leftJoin(influencers, eq(shippingIssues.influencerId, influencers.id))
      .leftJoin(campaigns, eq(shippingIssues.campaignId, campaigns.id))
      .leftJoin(applications, eq(shippingIssues.applicationId, applications.id))
      .where(eq(shippingIssues.status, 'open'))
      .orderBy(desc(shippingIssues.createdAt));

    return results.map(r => ({
      ...r.issue,
      influencer: r.influencer || undefined,
      campaign: r.campaign || undefined,
      applicationStatus: r.application?.status,
    }));
  }

  async getAllShippingIssues(): Promise<ShippingIssueWithDetails[]> {
    // Optimized: Single query with LEFT JOINs instead of N+1 queries
    const results = await db
      .select({
        issue: shippingIssues,
        influencer: influencers,
        campaign: campaigns,
        application: applications,
      })
      .from(shippingIssues)
      .leftJoin(influencers, eq(shippingIssues.influencerId, influencers.id))
      .leftJoin(campaigns, eq(shippingIssues.campaignId, campaigns.id))
      .leftJoin(applications, eq(shippingIssues.applicationId, applications.id))
      .orderBy(desc(shippingIssues.createdAt));

    return results.map(r => ({
      ...r.issue,
      influencer: r.influencer || undefined,
      campaign: r.campaign || undefined,
      applicationStatus: r.application?.status,
    }));
  }

  async updateShippingIssue(id: string, data: Partial<ShippingIssue>): Promise<ShippingIssue | undefined> {
    const [updated] = await db.update(shippingIssues)
      .set(data)
      .where(eq(shippingIssues.id, id))
      .returning();
    return updated;
  }

  // Support Tickets
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db.insert(supportTickets).values({
      influencerId: ticket.influencerId,
      subject: ticket.subject,
      message: ticket.message,
      status: "open",
    }).returning();
    return newTicket;
  }

  async getSupportTicketsByInfluencer(influencerId: string): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.influencerId, influencerId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(): Promise<SupportTicketWithDetails[]> {
    // Optimized: Single query with LEFT JOIN instead of N+1 queries
    const results = await db
      .select({
        ticket: supportTickets,
        influencer: influencers,
      })
      .from(supportTickets)
      .leftJoin(influencers, eq(supportTickets.influencerId, influencers.id))
      .orderBy(desc(supportTickets.createdAt));

    return results.map(r => ({
      ...r.ticket,
      influencer: r.influencer || undefined,
    }));
  }

  async getAllOpenSupportTickets(): Promise<SupportTicketWithDetails[]> {
    // Optimized: Single query with LEFT JOIN instead of N+1 queries
    const results = await db
      .select({
        ticket: supportTickets,
        influencer: influencers,
      })
      .from(supportTickets)
      .leftJoin(influencers, eq(supportTickets.influencerId, influencers.id))
      .where(eq(supportTickets.status, "open"))
      .orderBy(desc(supportTickets.createdAt));

    return results.map(r => ({
      ...r.ticket,
      influencer: r.influencer || undefined,
    }));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket;
  }

  async updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets)
      .set(data)
      .where(eq(supportTickets.id, id))
      .returning();
    return updated;
  }

  async getAdminStats(): Promise<{
    activeCampaigns: number;
    pendingApplicants: number;
    shippingPending: number;
    uploadPending: number;
    openIssues: number;
  }> {
    const [activeCampaignsResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(campaigns).where(eq(campaigns.status, 'active'));
    
    const [pendingApplicantsResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(applications).where(eq(applications.status, 'pending'));
    
    const [shippingPendingResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(applications).where(eq(applications.status, 'approved'));
    
    const [uploadPendingResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(applications).where(eq(applications.status, 'delivered'));
    
    const [openIssuesResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(shippingIssues).where(eq(shippingIssues.status, 'open'));

    return {
      activeCampaigns: activeCampaignsResult?.count ?? 0,
      pendingApplicants: pendingApplicantsResult?.count ?? 0,
      shippingPending: shippingPendingResult?.count ?? 0,
      uploadPending: uploadPendingResult?.count ?? 0,
      openIssues: openIssuesResult?.count ?? 0,
    };
  }

  async verifyAdminPassword(id: string, password: string): Promise<boolean> {
    const admin = await this.getAdmin(id);
    if (!admin) return false;
    return bcrypt.compare(password, admin.password);
  }

  async verifyInfluencerPassword(id: string, password: string): Promise<boolean> {
    return false;
  }

  // Banned Emails
  async addBannedEmail(email: string, supabaseId?: string | null, reason?: string): Promise<void> {
    await db.insert(bannedEmails).values({
      email: email.toLowerCase(),
      supabaseId: supabaseId || null,
      reason: reason || "Account deleted after block",
    }).onConflictDoNothing();
  }

  async isBannedEmail(email: string): Promise<boolean> {
    const [result] = await db.select().from(bannedEmails).where(eq(bannedEmails.email, email.toLowerCase()));
    return !!result;
  }

  async deleteInfluencer(id: string): Promise<void> {
    // Get influencer first to save their email
    const influencer = await this.getInfluencer(id);
    if (!influencer) return;

    // Add email to banned list before deleting
    await this.addBannedEmail(influencer.email, influencer.supabaseId, "Account deleted after block");

    // Delete related data first (in order to avoid foreign key constraints)
    // Delete applications and their related data
    const influencerApps = await db.select().from(applications).where(eq(applications.influencerId, id));
    for (const app of influencerApps) {
      await db.delete(shipping).where(eq(shipping.applicationId, app.id));
      await db.delete(uploads).where(eq(uploads.applicationId, app.id));
      await db.delete(shippingIssues).where(eq(shippingIssues.applicationId, app.id));
    }
    await db.delete(applications).where(eq(applications.influencerId, id));

    // Delete other related data
    await db.delete(scoreEvents).where(eq(scoreEvents.influencerId, id));
    await db.delete(penaltyEvents).where(eq(penaltyEvents.influencerId, id));
    await db.delete(adminNotes).where(eq(adminNotes.influencerId, id));
    await db.delete(notifications).where(eq(notifications.influencerId, id));
    await db.delete(supportTickets).where(eq(supportTickets.influencerId, id));

    // Finally delete the influencer
    await db.delete(influencers).where(eq(influencers.id, id));
  }
}
