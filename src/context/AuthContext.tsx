import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { notificationsService } from '../services/notificationsService';
import { dbStore } from '../services/storage';
import { usersService } from '../services/usersService';
import type { UserProfile } from '../types/rentigo';
import { useToast } from './ToastContext';

type ProfilePatch = Partial<
  Pick<
    UserProfile,
    'name' | 'college' | 'phone' | 'photoUrl' | 'language' | 'privacySettings' | 'notificationSettings'
  >
>;

interface AuthContextValue {
  user: UserProfile | null;
  allUsers: UserProfile[];
  loading: boolean;
  signInOpen: boolean;
  pendingReferralCode: string | null;
  openSignIn: (redirectPath?: string) => void;
  closeSignIn: () => void;
  signInWithPreset: (userId: string) => Promise<void>;
  signInCustom: (input: {
    name: string;
    email: string;
    college: string;
    phone: string;
    referralCode?: string;
  }) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [redirectAfter, setRedirectAfter] = useState<string | null>(null);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(() =>
    dbStore.getPendingReferralCode(),
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Capture ?ref=CODE query param from URL on landing or any route
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refParam = params.get('ref');
    if (refParam && refParam.trim()) {
      const normalized = refParam.trim().toUpperCase();
      dbStore.setPendingReferralCode(normalized);
      setPendingReferralCode(normalized);
    }
  }, [location.search]);

  const refreshUsers = useCallback(async () => {
    const [current, list] = await Promise.all([
      usersService.getCurrentUser(),
      usersService.listUsers(),
    ]);
    setUser(current);
    setAllUsers(list);
    if (current) {
      await notificationsService.checkReturnRemindersForUser(current.id);
    }
  }, []);

  useEffect(() => {
    refreshUsers().finally(() => setLoading(false));
  }, [refreshUsers]);

  // Keep user state fresh across tabs and local store mutations
  useEffect(() => {
    const onSync = () => {
      usersService.getCurrentUser().then((current) => setUser(current));
      usersService.listUsers().then((list) => setAllUsers(list));
    };
    window.addEventListener('rentigo-store-updated', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener('rentigo-store-updated', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  const openSignIn = useCallback((redirectPath?: string) => {
    setRedirectAfter(redirectPath ?? null);
    setSignInOpen(true);
  }, []);

  const closeSignIn = useCallback(() => {
    setSignInOpen(false);
    setRedirectAfter(null);
  }, []);

  const finishAuth = useCallback(
    (signedInUser: UserProfile) => {
      setUser(signedInUser);
      setSignInOpen(false);
      setPendingReferralCode(dbStore.getPendingReferralCode());
      showToast(`Signed in as ${signedInUser.name}`, 'success');
      if (redirectAfter) {
        const next = redirectAfter;
        setRedirectAfter(null);
        navigate(next);
      }
    },
    [navigate, redirectAfter, showToast],
  );

  const signInWithPreset = useCallback(
    async (userId: string) => {
      const signed = await usersService.signInWithGooglePreset(userId);
      await refreshUsers();
      finishAuth(signed);
    },
    [finishAuth, refreshUsers],
  );

  const signInCustom = useCallback(
    async (input: {
      name: string;
      email: string;
      college: string;
      phone: string;
      referralCode?: string;
    }) => {
      const signed = await usersService.signInWithGoogleCustom(input);
      await refreshUsers();
      finishAuth(signed);
    },
    [finishAuth, refreshUsers],
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!user) throw new Error('Sign in required.');
      const updated = await usersService.updateProfile(user.id, patch);
      setUser(updated);
      await refreshUsers();
      showToast('Profile updated', 'success');
    },
    [refreshUsers, showToast, user],
  );

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    await usersService.deleteAccount(user.id);
    setUser(null);
    await refreshUsers();
    showToast('Account removed from this device', 'info');
    navigate('/browse');
  }, [navigate, refreshUsers, showToast, user]);

  const signOut = useCallback(async () => {
    await usersService.signOut();
    setUser(null);
    showToast('Signed out', 'info');
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        loading,
        signInOpen,
        pendingReferralCode,
        openSignIn,
        closeSignIn,
        signInWithPreset,
        signInCustom,
        updateProfile,
        deleteAccount,
        signOut,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
