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

export function extractFilePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function deleteImagesFromStorage(imageUrls: string[]): Promise<{ deleted: number; errors: string[]; verified: boolean }> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let deleted = 0;
  let verified = false;

  console.log('[Storage Delete] Received URLs:', imageUrls.length, 'files');

  const filePaths: string[] = [];
  
  for (const url of imageUrls) {
    if (!url || !url.includes('supabase.co/storage')) {
      continue;
    }
    
    const filePath = extractFilePathFromUrl(url);
    if (filePath) {
      filePaths.push(filePath);
    }
  }

  console.log('[Storage Delete] File paths to delete:', filePaths);

  if (filePaths.length === 0) {
    console.log('[Storage Delete] No valid file paths found');
    return { deleted: 0, errors: [], verified: true };
  }

  try {
    console.log(`[Storage Delete] Calling remove() on bucket ${BUCKET_NAME} for ${filePaths.length} files`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (error) {
      console.error('[Storage Delete] API error:', error);
      errors.push(error.message);
      return { deleted: 0, errors, verified: false };
    }

    // Verify deletion by checking if files still exist
    const folderName = filePaths[0]?.split('/')[0] || 'campaigns';
    const { data: remainingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderName, { limit: 1000 });

    const remainingSet = new Set(remainingFiles?.map(f => `${folderName}/${f.name}`) || []);
    const stillExists = filePaths.filter(p => remainingSet.has(p));

    if (stillExists.length > 0) {
      const errorMsg = `DELETE blocked by RLS policy - ${stillExists.length} files still exist`;
      console.error('[Storage Delete]', errorMsg);
      errors.push(errorMsg);
      deleted = filePaths.length - stillExists.length;
      verified = false;
    } else {
      deleted = filePaths.length;
      verified = true;
      console.log(`[Storage Delete] Successfully deleted ${deleted} images (verified)`);
    }
  } catch (error: any) {
    console.error('[Storage Delete] Exception:', error);
    errors.push(error.message);
  }

  return { deleted, errors, verified };
}

export async function listAllStorageImages(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('campaigns', { limit: 1000 });

    if (error) {
      console.error('[Storage] List error:', error);
      return [];
    }

    return data?.map(file => `campaigns/${file.name}`) || [];
  } catch (error) {
    console.error('[Storage] List failed:', error);
    return [];
  }
}

// Chat attachment upload
const MAX_CHAT_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/zip',
  'video/mp4', 'video/quicktime',
];

export function validateChatAttachment(
  file: { size: number; mimetype: string; originalname: string }
): { valid: boolean; error?: string } {
  if (file.size > MAX_CHAT_ATTACHMENT_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 10MB.` };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: images, PDF, CSV, Excel, ZIP, MP4.` 
    };
  }
  
  return { valid: true };
}

export async function uploadChatAttachment(
  buffer: Buffer,
  roomId: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
  const filePath = `chat/${roomId}/${uniqueFileName}`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
  
  if (error) {
    console.error('[Chat Upload] Error:', error);
    throw error;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  console.log('[Chat Upload] Uploaded:', filePath);
  return publicUrl;
}
