import type { Influencer } from "@shared/schema";

export function getInfluencerDisplayName(
  influencer: Partial<Influencer> | null | undefined,
  fallback = "Unknown"
): string {
  if (!influencer) return fallback;
  if (influencer.firstName && influencer.lastName) {
    return `${influencer.firstName} ${influencer.lastName}`;
  }
  if (influencer.firstName) return influencer.firstName;
  if (influencer.lastName) return influencer.lastName;
  return influencer.name || fallback;
}
