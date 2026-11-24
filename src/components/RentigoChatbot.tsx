import { LifeBuoy, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { faqService, type ChatbotResponse } from '../services/faqService';
import { moderationService } from '../services/moderationService';

interface BotMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  response?: ChatbotResponse;
}

const QUICK_ACTIONS = [
  'Find a camera',
  'Track my request',
  'Report a problem',
] as const;

export function RentigoChatbot({ visible = true }: { visible?: boolean }) {
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hi! I am the Rentigo campus assistant. Ask about deposits, verification, referrals, or tap a quick action below.',
    },
  ]);
  const [ticketMode, setTicketMode] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const askBot = async (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    const userMsg: BotMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: clean,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const res = await faqService.chatbotAnswer(clean, user);
      const botMsg: BotMessage = {
        id: `b_${Date.now() + 1}`,
        sender: 'bot',
        text: res.reply,
        response: res,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await askBot(input);
  };

  const handleTicketSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      openSignIn();
      return;
    }
    if (!ticketSubject.trim() || !ticketBody.trim()) return;
    setBusy(true);
    try {
      const created = await moderationService.createSupportTicket({
        userId: user.id,
        type: 'support',
        subject: ticketSubject,
        description: ticketBody,
      });
      setTicketMode(false);
      setTicketSubject('');
      setTicketBody('');
      setMessages((prev) => [
        ...prev,
        {
          id: `b_tkt_${Date.now()}`,
          sender: 'bot',
          text: `Support ticket #${created.id} created! Our campus team will review it in /admin.`,
        },
      ]);
      showToast('Support ticket sent to campus team', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit ticket', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40">
      {open ? (
        <div
          role="dialog"
          aria-label="Rentigo campus assistant"
          className="w-[calc(100vw-2rem)] sm:w-96 max-h-[78vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-[#e63f24] text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <div>
                <div className="text-sm font-medium leading-tight">Rentigo Help</div>
                <div className="text-[11px] text-white/80">Campus FAQ & Support</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="p-1 rounded-lg hover:bg-black/15"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#e63f24] text-white'
                      : 'bg-slate-100 dark:bg-[#11182b] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <p>{m.text}</p>

                  {m.response?.matchedListings && m.response.matchedListings.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.response.matchedListings.map((item) => (
                        <Link
                          key={item.id}
                          to={`/listing/${item.id}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070a12] px-2.5 py-1.5 hover:border-[#e63f24]"
                        >
                          <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            ₹{item.pricePerDay}/day · {item.college}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.response?.requestSummaries && m.response.requestSummaries.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.response.requestSummaries.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070a12] px-2.5 py-1.5"
                        >
                          <div className="font-medium line-clamp-1">{req.listingTitle}</div>
                          <div className="text-[11px] text-slate-500">
                            Status: <span className="font-semibold text-[#e63f24]">{req.status}</span> ·{' '}
                            {req.startDate} → {req.endDate}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.response?.actionLink && (
                    <Link
                      to={m.response.actionLink.to}
                      onClick={() => setOpen(false)}
                      className="inline-block mt-2 text-[11px] font-semibold text-[#e63f24] hover:underline"
                    >
                      {m.response.actionLink.label} →
                    </Link>
                  )}

                  {m.response?.showSupportEscalation && (
                    <button
                      type="button"
                      onClick={() => setTicketMode(true)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#e63f24] text-white px-2.5 py-1.5 text-[11px] font-medium"
                    >
                      <LifeBuoy className="w-3 h-3" />
                      <span>Talk to support</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {ticketMode && (
              <form
                onSubmit={handleTicketSubmit}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-3 space-y-2"
              >
                <div className="text-xs font-medium">Create support ticket</div>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Short subject (e.g. Deposit question)"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] px-2.5 py-1.5 text-xs outline-none focus:border-[#e63f24]"
                  required
                />
                <textarea
                  rows={2}
                  value={ticketBody}
                  onChange={(e) => setTicketBody(e.target.value)}
                  placeholder="Describe what happened..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] px-2.5 py-1.5 text-xs outline-none focus:border-[#e63f24]"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTicketMode(false)}
                    className="px-2.5 py-1 text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-3 py-1 rounded-lg bg-[#e63f24] text-white text-xs font-medium"
                  >
                    Send ticket
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => askBot(action)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24]"
              >
                {action}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTicketMode(true)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24]"
            >
              Talk to support
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about deposits, late fees, verification..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-xs outline-none focus:border-[#e63f24]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message to assistant"
              className="p-2 rounded-xl bg-[#e63f24] text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Rentigo Help Assistant"
          className="flex items-center gap-2 rounded-full bg-[#e63f24] hover:bg-[#cc3118] text-white px-4 py-3 text-sm font-medium shadow-xl transition-transform hover:scale-105"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Help</span>
        </button>
      )}
    </div>
  );
}
