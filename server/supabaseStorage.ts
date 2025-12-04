import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }
    
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

const BUCKET_NAME = 'collaboom-campaign';

export async function ensureBucketExists(): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('[Storage] Could not list buckets (RLS policy), assuming bucket exists');
      return;
    }
    
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`[Storage] Bucket ${BUCKET_NAME} not found in list. Please create it manually in Supabase Dashboard.`);
    }
  } catch (error: any) {
    console.log('[Storage] Bucket check skipped:', error.message);
  }
}

export async function uploadImageToStorage(
  base64Data: string,
  fileName: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image format');
  }
  
  const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, 'base64');
  
  const uniqueFileName = `${fileName}-${Date.now()}.${extension}`;
  const filePath = `campaigns/${uniqueFileName}`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: `image/${matches[1]}`,
      upsert: false,
    });
  
  if (error) {
    console.error('Upload error:', error);
    throw error;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  return publicUrl;
}

export async function uploadMultipleImages(
  base64Images: string[],
  campaignId: string
): Promise<string[]> {
  const urls: string[] = [];
  
  for (let i = 0; i < base64Images.length; i++) {
    const base64 = base64Images[i];
    
    if (!base64 || !base64.startsWith('data:image/')) {
      if (base64 && base64.startsWith('http')) {
        urls.push(base64);
        continue;
      }
      continue;
    }
    
    try {
      const url = await uploadImageToStorage(base64, `${campaignId}-${i}`);
      urls.push(url);
    } catch (error) {
      console.error(`Failed to upload image ${i}:`, error);
      throw error;
    }
  }
  
  return urls;
}

export function isBase64Image(str: string): boolean {
  return str?.startsWith('data:image/');
}

export function isStorageUrl(str: string): boolean {
  return str?.startsWith('http');
}
