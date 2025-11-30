import { 
  type Admin, type InsertAdmin,
  type Influencer, type InsertInfluencer, type UpdateProfile,
  type Campaign, type InsertCampaign,
  type Application, type InsertApplication, type ApplicationWithDetails,
  type Shipping, type InsertShipping,
  type Upload, type InsertUpload,
  type ScoreEvent, type InsertScoreEvent,
  type PenaltyEvent, type InsertPenaltyEvent,
  type AdminNote, type InsertAdminNote,
  type Notification, type InsertNotification,
  type ShippingIssue, type InsertShippingIssue, type ShippingIssueWithDetails,
} from "@shared/schema";
import { randomUUID } from "crypto";
import * as bcrypt from 'bcryptjs';

export interface InfluencerWithStats extends Influencer {
  appliedCount: number;
  acceptedCount: number;
  completedCount: number;
}

export interface PaginatedInfluencersResult {
  items: InfluencerWithStats[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface GetInfluencersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  campaignId?: string;
}

export interface PaginatedCampaignsResult {
  items: Campaign[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface GetCampaignsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  statuses?: string;  // Comma-separated list of statuses
}

export interface IStorage {
  // Admin
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // Influencer
  getInfluencer(id: string): Promise<Influencer | undefined>;
  getInfluencerByEmail(email: string): Promise<Influencer | undefined>;
  getInfluencerBySupabaseId(supabaseId: string): Promise<Influencer | undefined>;
  getInfluencerByTiktokHandle(handle: string): Promise<Influencer | undefined>;
  createInfluencer(email: string, passwordHash: string): Promise<Influencer>;
  createInfluencerFromSupabase(data: { email: string; supabaseId: string; name?: string | null; profileImageUrl?: string | null }): Promise<Influencer>;
  updateInfluencer(id: string, data: Partial<Influencer>): Promise<Influencer | undefined>;
  getAllInfluencers(): Promise<Influencer[]>;
  getInfluencersPaginated(options: GetInfluencersOptions): Promise<PaginatedInfluencersResult>;
  
  // Campaign
  getCampaign(id: string): Promise<Campaign | undefined>;
  getAllCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;
  getActiveCampaignsPaginated(options: { page: number; pageSize: number }): Promise<PaginatedCampaignsResult>;
  getCampaignsPaginated(options: GetCampaignsOptions): Promise<PaginatedCampaignsResult>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;
  incrementCampaignApprovedCount(id: string): Promise<void>;
  decrementCampaignApprovedCount(id: string): Promise<void>;
  
  // Application
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationByInfluencerAndCampaign(influencerId: string, campaignId: string): Promise<Application | undefined>;
  getApplicationsByInfluencer(influencerId: string): Promise<Application[]>;
  getApplicationsByCampaign(campaignId: string): Promise<Application[]>;
  getApplicationsWithDetails(influencerId: string): Promise<ApplicationWithDetails[]>;
  getApplicationsWithDetailsByCampaign(campaignId: string): Promise<ApplicationWithDetails[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, data: Partial<Application>): Promise<Application | undefined>;
  deleteApplication(id: string): Promise<void>;
  
  // Shipping
  getShippingByApplication(applicationId: string): Promise<Shipping | undefined>;
  createShipping(shipping: InsertShipping): Promise<Shipping>;
  updateShipping(id: string, data: Partial<Shipping>): Promise<Shipping | undefined>;
  updateShippingByApplication(applicationId: string, data: Partial<Shipping>): Promise<Shipping | undefined>;
  
  // Upload
  getUploadByApplication(applicationId: string): Promise<Upload | undefined>;
  createUpload(upload: InsertUpload): Promise<Upload>;
  updateUpload(id: string, data: Partial<Upload>): Promise<Upload | undefined>;
  updateUploadByApplication(applicationId: string, data: Partial<Upload>): Promise<Upload | undefined>;
  
  // Score Events
  addScoreEvent(event: InsertScoreEvent): Promise<ScoreEvent>;
  getScoreEventsByInfluencer(influencerId: string): Promise<ScoreEvent[]>;
  
  // Penalty Events
  addPenaltyEvent(event: InsertPenaltyEvent): Promise<PenaltyEvent>;
  getPenaltyEventsByInfluencer(influencerId: string): Promise<PenaltyEvent[]>;
  
  // Admin Notes
  addAdminNote(note: InsertAdminNote): Promise<AdminNote>;
  getNotesByInfluencer(influencerId: string): Promise<AdminNote[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByInfluencer(influencerId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]>;
  
  // Shipping Issues
  createShippingIssue(issue: InsertShippingIssue): Promise<ShippingIssue>;
  getShippingIssuesByApplication(applicationId: string): Promise<ShippingIssue[]>;
  getAllOpenShippingIssues(): Promise<ShippingIssueWithDetails[]>;
  updateShippingIssue(id: string, data: Partial<ShippingIssue>): Promise<ShippingIssue | undefined>;
  
  // Stats
  getAdminStats(): Promise<{
    activeCampaigns: number;
    pendingApplicants: number;
    shippingPending: number;
    uploadPending: number;
    openIssues: number;
  }>;
  
  // Auth
  verifyAdminPassword(id: string, password: string): Promise<boolean>;
  verifyInfluencerPassword(id: string, password: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private admins: Map<string, Admin>;
  private influencers: Map<string, Influencer>;
  private campaigns: Map<string, Campaign>;
  private applications: Map<string, Application>;
  private shipping: Map<string, Shipping>;
  private uploads: Map<string, Upload>;
  private scoreEvents: Map<string, ScoreEvent>;
  private penaltyEvents: Map<string, PenaltyEvent>;
  private adminNotes: Map<string, AdminNote>;
  private notifications: Map<string, Notification>;
  private shippingIssues: Map<string, ShippingIssue>;
  private influencerPasswords: Map<string, string>;
  private adminPasswords: Map<string, string>;

  constructor() {
    this.admins = new Map();
    this.influencers = new Map();
    this.campaigns = new Map();
    this.applications = new Map();
    this.shipping = new Map();
    this.uploads = new Map();
    this.scoreEvents = new Map();
    this.penaltyEvents = new Map();
    this.adminNotes = new Map();
    this.notifications = new Map();
    this.shippingIssues = new Map();
    this.influencerPasswords = new Map();
    this.adminPasswords = new Map();
    
    // Seed data
    this.seedData();
  }
  
  private async seedData() {
    // Create default admin
    const adminId = randomUUID();
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    this.admins.set(adminId, {
      id: adminId,
      email: 'admin@collaboom.com',
      password: adminPasswordHash,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
    });
    this.adminPasswords.set(adminId, adminPasswordHash);
    
    // Create sample campaigns
    const campaigns: Omit<Campaign, 'id' | 'createdAt'>[] = [
      {
        name: 'Hydrating Serum Collection',
        brandName: 'GlowLab Korea',
        category: 'beauty',
        rewardType: 'paid',
        rewardAmount: 20,
        inventory: 50,
        approvedCount: 23,
        imageUrl: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=400&fit=crop',
        amazonUrl: 'https://amazon.com/dp/example1',
        guidelinesSummary: 'Create a 30-60 second TikTok showing your skincare routine featuring our hydrating serum. Show before/after application.',
        guidelinesUrl: 'https://notion.so/glowlab/guidelines',
        requiredHashtags: ['#GlowLabPartner', '#HydratingSerum', '#KBeauty'],
        requiredMentions: ['@glowlabkorea'],
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdByAdminId: adminId,
      },
      {
        name: 'Organic Snack Box',
        brandName: 'NatureBite',
        category: 'food',
        rewardType: 'gift',
        rewardAmount: null,
        inventory: 100,
        approvedCount: 67,
        imageUrl: 'https://images.unsplash.com/photo-1604908177522-27d7bbafebef?w=600&h=400&fit=crop',
        amazonUrl: 'https://amazon.com/dp/example2',
        guidelinesSummary: 'Share your honest taste test reaction! Create engaging content showing you trying our organic snacks.',
        guidelinesUrl: null,
        requiredHashtags: ['#NatureBite', '#OrganicSnacks'],
        requiredMentions: ['@naturebite'],
        applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdByAdminId: adminId,
      },
      {
        name: 'Cozy Home Candle Set',
        brandName: 'CozyLife Home',
        category: 'lifestyle',
        rewardType: 'paid',
        rewardAmount: 50,
        inventory: 30,
        approvedCount: 28,
        imageUrl: 'https://images.unsplash.com/photo-1602607403925-3d0b3c3b3b3d?w=600&h=400&fit=crop',
        amazonUrl: 'https://amazon.com/dp/example3',
        guidelinesSummary: 'Create aesthetic content featuring our candle set in your home. Focus on the cozy atmosphere.',
        guidelinesUrl: 'https://notion.so/cozylife/guidelines',
        requiredHashtags: ['#CozyLifeHome', '#HomeDecor', '#CandleLover'],
        requiredMentions: ['@cozylifehome'],
        applicationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'full',
        createdByAdminId: adminId,
      },
      {
        name: 'Vitamin C Brightening Kit',
        brandName: 'SkinGlow',
        category: 'beauty',
        rewardType: 'paid',
        rewardAmount: 20,
        inventory: 40,
        approvedCount: 15,
        imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=400&fit=crop',
        amazonUrl: null,
        guidelinesSummary: 'Show your morning skincare routine with our Vitamin C kit. Highlight the glow!',
        guidelinesUrl: null,
        requiredHashtags: ['#SkinGlow', '#VitaminC'],
        requiredMentions: ['@skinglow'],
        applicationDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdByAdminId: adminId,
      },
      {
        name: 'Protein Bar Variety Pack',
        brandName: 'FitFuel',
        category: 'food',
        rewardType: 'gift',
        rewardAmount: null,
        inventory: 80,
        approvedCount: 45,
        imageUrl: 'https://images.unsplash.com/photo-1622484211148-c45b64e8a228?w=600&h=400&fit=crop',
        amazonUrl: 'https://amazon.com/dp/example5',
        guidelinesSummary: 'Create workout or healthy lifestyle content featuring our protein bars.',
        guidelinesUrl: null,
        requiredHashtags: ['#FitFuel', '#ProteinBars'],
        requiredMentions: ['@fitfuel'],
        applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdByAdminId: adminId,
      },
    ];
    
    for (const campaignData of campaigns) {
      const id = randomUUID();
      this.campaigns.set(id, {
        id,
        ...campaignData,
        createdAt: new Date(),
      });
    }
  }

  // Admin methods
  async getAdmin(id: string): Promise<Admin | undefined> {
    return this.admins.get(id);
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    return Array.from(this.admins.values()).find(a => a.email === email);
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(admin.password, 10);
    const newAdmin: Admin = {
      id,
      email: admin.email,
      password: passwordHash,
      name: admin.name || null,
      role: 'admin',
      createdAt: new Date(),
    };
    this.admins.set(id, newAdmin);
    this.adminPasswords.set(id, passwordHash);
    return newAdmin;
  }

  // Influencer methods
  async getInfluencer(id: string): Promise<Influencer | undefined> {
    return this.influencers.get(id);
  }

  async getInfluencerByEmail(email: string): Promise<Influencer | undefined> {
    return Array.from(this.influencers.values()).find(i => i.email === email);
  }

  async getInfluencerBySupabaseId(supabaseId: string): Promise<Influencer | undefined> {
    return Array.from(this.influencers.values()).find(i => i.supabaseId === supabaseId);
  }

  async getInfluencerByTiktokHandle(handle: string): Promise<Influencer | undefined> {
    return Array.from(this.influencers.values()).find(i => i.tiktokHandle === handle);
  }

  async createInfluencer(email: string, passwordHash: string): Promise<Influencer> {
    const id = randomUUID();
    const newInfluencer: Influencer = {
      id,
      supabaseId: null,
      email,
      name: null,
      profileImageUrl: null,
      tiktokHandle: null,
      instagramHandle: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      zipCode: null,
      country: 'United States',
      paypalEmail: null,
      profileCompleted: false,
      score: 0,
      penalty: 0,
      restricted: false,
      createdAt: new Date(),
    };
    this.influencers.set(id, newInfluencer);
    this.influencerPasswords.set(id, passwordHash);
    return newInfluencer;
  }

  async createInfluencerFromSupabase(data: { 
    email: string; 
    supabaseId: string;
    name?: string | null;
    profileImageUrl?: string | null;
  }): Promise<Influencer> {
    const id = randomUUID();
    const newInfluencer: Influencer = {
      id,
      supabaseId: data.supabaseId,
      email: data.email,
      name: data.name || null,
      profileImageUrl: data.profileImageUrl || null,
      tiktokHandle: null,
      instagramHandle: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      zipCode: null,
      country: 'United States',
      paypalEmail: null,
      profileCompleted: false,
      score: 0,
      penalty: 0,
      restricted: false,
      createdAt: new Date(),
    };
    this.influencers.set(id, newInfluencer);
    return newInfluencer;
  }

  async updateInfluencer(id: string, data: Partial<Influencer>): Promise<Influencer | undefined> {
    const influencer = this.influencers.get(id);
    if (!influencer) return undefined;
    
    const updated = { ...influencer, ...data };
    
    // Check if profile is complete
    const requiredFields = ['name', 'tiktokHandle', 'phone', 'addressLine1', 'city', 'state', 'zipCode'];
    const isComplete = requiredFields.every(field => updated[field as keyof Influencer]);
    updated.profileCompleted = isComplete;
    
    // Check if should be restricted
    if ((updated.penalty ?? 0) >= 5) {
      updated.restricted = true;
    }
    
    this.influencers.set(id, updated);
    return updated;
  }

  async getAllInfluencers(): Promise<Influencer[]> {
    return Array.from(this.influencers.values());
  }

  async getInfluencersPaginated(options: GetInfluencersOptions): Promise<PaginatedInfluencersResult> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize || 20));
    
    let allInfluencers = Array.from(this.influencers.values());
    
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      allInfluencers = allInfluencers.filter(inf => 
        inf.name?.toLowerCase().includes(searchLower) ||
        inf.email.toLowerCase().includes(searchLower) ||
        inf.tiktokHandle?.toLowerCase().includes(searchLower) ||
        inf.instagramHandle?.toLowerCase().includes(searchLower)
      );
    }
    
    if (options.campaignId) {
      const appInfluencerIds = new Set(
        Array.from(this.applications.values())
          .filter(a => a.campaignId === options.campaignId)
          .map(a => a.influencerId)
      );
      allInfluencers = allInfluencers.filter(inf => appInfluencerIds.has(inf.id));
    }
    
    const totalCount = allInfluencers.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedInfluencers = allInfluencers.slice(startIndex, startIndex + pageSize);
    
    const itemsWithStats = paginatedInfluencers.map(inf => {
      const apps = Array.from(this.applications.values()).filter(a => a.influencerId === inf.id);
      return {
        ...inf,
        appliedCount: apps.length,
        acceptedCount: apps.filter(a => ['approved', 'shipped', 'delivered', 'uploaded', 'verified'].includes(a.status)).length,
        completedCount: apps.filter(a => a.status === 'verified').length,
      };
    });
    
    return {
      items: itemsWithStats,
      totalCount,
      page,
      pageSize,
    };
  }

  // Campaign methods
  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(
      c => c.status === 'active' || c.status === 'full'
    );
  }

  async getCampaignsPaginated(options: GetCampaignsOptions): Promise<PaginatedCampaignsResult> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize || 20));
    const search = options.search?.toLowerCase();
    const status = options.status;
    const statuses = options.statuses;

    let items = Array.from(this.campaigns.values());

    // Apply search filter
    if (search) {
      items = items.filter(c => c.name.toLowerCase().includes(search));
    }

    // Apply status filter
    if (status && status !== 'all') {
      items = items.filter(c => c.status === status);
    } else if (statuses) {
      const statusList = statuses.split(',').map(s => s.trim());
      items = items.filter(c => statusList.includes(c.status));
    }

    // Sort by createdAt descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = items.length;
    const offset = (page - 1) * pageSize;
    const paginatedItems = items.slice(offset, offset + pageSize);

    return {
      items: paginatedItems,
      totalCount,
      page,
      pageSize,
    };
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const newCampaign: Campaign = {
      id,
      name: campaign.name,
      brandName: campaign.brandName,
      category: campaign.category,
      rewardType: campaign.rewardType,
      rewardAmount: campaign.rewardAmount ?? null,
      inventory: campaign.inventory,
      approvedCount: 0,
      imageUrl: campaign.imageUrl || null,
      amazonUrl: campaign.amazonUrl || null,
      guidelinesSummary: campaign.guidelinesSummary || null,
      guidelinesUrl: campaign.guidelinesUrl || null,
      requiredHashtags: campaign.requiredHashtags || null,
      requiredMentions: campaign.requiredMentions || null,
      deadline: new Date(campaign.deadline),
      status: campaign.status || 'draft',
      createdByAdminId: campaign.createdByAdminId || null,
      createdAt: new Date(),
    };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    const updated = { ...campaign, ...data };
    
    // Auto-transition to full if approved count >= inventory
    if ((updated.approvedCount ?? 0) >= updated.inventory && updated.status === 'active') {
      updated.status = 'full';
    }
    
    this.campaigns.set(id, updated);
    return updated;
  }

  async incrementCampaignApprovedCount(id: string): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (campaign) {
      campaign.approvedCount = (campaign.approvedCount ?? 0) + 1;
      if (campaign.approvedCount >= campaign.inventory && campaign.status === 'active') {
        campaign.status = 'full';
      }
      this.campaigns.set(id, campaign);
    }
  }

  async decrementCampaignApprovedCount(id: string): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (campaign && (campaign.approvedCount ?? 0) > 0) {
      campaign.approvedCount = (campaign.approvedCount ?? 1) - 1;
      this.campaigns.set(id, campaign);
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    // Get all applications for this campaign
    const campaignApps = Array.from(this.applications.values())
      .filter(app => app.campaignId === id);
    
    // Delete related data for each application
    for (const app of campaignApps) {
      // Delete shipping
      for (const [shippingId, s] of this.shipping) {
        if (s.applicationId === app.id) {
          this.shipping.delete(shippingId);
        }
      }
      // Delete uploads
      for (const [uploadId, u] of this.uploads) {
        if (u.applicationId === app.id) {
          this.uploads.delete(uploadId);
        }
      }
      // Delete shipping issues
      for (const [issueId, issue] of this.shippingIssues) {
        if (issue.applicationId === app.id) {
          this.shippingIssues.delete(issueId);
        }
      }
      // Delete application
      this.applications.delete(app.id);
    }
    
    // Delete notifications for this campaign
    for (const [notifId, notif] of this.notifications) {
      if (notif.campaignId === id) {
        this.notifications.delete(notifId);
      }
    }
    
    // Finally delete the campaign
    this.campaigns.delete(id);
  }

  // Application methods
  async getApplication(id: string): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplicationByInfluencerAndCampaign(influencerId: string, campaignId: string): Promise<Application | undefined> {
    return Array.from(this.applications.values()).find(
      a => a.influencerId === influencerId && a.campaignId === campaignId
    );
  }

  async getApplicationsByInfluencer(influencerId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(a => a.influencerId === influencerId);
  }

  async getApplicationsByCampaign(campaignId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(a => a.campaignId === campaignId);
  }

  async getApplicationsWithDetails(influencerId: string): Promise<ApplicationWithDetails[]> {
    const applications = await this.getApplicationsByInfluencer(influencerId);
    const detailed: ApplicationWithDetails[] = [];
    
    for (const app of applications) {
      const campaign = await this.getCampaign(app.campaignId);
      if (campaign) {
        const shipping = await this.getShippingByApplication(app.id);
        const upload = await this.getUploadByApplication(app.id);
        detailed.push({
          ...app,
          campaign,
          shipping: shipping || undefined,
          upload: upload || undefined,
        });
      }
    }
    
    return detailed;
  }

  async getApplicationsWithDetailsByCampaign(campaignId: string): Promise<ApplicationWithDetails[]> {
    const applications = await this.getApplicationsByCampaign(campaignId);
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return [];
    
    const detailed: ApplicationWithDetails[] = [];
    
    for (const app of applications) {
      const influencer = await this.getInfluencer(app.influencerId);
      const shipping = await this.getShippingByApplication(app.id);
      const upload = await this.getUploadByApplication(app.id);
      detailed.push({
        ...app,
        campaign,
        influencer: influencer || undefined,
        shipping: shipping || undefined,
        upload: upload || undefined,
      });
    }
    
    return detailed;
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const id = randomUUID();
    
    // Check if first time (no previous completed campaigns)
    const previousApps = await this.getApplicationsByInfluencer(application.influencerId);
    const hasCompletedBefore = previousApps.some(a => a.status === 'completed');
    
    const newApplication: Application = {
      id,
      campaignId: application.campaignId,
      influencerId: application.influencerId,
      status: 'pending',
      appliedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      shippedAt: null,
      deliveredAt: null,
      uploadedAt: null,
      deadlineMissedAt: null,
      firstTime: !hasCompletedBefore,
      notesInternal: null,
      createdAt: new Date(),
    };
    this.applications.set(id, newApplication);
    return newApplication;
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application | undefined> {
    const application = this.applications.get(id);
    if (!application) return undefined;
    const updated = { ...application, ...data };
    this.applications.set(id, updated);
    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    this.applications.delete(id);
  }

  // Shipping methods
  async getShippingByApplication(applicationId: string): Promise<Shipping | undefined> {
    return Array.from(this.shipping.values()).find(s => s.applicationId === applicationId);
  }

  async createShipping(shipping: InsertShipping): Promise<Shipping> {
    const id = randomUUID();
    const newShipping: Shipping = {
      id,
      applicationId: shipping.applicationId,
      status: 'pending',
      trackingNumber: shipping.trackingNumber || null,
      courier: shipping.courier || null,
      shippedAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };
    this.shipping.set(id, newShipping);
    return newShipping;
  }

  async updateShipping(id: string, data: Partial<Shipping>): Promise<Shipping | undefined> {
    const shipping = this.shipping.get(id);
    if (!shipping) return undefined;
    const updated = { ...shipping, ...data };
    this.shipping.set(id, updated);
    return updated;
  }

  async updateShippingByApplication(applicationId: string, data: Partial<Shipping>): Promise<Shipping | undefined> {
    const shipping = await this.getShippingByApplication(applicationId);
    if (!shipping) return undefined;
    return this.updateShipping(shipping.id, data);
  }

  // Upload methods
  async getUploadByApplication(applicationId: string): Promise<Upload | undefined> {
    return Array.from(this.uploads.values()).find(u => u.applicationId === applicationId);
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const id = randomUUID();
    const newUpload: Upload = {
      id,
      applicationId: upload.applicationId,
      status: 'not_uploaded',
      tiktokVideoUrl: upload.tiktokVideoUrl || null,
      detectedAt: null,
      verifiedAt: null,
      createdAt: new Date(),
    };
    this.uploads.set(id, newUpload);
    return newUpload;
  }

  async updateUpload(id: string, data: Partial<Upload>): Promise<Upload | undefined> {
    const upload = this.uploads.get(id);
    if (!upload) return undefined;
    const updated = { ...upload, ...data };
    this.uploads.set(id, updated);
    return updated;
  }

  async updateUploadByApplication(applicationId: string, data: Partial<Upload>): Promise<Upload | undefined> {
    const upload = await this.getUploadByApplication(applicationId);
    if (!upload) return undefined;
    return this.updateUpload(upload.id, data);
  }

  // Score Events
  async addScoreEvent(event: InsertScoreEvent): Promise<ScoreEvent> {
    const id = randomUUID();
    const newEvent: ScoreEvent = {
      id,
      influencerId: event.influencerId,
      campaignId: event.campaignId || null,
      applicationId: event.applicationId || null,
      delta: event.delta,
      reason: event.reason,
      createdByAdminId: event.createdByAdminId || null,
      createdAt: new Date(),
    };
    this.scoreEvents.set(id, newEvent);
    
    // Update influencer score
    const influencer = await this.getInfluencer(event.influencerId);
    if (influencer) {
      const newScore = Math.max(0, Math.min(100, (influencer.score ?? 0) + event.delta));
      await this.updateInfluencer(event.influencerId, { score: newScore });
    }
    
    return newEvent;
  }

  async getScoreEventsByInfluencer(influencerId: string): Promise<ScoreEvent[]> {
    return Array.from(this.scoreEvents.values()).filter(e => e.influencerId === influencerId);
  }

  // Penalty Events
  async addPenaltyEvent(event: InsertPenaltyEvent): Promise<PenaltyEvent> {
    const id = randomUUID();
    const newEvent: PenaltyEvent = {
      id,
      influencerId: event.influencerId,
      campaignId: event.campaignId || null,
      applicationId: event.applicationId || null,
      delta: event.delta,
      reason: event.reason,
      createdByAdminId: event.createdByAdminId || null,
      createdAt: new Date(),
    };
    this.penaltyEvents.set(id, newEvent);
    
    // Update influencer penalty
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
    return Array.from(this.penaltyEvents.values()).filter(e => e.influencerId === influencerId);
  }

  // Admin Notes
  async addAdminNote(note: InsertAdminNote): Promise<AdminNote> {
    const id = randomUUID();
    const newNote: AdminNote = {
      id,
      influencerId: note.influencerId,
      campaignId: note.campaignId || null,
      applicationId: note.applicationId || null,
      adminId: note.adminId,
      note: note.note,
      createdAt: new Date(),
    };
    this.adminNotes.set(id, newNote);
    return newNote;
  }

  async getNotesByInfluencer(influencerId: string): Promise<AdminNote[]> {
    return Array.from(this.adminNotes.values()).filter(n => n.influencerId === influencerId);
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      id,
      influencerId: notification.influencerId,
      campaignId: notification.campaignId || null,
      applicationId: notification.applicationId || null,
      type: notification.type,
      channel: notification.channel || 'email',
      status: 'sent',
      errorMessage: null,
      sentAt: new Date(),
      createdAt: new Date(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getNotificationsByInfluencer(influencerId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.influencerId === influencerId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    
    return notifications.slice(offset, offset + limit);
  }

  // Shipping Issues
  async createShippingIssue(issue: InsertShippingIssue): Promise<ShippingIssue> {
    const id = randomUUID();
    const newIssue: ShippingIssue = {
      id,
      applicationId: issue.applicationId,
      influencerId: issue.influencerId,
      campaignId: issue.campaignId,
      message: issue.message,
      status: 'open',
      resolvedByAdminId: null,
      resolvedAt: null,
      adminResponse: null,
      createdAt: new Date(),
    };
    this.shippingIssues.set(id, newIssue);
    return newIssue;
  }

  async getShippingIssuesByApplication(applicationId: string): Promise<ShippingIssue[]> {
    return Array.from(this.shippingIssues.values()).filter(i => i.applicationId === applicationId);
  }

  async getAllOpenShippingIssues(): Promise<ShippingIssueWithDetails[]> {
    const openIssues = Array.from(this.shippingIssues.values()).filter(i => i.status === 'open');
    return Promise.all(openIssues.map(async (issue) => {
      const influencer = await this.getInfluencer(issue.influencerId);
      const campaign = await this.getCampaign(issue.campaignId);
      return { ...issue, influencer, campaign };
    }));
  }

  async updateShippingIssue(id: string, data: Partial<ShippingIssue>): Promise<ShippingIssue | undefined> {
    const issue = this.shippingIssues.get(id);
    if (!issue) return undefined;
    const updated = { ...issue, ...data };
    this.shippingIssues.set(id, updated);
    return updated;
  }

  // Stats
  async getAdminStats(): Promise<{
    activeCampaigns: number;
    pendingApplicants: number;
    shippingPending: number;
    uploadPending: number;
    openIssues: number;
  }> {
    const campaigns = Array.from(this.campaigns.values());
    const applications = Array.from(this.applications.values());
    const issues = Array.from(this.shippingIssues.values());
    
    return {
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      pendingApplicants: applications.filter(a => a.status === 'pending').length,
      shippingPending: applications.filter(a => a.status === 'approved').length,
      uploadPending: applications.filter(a => a.status === 'delivered').length,
      openIssues: issues.filter(i => i.status === 'open').length,
    };
  }

  // Auth helpers
  async verifyInfluencerPassword(id: string, password: string): Promise<boolean> {
    const hash = this.influencerPasswords.get(id);
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  async verifyAdminPassword(id: string, password: string): Promise<boolean> {
    const hash = this.adminPasswords.get(id);
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }
}

import { DatabaseStorage } from "./databaseStorage";

export const storage: IStorage = new DatabaseStorage();
