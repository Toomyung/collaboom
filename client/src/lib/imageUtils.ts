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
 * Type guard to check if campaign has thumbnailUrl (MinimalCampaign)
 */
function hasThumbailUrl(campaign: any): campaign is { thumbnailUrl: string | null } {
  return 'thumbnailUrl' in campaign;
}

/**
 * Gets the best available image URL from a campaign object.
 * Handles both full Campaign (with imageUrls) and MinimalCampaign (with thumbnailUrl).
 * Also fixes corrupted data URIs.
 * 
 * @param campaign - Campaign or MinimalCampaign object
 * @returns The first valid image URL or null
 */
export function getCampaignThumbnail(campaign: {
  thumbnailUrl?: string | null;
  imageUrls?: string[] | null;
  imageUrl?: string | null;
}): string | null {
  // First try thumbnailUrl (from minimal API response)
  if (hasThumbailUrl(campaign) && campaign.thumbnailUrl) {
    return fixImageUrl(campaign.thumbnailUrl);
  }
  
  // Then try imageUrls array
  if (campaign.imageUrls && campaign.imageUrls.length > 0) {
    const firstImage = campaign.imageUrls[0];
    return fixImageUrl(firstImage);
  }
  
  // Fall back to legacy imageUrl
  if (campaign.imageUrl) {
    return fixImageUrl(campaign.imageUrl);
  }
  
  return null;
}
