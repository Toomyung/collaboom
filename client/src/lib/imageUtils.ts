/**
 * Fixes corrupted data URIs that are missing the "data:" prefix.
 * This can happen when security sanitization incorrectly strips the prefix.
 * 
 * @param url - The image URL or data URI
 * @returns The fixed URL with proper data: prefix if needed
 */
export function fixImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Check if it's a corrupted data URI (missing "data:" prefix)
  // Pattern: starts with image type like "image/png;base64," or "image/jpeg;base64,"
  if (/^image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i.test(url)) {
    return `data:${url}`;
  }
  
  return url;
}

/**
 * Gets the best available image URL from a campaign's image fields.
 * Handles both the new imageUrls array and legacy imageUrl field.
 * Also fixes corrupted data URIs.
 * 
 * @param imageUrls - Array of image URLs (preferred)
 * @param imageUrl - Legacy single image URL (fallback)
 * @returns The first valid image URL or null
 */
export function getCampaignThumbnail(
  imageUrls: string[] | null | undefined,
  imageUrl: string | null | undefined
): string | null {
  // First try imageUrls array
  if (imageUrls && imageUrls.length > 0) {
    const firstImage = imageUrls[0];
    return fixImageUrl(firstImage);
  }
  
  // Fall back to legacy imageUrl
  if (imageUrl) {
    return fixImageUrl(imageUrl);
  }
  
  return null;
}
