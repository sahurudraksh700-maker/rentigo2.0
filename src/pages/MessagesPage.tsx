import {
  AlertTriangle,
  Ban,
  Check,
  CheckCheck,
  Flag,
  ImagePlus,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ReportModal } from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { chatService, QUICK_REPLY_CHIPS } from '../services/chatService';
import { listingsService } from '../services/listingsService';
import { moderationService } from '../services/moderationService';
import { usersService } from '../services/usersService';
import type { ChatMessage, Conversation, Listing, UserProfile } from '../types/rentigo';
import { formatPublicUserName } from '../utils/badges';
import { formatRelativeTime } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

export function MessagesPage() {
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageMeta({ title: 'Messages — Rentigo' });

  const requestedConvId = searchParams.get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listingsMap, setListingsMap] = useState<Record<string, Listing>>({});
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(requestedConvId);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: 'user' | 'message';
    id: string;
    targetUserId: string;
    title: string;
  } | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const syncData = useCallback(
    async (silent = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const [convs, allListings, allUsers] = await Promise.all([
          chatService.listForUser(user.id),
          listingsService.listAllIncludingHidden(),
          usersService.listUsers(),
        ]);
        const lMap: Record<string, Listing> = {};
        for (const l of allListings) lMap[l.id] = l;
        const uMap: Record<string, UserProfile> = {};
        for (const u of allUsers) uMap[u.id] = u;

        setListingsMap(lMap);
        setUsersMap(uMap);
        setConversations(convs);

        const targetId =
          activeConvId && convs.some((c) => c.id === activeConvId)
            ? activeConvId
            : requestedConvId && convs.some((c) => c.id === requestedConvId)
              ? requestedConvId
              : convs[0]?.id ?? null;

        if (targetId && targetId !== activeConvId) {
          setActiveConvId(targetId);
        }

        if (targetId) {
          await chatService.markConversationRead(targetId, user.id);
          const msgs = await chatService.listMessages(targetId);
          setMessages(msgs);
        } else {
          setMessages([]);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeConvId, requestedConvId, user],
  );

  useEffect(() => {
    syncData(false);
  }, [syncData]);

  // Real-time sync across tabs & 1s polling
  useEffect(() => {
    if (!user) return;
    const onSync = () => {
      syncData(true);
    };
    window.addEventListener('rentigo-store-updated', onSync);
    window.addEventListener('storage', onSync);
    const interval = window.setInterval(() => syncData(true), 1200);
    return () => {
      window.removeEventListener('rentigo-store-updated', onSync);
      window.removeEventListener('storage', onSync);
      window.clearInterval(interval);
    };
  }, [syncData, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [activeConvId, conversations],
  );

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8 text-center">
          <MessageSquare className="w-8 h-8 text-[#e63f24] mx-auto mb-3" />
          <h1 className="text-2xl font-normal text-slate-950 dark:text-white">
            Campus Messages
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in with Google to chat with item owners and coordinate campus pickups safely.
          </p>
          <button
            type="button"
            onClick={() => openSignIn('/messages')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const otherUserId = activeConv
    ? activeConv.participantIds.find((id) => id !== user.id) ?? ''
    : '';
  const otherUser = otherUserId ? usersMap[otherUserId] : undefined;
  const activeListing = activeConv ? listingsMap[activeConv.listingId] : undefined;
  const isBlockedPair = activeConv
    ? moderationService.isBlockedPairSync(user.id, otherUserId)
    : false;
  const iBlockedThem = activeConv
    ? moderationService.didUserBlockSync(user.id, otherUserId)
    : false;

  const isBookingAccepted = activeConv
    ? chatService.hasAcceptedBookingBetweenSync(
        activeConv.listingId,
        activeConv.renterId,
        activeConv.ownerId,
      )
    : false;

  const otherTypingIso = activeConv?.typingByUser?.[otherUserId];
  const isOtherTyping =
    Boolean(otherTypingIso) &&
    Date.now() - new Date(otherTypingIso!).getTime() < 5500;

  const selectConversation = (convId: string) => {
    setActiveConvId(convId);
    setSafetyWarning(null);
    const next = new URLSearchParams(searchParams);
    next.set('conv', convId);
    setSearchParams(next, { replace: true });
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (!activeConvId) return;
    chatService.setTyping(activeConvId, user.id, val.trim().length > 0);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      chatService.setTyping(activeConvId, user.id, false);
    }, 3000);
  };

  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendTextOrChip = async (textToSend: string, img?: string) => {
    if (!activeConv) return;
    try {
      const { warning } = await chatService.sendMessage({
        conversationId: activeConv.id,
        senderId: user.id,
        text: textToSend,
        imageUrl: img,
      });
      setSafetyWarning(warning ?? null);
      setDraft('');
      setImagePreview(null);
      await syncData(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send message', 'error');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendTextOrChip(draft, imagePreview ?? undefined);
  };

  const handleToggleBlock = async () => {
    if (!otherUserId) return;
    if (iBlockedThem) {
      await moderationService.unblockUser(user.id, otherUserId);
      showToast(`Unblocked ${otherUser?.firstName ?? 'user'}`, 'info');
    } else {
      await moderationService.blockUser(user.id, otherUserId);
      showToast(`Blocked ${otherUser?.firstName ?? 'user'}`, 'info');
    }
    await syncData(true);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-normal tracking-tight text-slate-950 dark:text-white">
          Messages
        </h1>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Real-time campus inbox
        </span>
      </div>

      {loading ? (
        <div className="h-[540px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] animate-pulse" />
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-12 text-center max-w-lg mx-auto">
          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-medium">No conversations yet</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tap &ldquo;Message owner&rdquo; on any item page to ask about availability or campus meetup spots.
          </p>
          <Link
            to="/browse"
            className="mt-6 inline-flex px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Browse Rentals
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] overflow-hidden min-h-[560px]">
          {/* Inbox Sidebar */}
          <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 max-h-[260px] lg:max-h-[640px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {conversations.map((conv) => {
              const otherId = conv.participantIds.find((id) => id !== user.id) ?? '';
              const peer = usersMap[otherId];
              const item = listingsMap[conv.listingId];
              const unread = conv.unreadCountByUser?.[user.id] ?? 0;
              const isActive = conv.id === activeConv?.id;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                    isActive
                      ? 'bg-[#e63f24]/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  {item?.photos[0] ? (
                    <img
                      src={item.photos[0]}
                      alt={item.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-900"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {formatPublicUserName(peer, user.id)}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="text-xs text-[#e63f24] truncate">
                      {item?.title ?? 'Campus Listing'}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.lastMessageText || 'Start a conversation'}
                      </span>
                      {unread > 0 && (
                        <span className="min-w-[18px] h-[18px] rounded-full bg-[#e63f24] text-white text-[10px] font-semibold flex items-center justify-center px-1 shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Active Thread */}
          <section className="lg:col-span-8 flex flex-col h-[540px] lg:h-[640px]">
            {activeConv ? (
              <>
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/u/${otherUserId}`}
                        className="text-sm font-semibold hover:text-[#e63f24] truncate"
                      >
                        {formatPublicUserName(otherUser, user.id)}
                      </Link>
                      {otherUser && (
                        <span className="text-xs text-slate-400 truncate">
                          · {otherUser.college}
                        </span>
                      )}
                    </div>
                    {activeListing && (
                      <Link
                        to={`/listing/${activeListing.id}`}
                        className="text-xs text-[#e63f24] hover:underline truncate block"
                      >
                        {activeListing.title} (₹{activeListing.pricePerDay}/day)
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setReportTarget({
                          type: 'user',
                          id: otherUserId,
                          targetUserId: otherUserId,
                          title: otherUser?.name ?? 'User',
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24]"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                        iBlockedThem
                          ? 'border-emerald-500/40 text-emerald-600'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24]'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{iBlockedThem ? 'Unblock' : 'Block'}</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Unlock / Safety Banner */}
                {isBookingAccepted && otherUser ? (
                  <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Booking accepted! Campus WhatsApp unlocked:{' '}
                      <strong className="tabular-nums">{otherUser.phone}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="px-5 py-2 bg-slate-50 dark:bg-[#070a12] border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#e63f24] shrink-0" />
                    <span>
                      Keep chat on Rentigo. Phone numbers stay hidden until a booking is Accepted.
                    </span>
                  </div>
                )}

                {safetyWarning && (
                  <div className="mx-5 mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{safetyWarning}</span>
                  </div>
                )}

                {/* Messages Scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm space-y-2 ${
                            isMine
                              ? 'bg-[#e63f24] text-white'
                              : 'bg-slate-100 dark:bg-[#11182b] text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Chat attachment"
                              className="rounded-xl max-h-52 object-cover"
                            />
                          )}
                          {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                          <span>{formatRelativeTime(msg.createdAt)}</span>
                          {isMine &&
                            (msg.readAt ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-500">
                                <CheckCheck className="w-3 h-3" />
                                Read
                              </span>
                            ) : (
                              <Check className="w-3 h-3" />
                            ))}
                        </div>
                      </div>
                    );
                  })}

                  {isOtherTyping && (
                    <div className="text-xs italic text-slate-400 px-1">
                      {otherUser?.firstName ?? 'Classmate'} is typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Chips */}
                {!isBlockedPair && (
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap gap-1.5">
                    {QUICK_REPLY_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => sendTextOrChip(chip)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {imagePreview && (
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Attachment preview"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <span className="text-xs text-slate-500">Ready to send image</span>
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="ml-auto text-xs text-[#e63f24]"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Input Bar */}
                {isBlockedPair ? (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    Messaging is disabled while a block is active between participants.
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
                  >
                    <label
                      title="Attach photo"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#e63f24] cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImagePick}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => handleDraftChange(e.target.value)}
                      placeholder="Write a message to your classmate..."
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() && !imagePreview}
                      aria-label="Send message"
                      className="p-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                Select a conversation
              </div>
            )}
          </section>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetUserId={reportTarget.targetUserId}
          listingTitle={reportTarget.title}
          onClose={() => setReportTarget(null)}
        />
      )}
    </main>
  );
}
