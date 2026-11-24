import type { UserProfile } from '../types/rentigo';

export type TrustBadgeId = 'verified' | 'top_lender' | 'quick_responder';

export interface TrustBadge {
  id: TrustBadgeId;
  label: string;
  description: string;
}

export function getUserTrustBadges(user?: UserProfile | null): TrustBadge[] {
  if (!user) return [];
  const badges: TrustBadge[] = [];

  if (user.isVerified) {
    badges.push({
      id: 'verified',
      label: 'Verified student',
      description: 'Confirmed college email (.edu / .ac.in) or campus ID.',
    });
  }

  if (user.rating >= 4.5 && user.completedRentalsCount >= 5) {
    badges.push({
      id: 'top_lender',
      label: 'Top lender',
      description: 'Maintains a 4.5+ rating across 5 or more completed rentals.',
    });
  }

  if (user.avgResponseMinutes <= 30) {
    badges.push({
      id: 'quick_responder',
      label: 'Quick responder',
      description: 'Typically replies to classmates in under 30 minutes.',
    });
  }

  return badges;
}

export function formatPublicUserName(user?: UserProfile | null, viewerId?: string | null): string {
  if (!user) return 'Student';
  if (viewerId && viewerId === user.id) return user.name;
  if (!user.privacySettings?.hideLastName) return user.name;

  const parts = user.name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || user.firstName;
  const lastInitial = parts[parts.length - 1]?.charAt(0).toUpperCase();
  return `${parts[0]} ${lastInitial ? `${lastInitial}.` : ''}`.trim();
}

export function extractCampusName(collegeString: string): string {
  if (!collegeString) return 'Campus';
  const [campus] = collegeString.split('·').map((s) => s.trim());
  return campus || collegeString.trim();
}
