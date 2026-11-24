import { Compass, Heart, LayoutDashboard, Megaphone, MessageSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCounts } from '../hooks/useRealtimeCounts';

export function MobileBottomNav() {
  const { user } = useAuth();
  const { unreadMessages } = useRealtimeCounts(user?.id);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
      isActive ? 'text-[#e63f24]' : 'text-slate-500 dark:text-slate-400'
    }`;

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#060810]/95 backdrop-blur-md grid grid-cols-5 px-1"
    >
      <NavLink to="/browse" className={linkCls}>
        <Compass className="w-4 h-4" />
        <span>Browse</span>
      </NavLink>
      <NavLink to="/wanted" className={linkCls}>
        <Megaphone className="w-4 h-4" />
        <span>Wanted</span>
      </NavLink>
      <NavLink to="/wishlist" className={linkCls}>
        <Heart className="w-4 h-4" />
        <span>Saved</span>
      </NavLink>
      <NavLink to="/messages" className={linkCls}>
        <div className="relative">
          <MessageSquare className="w-4 h-4" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-[#e63f24] text-white text-[9px] flex items-center justify-center px-0.5">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </div>
        <span>Chat</span>
      </NavLink>
      <NavLink to="/dashboard" className={linkCls}>
        <LayoutDashboard className="w-4 h-4" />
        <span>Dashboard</span>
      </NavLink>
    </nav>
  );
}
