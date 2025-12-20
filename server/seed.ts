import { db, warmupDatabase, startKeepAlive } from './db';
import { admins, campaigns } from '../shared/schema';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowProdSeed = process.env.ALLOW_PROD_SEED === 'true';
  
  if (isProduction && !allowProdSeed) {
    console.log('[Seed] Skipping seeding in production (set ALLOW_PROD_SEED=true to override)');
    await warmupDatabase();
    startKeepAlive();
    return;
  }
  
  try {
    // Warm up database connection first
    await warmupDatabase();
    
    // Start keep-alive ping to prevent cold starts
    startKeepAlive();
    
    const [existingAdmin] = await db.select().from(admins).where(eq(admins.email, 'admin@collaboom.com'));
    
    if (!existingAdmin) {
      console.log('Seeding admin user...');
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await db.insert(admins).values({
        email: 'admin@collaboom.com',
        password: passwordHash,
        name: 'Admin User',
        role: 'admin',
      });
      console.log('Admin user created');
    }

    const existingCampaigns = await db.select().from(campaigns).limit(1);
    
    if (existingCampaigns.length === 0) {
      console.log('Seeding campaigns...');
      
      const campaignData = [
        {
          name: 'Hydrating Serum Collection',
          brandName: 'GlowLab Korea',
          category: 'beauty',
          campaignType: 'gifting',
          inventory: 50,
          approvedCount: 23,
          imageUrl: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=400&fit=crop',
          amazonUrl: 'https://amazon.com/dp/example1',
          guidelinesSummary: 'Create a 30-60 second TikTok showing your skincare routine featuring our hydrating serum. Show before/after application.',
          guidelinesUrl: 'https://notion.so/glowlab/guidelines',
          requiredHashtags: ['#GlowLabPartner', '#HydratingSerum', '#KBeauty'],
          requiredMentions: ['@glowlabkorea'],
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'active',
        },
        {
          name: 'Organic Snack Box',
          brandName: 'NatureBite',
          category: 'food',
          campaignType: 'gifting',
          inventory: 100,
          approvedCount: 67,
          imageUrl: 'https://images.unsplash.com/photo-1604908177522-27d7bbafebef?w=600&h=400&fit=crop',
          amazonUrl: 'https://amazon.com/dp/example2',
          guidelinesSummary: 'Share your honest taste test reaction! Create engaging content showing you trying our organic snacks.',
          guidelinesUrl: null,
          requiredHashtags: ['#NatureBite', '#OrganicSnacks'],
          requiredMentions: ['@naturebite'],
          deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          status: 'active',
        },
        {
          name: 'Cozy Home Candle Set',
          brandName: 'CozyLife Home',
          category: 'lifestyle',
          campaignType: 'link_in_bio',
          inventory: 30,
          approvedCount: 28,
          imageUrl: 'https://images.unsplash.com/photo-1602607403925-3d0b3c3b3b3d?w=600&h=400&fit=crop',
          amazonUrl: 'https://amazon.com/dp/example3',
          guidelinesSummary: 'Create aesthetic content featuring our candle set in your home. Focus on the cozy atmosphere.',
          guidelinesUrl: 'https://notion.so/cozylife/guidelines',
          requiredHashtags: ['#CozyLifeHome', '#HomeDecor', '#CandleLover'],
          requiredMentions: ['@cozylifehome'],
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'full',
        },
        {
          name: 'Vitamin C Brightening Kit',
          brandName: 'SkinGlow',
          category: 'beauty',
          campaignType: 'amazon_video_upload',
          inventory: 40,
          approvedCount: 15,
          imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=400&fit=crop',
          amazonUrl: null,
          guidelinesSummary: 'Show your morning skincare routine with our Vitamin C kit. Highlight the glow!',
          guidelinesUrl: null,
          requiredHashtags: ['#SkinGlow', '#VitaminC'],
          requiredMentions: ['@skinglow'],
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
        },
      ];

      for (const campaign of campaignData) {
        await db.insert(campaigns).values(campaign);
      }
      console.log('Campaigns created');
    }

    console.log('Database seeding complete');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}
