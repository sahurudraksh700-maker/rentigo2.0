import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { notificationsService } from '../services/notificationsService';
import { dbStore } from '../services/storage';

export interface RealtimeCounts {
  unreadMessages: number;
  unreadNotifications: number;
  wishlistCount: number;
  refreshCounts: () => void;
}

export function useRealtimeCounts(userId?: string | null): RealtimeCounts {
  const compute = useCallback(() => {
    if (!userId) {
      return { unreadMessages: 0, unreadNotifications: 0, wishlistCount: 0 };
    }
    return {
      unreadMessages: chatService.getTotalUnreadCountSync(userId),
      unreadNotifications: notificationsService.getUnreadCountSync(userId),
      wishlistCount: dbStore.getWishlists().filter((w) => w.userId === userId).length,
    };
  }, [userId]);

  const [counts, setCounts] = useState(compute);

  const refreshCounts = useCallback(() => {
    setCounts(compute());
  }, [compute]);

  useEffect(() => {
    refreshCounts();
    const handleEvent = () => refreshCounts();
    window.addEventListener('rentigo-store-updated', handleEvent);
    window.addEventListener('storage', handleEvent);

    const timer = userId ? window.setInterval(refreshCounts, 1200) : undefined;
    return () => {
      window.removeEventListener('rentigo-store-updated', handleEvent);
      window.removeEventListener('storage', handleEvent);
      if (timer) window.clearInterval(timer);
    };
  }, [refreshCounts, userId]);

  return {
    ...counts,
    refreshCounts,
  };
}
