import { useEffect, useRef, useState } from 'react';
import {
  Bell, X, FileText, Clock, AlertTriangle, CheckCircle,
  User, Building2, Phone, Mail, ArrowRight, Calendar,
} from 'lucide-react';
import { getLetters, getStatusesForLetter } from '../lib/api';
import { Letter, LetterStatus } from '../types';

// ── Types ────────────────────────────────────────────────

type Urgency = 'overdue' | 'pending' | 'new' | 'completed';

interface Notification {
  id: string;
  letter: Letter;
  pendingStatuses: string[];
  completedStatuses: LetterStatus[];
  urgency: Urgency;
  daysSinceCreated: number;
}

// email-sent notification type
interface EmailNotification {
  id: string; // letter.id + '_email'
  letter: Letter;
  sentAt: string;
}

// ── Helpers ──────────────────────────────────────────────

const STALE_DAYS = 3;
const STORAGE_KEY = 'dts_dismissed_notifications';
const VIEWED_KEY = 'dts_viewed_notifications';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function getViewed(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveViewed(ids: Set<string>) {
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...ids]));
}

// SQLite returns "YYYY-MM-DD HH:MM:SS" without timezone — treat as UTC by appending Z
function parseUTC(dateStr: string): Date {
  return new Date(dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - parseUTC(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string): string {
  return parseUTC(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, pending: 1, new: 2, completed: 3 };
const URGENCY_LABEL: Record<Urgency, string> = { overdue: 'Overdue', pending: 'Pending', new: 'New', completed: 'Completed' };
const URGENCY_COLORS: Record<Urgency, { bg: string; text: string; icon: string; border: string }> = {
  overdue:   { bg: 'rgba(239,68,68,0.12)',    text: '#fca5a5', icon: '#f87171', border: 'rgba(239,68,68,0.25)' },
  pending:   { bg: 'rgba(251,191,36,0.12)',   text: '#fcd34d', icon: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  new:       { bg: 'rgba(var(--accent-rgb),0.15)',  text: 'var(--accent-text)', icon: 'var(--accent)', border: 'rgba(var(--accent-rgb),0.3)' },
  completed: { bg: 'rgba(16,185,129,0.12)',   text: '#6ee7b7', icon: '#34d399', border: 'rgba(16,185,129,0.25)' },
};

// ── Detail Modal ─────────────────────────────────────────

function NotificationDetail({
  notification,
  onClose,
  onNavigate,
  onDismiss,
}: {
  notification: Notification;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const { letter, completedStatuses, urgency } = notification;
  const colors = URGENCY_COLORS[urgency];

  const _normalizeStatus: Record<string, string> = { 'for approval': 'approved', 'for review': 'reviewed' };
  const required = [...new Set(
    (letter.required_statuses || 'noted,approved,reviewed')
      .split(',').map((s) => _normalizeStatus[s.trim()] ?? s.trim()).filter(Boolean)
  )];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(var(--accent-rgb),0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#003d1f' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: colors.bg }}>
              {urgency === 'overdue'   && <AlertTriangle className="w-4 h-4" style={{ color: colors.icon }} />}
              {urgency === 'pending'   && <Clock className="w-4 h-4" style={{ color: colors.icon }} />}
              {urgency === 'new'       && <FileText className="w-4 h-4" style={{ color: colors.icon }} />}
              {urgency === 'completed' && <CheckCircle className="w-4 h-4" style={{ color: colors.icon }} />}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{letter.reference_number}</p>
              <p className="text-xs" style={{ color: 'var(--accent)' }}>
                {URGENCY_LABEL[urgency]} · {timeAgo(letter.created_at)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {/* Urgency banner */}
          <div className="mx-5 mt-4 rounded-lg px-3 py-2 flex items-center gap-2" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
            {urgency === 'overdue'   && <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            {urgency === 'pending'   && <Clock className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            {urgency === 'new'       && <FileText className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            {urgency === 'completed' && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            <p className="text-xs font-medium" style={{ color: colors.text }}>
              {urgency === 'overdue'   && `This document has been waiting for ${notification.daysSinceCreated} days with no completion.`}
              {urgency === 'pending'   && 'This document has partial signatures and is still awaiting completion.'}
              {urgency === 'new'       && 'This document was recently created and is awaiting action.'}
              {urgency === 'completed' && 'All required actions for this document have been completed.'}
            </p>
          </div>

          {/* Document info */}
          <div className="px-5 pt-4 pb-2 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>Document</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>{letter.title}</p>
              {letter.document_subject && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>{letter.document_subject}</p>
              )}
              {letter.document_type && (
                <span className="inline-block mt-1 text-xs rounded-full px-2 py-0.5 font-medium capitalize" style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                  {letter.document_type}
                </span>
              )}
            </div>

            {letter.description && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>Description</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>{letter.description}</p>
              </div>
            )}

            {/* Sender info */}
            {(letter.sender_name || letter.sender_office) && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>Sender</p>
                <div className="space-y-1.5">
                  {letter.sender_name && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {letter.sender_name}
                    </div>
                  )}
                  {letter.sender_office && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {letter.sender_office}
                    </div>
                  )}
                  {letter.sender_phone && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {letter.sender_phone}
                    </div>
                  )}
                  {letter.sender_email && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {letter.sender_email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }} />
              Created {formatDate(letter.created_at)}
            </div>
          </div>

          {/* Status progress */}
          <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.12)' }}>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>Signature Progress</p>
            <div className="space-y-2">
              {required.filter((s) => s !== 'noted').map((status) => {
                // Normalize: 'for approval' → 'approved', 'for review' → 'reviewed'
                const normalize: Record<string, string> = {
                  'for approval': 'approved',
                  'for review': 'reviewed',
                };
                const key = normalize[status] ?? status;

                // All DB variants that count as "done" for this status
                const allVariants = ['approved', 'for approval', 'reviewed', 'for review'];
                const variants = key === 'approved'
                  ? ['approved', 'for approval']
                  : key === 'reviewed'
                    ? ['reviewed', 'for review']
                    : [key];

                const done = completedStatuses.some((c) => variants.includes(c.status_type));
                const completedEntry = completedStatuses.find((c) => variants.includes(c.status_type));

                // Label mapping — pending vs done
                const pendingLabel: Record<string, string> = {
                  approved: 'For Approval',
                  reviewed: 'For Review',
                };
                const doneLabel: Record<string, string> = {
                  approved: 'Approved',
                  reviewed: 'Reviewed',
                };
                const label = done
                  ? (doneLabel[key] ?? key.charAt(0).toUpperCase() + key.slice(1))
                  : (pendingLabel[key] ?? key.charAt(0).toUpperCase() + key.slice(1));

                // Signer hint
                const signerHint: Record<string, string> = {
                  approved: 'Sir Ronald',
                  reviewed: 'Linmark G. Benlot / Maam Floramae',
                };
                const hint = signerHint[key];
                void allVariants; // suppress unused warning

                return (
                  <div key={status} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: done ? '#16a34a' : '#DC2626' }}
                    >
                      {done
                        ? <CheckCircle className="w-5 h-5 text-white" />
                        : <span className="w-2 h-2 rounded-full bg-white opacity-80" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: 'rgba(var(--accent-text-rgb),0.85)' }}>{label}</span>
                        {done
                          ? <span className="text-xs font-medium" style={{ color: '#6ee7b7' }}>{doneLabel[status] ?? 'Completed'}</span>
                          : <span className="text-xs font-medium" style={{ color: '#fca5a5' }}>Pending</span>
                        }
                      </div>
                      {!done && hint && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Awaiting: {hint}</p>
                      )}
                      {done && completedEntry && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>
                          by {completedEntry.signed_by} · {timeAgo(completedEntry.signed_at)}
                        </p>
                      )}
                      {done && completedEntry?.notes && (
                        <p className="text-xs mt-0.5 italic" style={{ color: 'rgba(var(--accent-text-rgb),0.5)' }}>"{completedEntry.notes}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            {(() => {
              const normalize: Record<string, string> = { 'for approval': 'approved', 'for review': 'reviewed' };
              const filteredRequired = required
                .filter((s) => s !== 'noted')
                .map((s) => normalize[s] ?? s)
                .filter((s, i, arr) => arr.indexOf(s) === i); // dedupe
              const getVariants = (k: string) =>
                k === 'approved' ? ['approved', 'for approval'] :
                k === 'reviewed' ? ['reviewed', 'for review'] : [k];
              const filteredCompleted = filteredRequired.filter((k) =>
                completedStatuses.some((c) => getVariants(k).includes(c.status_type))
              );
              const pct = filteredRequired.length > 0
                ? Math.round((filteredCompleted.length / filteredRequired.length) * 100)
                : 100;
              return (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>
                    <span>{filteredCompleted.length} of {filteredRequired.length} completed</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.12)' }}>
          <button
            onClick={() => { onDismiss(notification.id); onClose(); }}
            className="flex-1 text-sm py-2 rounded-xl font-medium transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.7)' }}
          >
            Mark as Read
          </button>
          <button
            onClick={() => { onNavigate(notification.id); onClose(); }}
            className="flex-1 text-sm py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
          >
            View Document
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

interface Props {
  onNavigate: (letterId: string) => void;
}

export default function NotificationBell({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Notification[]>([]);
  const [emailNotifs, setEmailNotifs] = useState<EmailNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [viewed, setViewed] = useState<Set<string>>(getViewed);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const visible = all.filter((n) => !dismissed.has(n.id));
  const visibleEmails = emailNotifs.filter((n) => !dismissed.has(n.id));
  const totalVisible = visible.length + visibleEmails.length;

  const grouped = (['overdue', 'pending', 'new', 'completed'] as Urgency[])
    .map((u) => ({ urgency: u, items: visible.filter((n) => n.urgency === u) }))
    .filter((g) => g.items.length > 0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const letters = await getLetters();
      const results: Notification[] = [];
      const emailResults: EmailNotification[] = [];

      await Promise.all(
        letters.map(async (letter) => {
          const statuses = await getStatusesForLetter(letter.id);

          if (letter.email_sent_at) {
            emailResults.push({
              id: `${letter.id}_email`,
              letter,
              sentAt: letter.email_sent_at,
            });
          }

          const required = (letter.required_statuses || 'noted,approved,reviewed')
            .split(',').map((s) => s.trim()).filter(Boolean);

          const signed = statuses.map((s) => s.status_type);
          const pending = required.filter((r) => !signed.includes(r as any));

          const daysSinceCreated = Math.floor(
            (Date.now() - parseUTC(letter.created_at).getTime()) / 86_400_000
          );

          let urgency: Urgency;
          if (pending.length === 0) {
            urgency = 'completed';
          } else if (daysSinceCreated >= STALE_DAYS) {
            urgency = 'overdue';
          } else if (statuses.length > 0) {
            urgency = 'pending';
          } else {
            urgency = 'new';
          }

          results.push({
            id: letter.id, letter, pendingStatuses: pending,
            completedStatuses: statuses, urgency, daysSinceCreated,
          });
        })
      );

      results.sort((a, b) => {
        const uDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
        if (uDiff !== 0) return uDiff;
        return parseUTC(b.letter.created_at).getTime() - parseUTC(a.letter.created_at).getTime();
      });

      emailResults.sort((a, b) =>
        parseUTC(b.sentAt).getTime() - parseUTC(a.sentAt).getTime()
      );

      setAll(results);
      setEmailNotifs(emailResults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Dismiss ────────────────────────────────────────────

  const dismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissById = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissAll = () => {
    const next = new Set([...dismissed, ...all.map((n) => n.id), ...emailNotifs.map((n) => n.id)]);
    setDismissed(next);
    saveDismissed(next);
  };

  const markViewed = (id: string) => {
    const next = new Set(viewed).add(id);
    setViewed(next);
    saveViewed(next);
  };

  // ── Outside click ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Render ─────────────────────────────────────────────

  return (
    <>
      <div className="relative" ref={panelRef}>
        {/* Bell */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative text-white hover:opacity-75 transition-opacity"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {visible.length > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
              style={{ backgroundColor: '#e53e3e', fontSize: '9px', minWidth: '16px', height: '16px', padding: '0 3px' }}
            >
              {totalVisible > 99 ? '99+' : totalVisible}
            </span>
          )}
        </button>

        {/* Dropdown list */}
        {open && (
          <div
            className="absolute right-0 mt-2 rounded-2xl z-50 flex flex-col overflow-hidden"
            style={{
              width: '340px',
              maxHeight: '480px',
              background: 'var(--card-bg)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(var(--accent-rgb),0.2)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 rounded-t-xl flex-shrink-0" style={{ backgroundColor: '#003d1f' }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">Notifications</span>
                {visible.length > 0 && (
                  <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: '#e53e3e', color: 'white' }}>
                    {totalVisible}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {totalVisible > 0 && (
                  <button onClick={dismissAll} className="text-xs hover:opacity-75 transition-opacity" style={{ color: 'var(--accent)' }}>
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-white hover:opacity-75">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {loading && all.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm gap-2" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--accent-rgb),0.3)', borderTopColor: 'var(--accent)' }} />
                  Loading...
                </div>
              ) : visible.length === 0 && visibleEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <CheckCircle className="w-10 h-10" style={{ color: 'var(--accent)' }} />
                  <p className="text-sm font-medium" style={{ color: 'rgba(var(--accent-text-rgb),0.8)' }}>All caught up</p>
                  <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>No pending documents</p>
                </div>
              ) : (
                <>
                  {/* Email sent notifications section */}
                  {visibleEmails.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-4 py-2 sticky top-0 border-b" style={{ background: 'var(--card-bg)', borderColor: 'rgba(var(--accent-rgb),0.12)' }}>
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">Email Sent</span>
                        <span className="ml-auto text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>{visibleEmails.length}</span>
                      </div>
                      {visibleEmails.map((en) => (
                        <div key={en.id} className="relative group border-b last:border-0" style={{ borderColor: 'rgba(var(--accent-rgb),0.1)' }}>
                          <button
                            onClick={() => { setSelectedEmail(en); setOpen(false); }}
                            className="w-full text-left px-4 py-3 pr-10 transition-colors"
                            style={{ background: 'transparent' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                                <Mail className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--accent-text)' }}>
                                    {en.letter.reference_number}
                                  </p>
                                  <span className="text-xs flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>{timeAgo(en.sentAt)}</span>
                                </div>
                                <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>{en.letter.title}</p>
                                <p className="text-xs mt-1 text-blue-400">
                                  ✓ Email sent to {en.letter.sender_email || en.letter.sender_name || 'sender'}
                                </p>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => dismiss(e, en.id)}
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document status notifications */}
                  {grouped.map(({ urgency, items }) => (
                  <div key={urgency}>
                    {/* Group label */}
                    <div className="flex items-center gap-2 px-4 py-2 sticky top-0 border-b" style={{ background: 'var(--card-bg)', borderColor: 'rgba(var(--accent-rgb),0.12)' }}>
                      {urgency === 'overdue'   && <AlertTriangle className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.overdue.icon }} />}
                      {urgency === 'pending'   && <Clock className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.pending.icon }} />}
                      {urgency === 'new'       && <FileText className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.new.icon }} />}
                      {urgency === 'completed' && <CheckCircle className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.completed.icon }} />}
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: URGENCY_COLORS[urgency].text }}>
                        {URGENCY_LABEL[urgency]}
                      </span>
                      <span className="ml-auto text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>{items.length}</span>
                    </div>

                    {/* Items */}
                    {items.map((notif) => {
                      const { id, letter, urgency: u, completedStatuses: cs } = notif;
                      const _normalize: Record<string, string> = { 'for approval': 'approved', 'for review': 'reviewed', 'noted': 'noted' };
                      const required = [...new Set(
                        (letter.required_statuses || 'noted,approved,reviewed')
                          .split(',').map((s) => _normalize[s.trim()] ?? s.trim()).filter(Boolean)
                      )];
                      return (
                        <div key={id} className="relative group border-b last:border-0" style={{ borderColor: 'rgba(var(--accent-rgb),0.1)' }}>
                          <button
                            onClick={() => { markViewed(id); setSelected(notif); setOpen(false); }}
                            className="w-full text-left px-4 py-3 pr-10 transition-colors"
                            style={{ background: 'transparent', opacity: viewed.has(id) ? 0.5 : 1 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: URGENCY_COLORS[u].bg }}>
                                <FileText className="w-4 h-4" style={{ color: URGENCY_COLORS[u].icon }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--accent-text)' }}>
                                    {letter.reference_number}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {viewed.has(id) && (
                                      <span className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>viewed</span>
                                    )}
                                    <span className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>{timeAgo(letter.created_at)}</span>
                                  </div>
                                </div>
                                <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>{letter.title}</p>
                                {/* Mini progress */}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {required.filter((s) => s !== 'noted').map((s) => {
                                    const normalize: Record<string, string> = {
                                      'for approval': 'approved',
                                      'for review': 'reviewed',
                                    };
                                    const key = normalize[s] ?? s;
                                    const variants = key === 'approved'
                                      ? ['approved', 'for approval']
                                      : key === 'reviewed'
                                        ? ['reviewed', 'for review']
                                        : [key];
                                    const done = cs.some((c) => variants.includes(c.status_type));
                                    const miniPending: Record<string, string> = {
                                      approved: 'For Approval',
                                      reviewed: 'For Review',
                                    };
                                    const miniDone: Record<string, string> = {
                                      approved: 'Approved',
                                      reviewed: 'Reviewed',
                                    };
                                    const label = done
                                      ? (miniDone[key] ?? key.charAt(0).toUpperCase() + key.slice(1))
                                      : (miniPending[key] ?? key.charAt(0).toUpperCase() + key.slice(1));
                                    return (
                                      <div key={s} className="flex items-center gap-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: done ? '#16a34a' : '#DC2626' }} />
                                        <span className="text-xs" style={{ color: done ? '#16a34a' : '#DC2626' }}>
                                          {label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </button>
                          {/* Dismiss */}
                          <button
                            onClick={(e) => dismiss(e, id)}
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
                </>
              )}
            </div>

            {/* Footer */}
            {totalVisible > 0 && (
              <div className="px-4 py-2 flex-shrink-0 text-center" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.12)' }}>
                <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>
                  Click a notification to view details
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <NotificationDetail
          notification={selected}
          onClose={() => setSelected(null)}
          onNavigate={(id) => { setSelected(null); onNavigate(id); }}
          onDismiss={(id) => { dismissById(id); setSelected(null); }}
        />
      )}

      {/* Email sent detail modal */}
      {selectedEmail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="rounded-2xl w-full max-w-md flex flex-col overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(var(--accent-rgb),0.2)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#003d1f' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#EFF6FF' }}>
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{selectedEmail.letter.reference_number}</p>
                  <p className="text-xs" style={{ color: 'var(--accent)' }}>Email Sent · {timeAgo(selectedEmail.sentAt)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmail(null)} className="text-white hover:opacity-75">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Status banner */}
              <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs font-medium text-blue-300">
                  Email notification was sent to the sender on {formatDate(selectedEmail.sentAt)}.
                </p>
              </div>

              {/* Document info */}
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Document</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>{selectedEmail.letter.title}</p>
                {selectedEmail.letter.document_type && (
                  <span className="inline-block mt-1 text-xs rounded-full px-2 py-0.5 font-medium capitalize" style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                    {selectedEmail.letter.document_type}
                  </span>
                )}
              </div>

              {/* Recipient info */}
              <div>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Sent To</p>
                <div className="space-y-1.5">
                  {selectedEmail.letter.sender_name && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {selectedEmail.letter.sender_name}
                    </div>
                  )}
                  {selectedEmail.letter.sender_office && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {selectedEmail.letter.sender_office}
                    </div>
                  )}
                  {selectedEmail.letter.sender_email && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.6)' }} />
                      {selectedEmail.letter.sender_email}
                    </div>
                  )}
                </div>
              </div>

              {/* Email message preview */}
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Message Sent</p>
                <div className="rounded-lg p-3 text-xs whitespace-pre-wrap leading-relaxed" style={{ maxHeight: '140px', overflowY: 'auto', background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.15)', color: 'rgba(var(--accent-text-rgb),0.65)' }}>
                  {`Good day${selectedEmail.letter.sender_name ? `, ${selectedEmail.letter.sender_name}` : ''}!\n\nThis is to inform you that your document titled "${selectedEmail.letter.title}" (Reference No: ${selectedEmail.letter.reference_number}) has been officially received by the Provincial Treasurer's Office, Province of Misamis Oriental on ${new Date(selectedEmail.letter.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}.\n\nThank you.\n\n- Provincial Treasurer's Office\n  Province of Misamis Oriental`}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.12)' }}>
              <button
                onClick={() => { dismissById(selectedEmail.id); setSelectedEmail(null); }}
                className="flex-1 text-sm py-2 rounded-xl transition-colors font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.7)' }}
              >
                Mark as Read
              </button>
              <button
                onClick={() => { setSelectedEmail(null); onNavigate(selectedEmail.letter.id); }}
                className="flex-1 text-sm py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
              >
                View Document
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
