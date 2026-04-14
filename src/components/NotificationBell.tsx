import { useEffect, useRef, useState } from 'react';
import {
  Bell, X, FileText, Clock, AlertTriangle, CheckCircle,
  User, Building2, Phone, Mail, ArrowRight, Calendar,
} from 'lucide-react';
import { getLetters, getStatusesForLetter } from '../lib/api';
import { Letter, LetterStatus } from '../types';

// ── Types ────────────────────────────────────────────────

type Urgency = 'overdue' | 'pending' | 'new';

interface Notification {
  id: string;
  letter: Letter;
  pendingStatuses: string[];
  completedStatuses: LetterStatus[];
  urgency: Urgency;
  daysSinceCreated: number;
}

// ── Helpers ──────────────────────────────────────────────

const STALE_DAYS = 3;
const STORAGE_KEY = 'dts_dismissed_notifications';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
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

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, pending: 1, new: 2 };
const URGENCY_LABEL: Record<Urgency, string> = { overdue: 'Overdue', pending: 'Pending', new: 'New' };
const URGENCY_COLORS: Record<Urgency, { bg: string; text: string; icon: string; border: string }> = {
  overdue: { bg: '#FEE2E2', text: '#991B1B', icon: '#DC2626', border: '#FECACA' },
  pending: { bg: '#FEF3C7', text: '#92400E', icon: '#D97706', border: '#FDE68A' },
  new:     { bg: '#DFF5E1', text: '#004526', icon: '#004526', border: '#9CAF88' },
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
  const { letter, pendingStatuses, completedStatuses, urgency } = notification;
  const colors = URGENCY_COLORS[urgency];

  const required = (letter.required_statuses || 'noted,approved,reviewed')
    .split(',').map((s) => s.trim()).filter(Boolean);

  const completedTypes = completedStatuses.map((s) => s.status_type);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#003d1f' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: colors.bg }}>
              {urgency === 'overdue' && <AlertTriangle className="w-4 h-4" style={{ color: colors.icon }} />}
              {urgency === 'pending' && <Clock className="w-4 h-4" style={{ color: colors.icon }} />}
              {urgency === 'new'     && <FileText className="w-4 h-4" style={{ color: colors.icon }} />}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{letter.reference_number}</p>
              <p className="text-xs" style={{ color: '#9CAF88' }}>
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
            {urgency === 'overdue' && <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            {urgency === 'pending' && <Clock className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            {urgency === 'new'     && <FileText className="w-4 h-4 flex-shrink-0" style={{ color: colors.icon }} />}
            <p className="text-xs font-medium" style={{ color: colors.text }}>
              {urgency === 'overdue' && `This document has been waiting for ${notification.daysSinceCreated} days with no completion.`}
              {urgency === 'pending' && 'This document has partial signatures and is still awaiting completion.'}
              {urgency === 'new'     && 'This document was recently created and is awaiting action.'}
            </p>
          </div>

          {/* Document info */}
          <div className="px-5 pt-4 pb-2 space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Document</p>
              <p className="text-sm font-semibold text-gray-800">{letter.title}</p>
              {letter.document_subject && (
                <p className="text-xs text-gray-500 mt-0.5">{letter.document_subject}</p>
              )}
              {letter.document_type && (
                <span className="inline-block mt-1 text-xs rounded-full px-2 py-0.5 font-medium capitalize" style={{ backgroundColor: '#DFF5E1', color: '#004526' }}>
                  {letter.document_type}
                </span>
              )}
            </div>

            {letter.description && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-xs text-gray-600 leading-relaxed">{letter.description}</p>
              </div>
            )}

            {/* Sender info */}
            {(letter.sender_name || letter.sender_office) && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Sender</p>
                <div className="space-y-1.5">
                  {letter.sender_name && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {letter.sender_name}
                    </div>
                  )}
                  {letter.sender_office && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {letter.sender_office}
                    </div>
                  )}
                  {letter.sender_phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {letter.sender_phone}
                    </div>
                  )}
                  {letter.sender_email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {letter.sender_email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Created {formatDate(letter.created_at)}
            </div>
          </div>

          {/* Status progress */}
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Signature Progress</p>
            <div className="space-y-2">
              {required.map((status) => {
                const done = completedTypes.includes(status as any);
                const completedEntry = completedStatuses.find((s) => s.status_type === status);
                return (
                  <div key={status} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? '' : 'border-2 border-dashed border-gray-300'}`}
                      style={done ? { backgroundColor: '#004526' } : {}}>
                      {done && <CheckCircle className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium capitalize ${done ? 'text-gray-700' : 'text-gray-400'}`}>
                          {status}
                        </span>
                        {done
                          ? <span className="text-xs text-green-600 font-medium">Completed</span>
                          : <span className="text-xs font-medium" style={{ color: colors.text }}>Pending</span>
                        }
                      </div>
                      {done && completedEntry && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          by {completedEntry.signed_by} · {timeAgo(completedEntry.signed_at)}
                        </p>
                      )}
                      {done && completedEntry?.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">"{completedEntry.notes}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{completedStatuses.length} of {required.length} completed</span>
                <span>{Math.round((completedStatuses.length / required.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(completedStatuses.length / required.length) * 100}%`,
                    backgroundColor: '#004526',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { onDismiss(notification.id); onClose(); }}
            className="flex-1 text-sm py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => { onNavigate(notification.id); onClose(); }}
            className="flex-1 text-sm py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#003d1f' }}
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
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const visible = all.filter((n) => !dismissed.has(n.id));
  const grouped = (['overdue', 'pending', 'new'] as Urgency[])
    .map((u) => ({ urgency: u, items: visible.filter((n) => n.urgency === u) }))
    .filter((g) => g.items.length > 0);

  // ── Fetch ──────────────────────────────────────────────

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const letters = await getLetters();
      const results: Notification[] = [];

      await Promise.all(
        letters.map(async (letter) => {
          const required = (letter.required_statuses || 'noted,approved,reviewed')
            .split(',').map((s) => s.trim()).filter(Boolean);

          const statuses = await getStatusesForLetter(letter.id);
          const signed = statuses.map((s) => s.status_type);
          const pending = required.filter((r) => !signed.includes(r as any));

          if (pending.length === 0) return;

          const daysSinceCreated = Math.floor(
            (Date.now() - parseUTC(letter.created_at).getTime()) / 86_400_000
          );

          let urgency: Urgency = 'new';
          if (daysSinceCreated >= STALE_DAYS) urgency = 'overdue';
          else if (statuses.length > 0) urgency = 'pending';

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

      setAll(results);
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
    const next = new Set([...dismissed, ...all.map((n) => n.id)]);
    setDismissed(next);
    saveDismissed(next);
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
              {visible.length > 99 ? '99+' : visible.length}
            </span>
          )}
        </button>

        {/* Dropdown list */}
        {open && (
          <div
            className="absolute right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 flex flex-col"
            style={{ width: '340px', maxHeight: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 rounded-t-xl flex-shrink-0" style={{ backgroundColor: '#003d1f' }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">Notifications</span>
                {visible.length > 0 && (
                  <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: '#e53e3e', color: 'white' }}>
                    {visible.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {visible.length > 0 && (
                  <button onClick={dismissAll} className="text-xs hover:opacity-75 transition-opacity" style={{ color: '#9CAF88' }}>
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
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
                  Loading...
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <CheckCircle className="w-10 h-10" style={{ color: '#9CAF88' }} />
                  <p className="text-sm font-medium text-gray-500">All caught up</p>
                  <p className="text-xs text-gray-400">No pending documents</p>
                </div>
              ) : (
                grouped.map(({ urgency, items }) => (
                  <div key={urgency}>
                    {/* Group label */}
                    <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-gray-50 border-b border-gray-100">
                      {urgency === 'overdue' && <AlertTriangle className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.overdue.icon }} />}
                      {urgency === 'pending' && <Clock className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.pending.icon }} />}
                      {urgency === 'new'     && <FileText className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.new.icon }} />}
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: URGENCY_COLORS[urgency].text }}>
                        {URGENCY_LABEL[urgency]}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">{items.length}</span>
                    </div>

                    {/* Items */}
                    {items.map((notif) => {
                      const { id, letter, pendingStatuses, urgency: u, completedStatuses: cs } = notif;
                      const required = (letter.required_statuses || 'noted,approved,reviewed')
                        .split(',').map((s) => s.trim()).filter(Boolean);
                      return (
                        <div key={id} className="relative group border-b border-gray-100 last:border-0">
                          <button
                            onClick={() => { setSelected(notif); setOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors pr-10"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: URGENCY_COLORS[u].bg }}>
                                <FileText className="w-4 h-4" style={{ color: URGENCY_COLORS[u].icon }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold truncate" style={{ color: '#004526' }}>
                                    {letter.reference_number}
                                  </p>
                                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(letter.created_at)}</span>
                                </div>
                                <p className="text-xs text-gray-600 truncate mt-0.5">{letter.title}</p>
                                {/* Mini progress */}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {required.map((s) => {
                                    const done = cs.some((c) => c.status_type === s);
                                    return (
                                      <div key={s} className="flex items-center gap-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full`}
                                          style={{ backgroundColor: done ? '#004526' : URGENCY_COLORS[u].icon, opacity: done ? 1 : 0.4 }} />
                                        <span className="text-xs capitalize" style={{ color: done ? '#004526' : URGENCY_COLORS[u].text, opacity: done ? 1 : 0.7 }}>
                                          {s}
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
                ))
              )}
            </div>

            {/* Footer */}
            {visible.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0 text-center">
                <p className="text-xs text-gray-400">
                  {all.length - visible.length > 0 ? `${all.length - visible.length} dismissed · ` : ''}
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
    </>
  );
}
