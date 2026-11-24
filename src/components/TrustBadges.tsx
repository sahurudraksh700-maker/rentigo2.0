import { Award, BadgeCheck, Zap } from 'lucide-react';
import type { UserProfile } from '../types/rentigo';
import { getUserTrustBadges, type TrustBadgeId } from '../utils/badges';

interface TrustBadgesProps {
  user?: UserProfile | null;
  compact?: boolean;
  max?: number;
}

const BADGE_STYLE: Record<TrustBadgeId, { cls: string; Icon: typeof BadgeCheck }> = {
  verified: {
    cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    Icon: BadgeCheck,
  },
  top_lender: {
    cls: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    Icon: Award,
  },
  quick_responder: {
    cls: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    Icon: Zap,
  },
};

export function TrustBadges({ user, compact = false, max = 3 }: TrustBadgesProps) {
  const badges = getUserTrustBadges(user).slice(0, max);
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => {
        const { cls, Icon } = BADGE_STYLE[badge.id];
        return (
          <span
            key={badge.id}
            title={badge.description}
            className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${
              compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
            }`}
          >
            <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            <span>{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}
