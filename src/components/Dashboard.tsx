import { FileText, Clock, CheckCircle, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CalendarDays, ChevronDown, UserCheck, Building2, Trophy, Timer, BarChart3, Search, X } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { getLetters, getStatusesForLetter, getPublicLetters, getPublicStatusesForLetter } from '../lib/api';
import { Letter, LetterStatus } from '../types';

interface DashboardProps {
  onStatusFilter?: (filter: 'pending' | 'completed') => void;
  publicMode?: boolean;
}

type RecentView = 'incoming' | 'outgoing';
type StatusView = 'pending' | 'completed';

const TYPE_COLORS = ['#60a5fa', '#a78bfa', '#fbbf24', '#34d399', '#f87171', 'var(--accent)', '#fb923c'];
const SIR_LINMARK = 'Linmark G. Benlot';
const SIR_RONALD  = 'RONALD JAME D. VIOLON';
const PAGES = ['Overview', 'Office Performance', 'Track'];

interface FilterOption { value: string; label: string; }

function FilterDropdown({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: FilterOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 pl-3 pr-2.5 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap"
        style={{
          background: open ? 'rgba(var(--primary-rgb),0.7)' : 'var(--card-bg)',
          border: open ? '1px solid rgba(var(--accent-rgb),0.5)' : '1px solid rgba(var(--accent-rgb),0.25)',
          color: 'var(--accent-text)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ color: 'var(--accent)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 left-0 z-50 min-w-max rounded-xl overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(var(--accent-rgb),0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors whitespace-nowrap"
              style={{
                color: opt.value === value ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.65)',
                background: opt.value === value ? 'rgba(var(--accent-rgb),0.15)' : 'transparent',
                fontWeight: opt.value === value ? 600 : 400,
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)'; }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <span style={{ color: 'var(--accent)', fontSize: '10px' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onStatusFilter, publicMode }: DashboardProps) {
  const [letters, setLetters]     = useState<Letter[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, LetterStatus[]>>({});
  const [loading, setLoading]     = useState(true);
  const [recentView, setRecentView]   = useState<RecentView>('incoming');
  const [statusView, setStatusView]   = useState<StatusView>('pending');
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [commView, setCommView]       = useState<'incoming' | 'outgoing'>('incoming');
  const [page, setPage]               = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ letter: typeof letters[0]; statuses: LetterStatus[] } | null | 'not-found'>(null);
  const [searching, setSearching]     = useState(false);
  const [trackFilters, setTrackFilters] = useState({ direction: '', office: '', createdBy: '', month: '', year: '' });

  const loadData = useCallback(async () => {
    try {
      const data = publicMode ? await getPublicLetters() : await getLetters();
      setLetters(Array.isArray(data) ? data : []);
      const map: Record<string, LetterStatus[]> = {};
      const fetchStatus = publicMode ? getPublicStatusesForLetter : getStatusesForLetter;
      await Promise.all(data.map(async (l) => { map[l.id] = await fetchStatus(l.id); }));
      setStatusMap(map);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [publicMode]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s + on window focus so dashboard stays live
  useEffect(() => {
    const interval = setInterval(loadData, 30_000);
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [loadData]);

  const isCompleted = (l: Letter) => {
    const s = statusMap[l.id] || [];
    const hasNoted = s.some(x => x.status_type === 'noted');
    const hasReview = s.some(x => x.status_type === 'for review' || x.status_type === 'reviewed');
    const hasApproval = s.some(x => x.status_type === 'for approval' || x.status_type === 'approved');
    return hasNoted || (hasReview && hasApproval);
  };

  const getMissing = (l: Letter): string[] => {
    const s = statusMap[l.id] || [];
    const req = (l.required_statuses || 'noted,approved,reviewed').split(',').map(x => x.trim()).filter(Boolean);
    const missing: string[] = [];
    req.forEach(r => {
      if (!s.some(x => x.status_type === r)) {
        if (r === 'for review' || r === 'reviewed') missing.push(`Review by ${SIR_LINMARK}`);
        else if (r === 'for approval' || r === 'approved') missing.push(`Approval by ${SIR_RONALD}`);
        else missing.push(r.charAt(0).toUpperCase() + r.slice(1));
      }
    });
    return [...new Set(missing)];
  };

  const getDone = (l: Letter): string[] => {
    const s = statusMap[l.id] || [];
    const done: string[] = [];
    if (s.some(x => x.status_type === 'for review' || x.status_type === 'reviewed'))
      done.push(`Reviewed by ${SIR_LINMARK}`);
    if (s.some(x => x.status_type === 'for approval' || x.status_type === 'approved'))
      done.push(`Approved by ${SIR_RONALD}`);
    return done;
  };

  const oneWeekAgo = Date.now() - 7 * 86_400_000;
  const isRecent   = (l: Letter) => new Date(l.created_at).getTime() >= oneWeekAgo;

  const incoming  = letters.filter(l => l.document_direction === 'receiving');
  const outgoing  = letters.filter(l => l.document_direction === 'sending');
  const pending   = letters.filter(l => !isCompleted(l));
  const completed = letters.filter(l => isCompleted(l));
  const overdue   = pending.filter(l => (Date.now() - new Date(l.created_at).getTime()) / 86_400_000 >= 3);

  const recentLists: Record<RecentView, Letter[]> = {
    incoming: incoming.filter(isRecent),
    outgoing: outgoing.filter(isRecent),
  };

  const typeCounts: Record<string, number> = {};
  letters.forEach(l => { const t = l.document_type || 'Other'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const typeEntries = Object.entries(typeCounts).sort(([, a], [, b]) => b - a);

  // Comm pattern
  const incomingOfficeCounts: Record<string, number> = {};
  incoming.forEach(l => {
    const o = (l.sender_office || '').trim() || (l.sender_name || '').trim() || 'Walk-in / Unknown';
    incomingOfficeCounts[o] = (incomingOfficeCounts[o] || 0) + 1;
  });
  const topIncomingOffices = Object.entries(incomingOfficeCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  const outgoingOfficeCounts: Record<string, number> = {};
  outgoing.forEach(l => {
    const statuses = statusMap[l.id] || [];
    const sent = statuses.find(s => s.signed_by?.startsWith('Sent by:'));
    if (sent) {
      const m = sent.signed_by.match(/\(([^)]+)\)$/);
      const o = m ? m[1].trim() : sent.signed_by.replace(/^Sent by:.*?→\s*/, '').trim();
      if (o) outgoingOfficeCounts[o] = (outgoingOfficeCounts[o] || 0) + 1;
    } else {
      const o = l.sender_office?.trim();
      if (o) outgoingOfficeCounts[o] = (outgoingOfficeCounts[o] || 0) + 1;
    }
  });
  const topOutgoingOffices = Object.entries(outgoingOfficeCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  // Status flow stages — mapped to the actual workflow
  const STATUS_STAGES = [
    {
      key: 'pending',
      label: 'Pending',
      color: '#94a3b8',
      // No statuses at all yet — just created
      match: (_s: string, all: string[]) => all.length === 0,
    },
    {
      key: 'under_review',
      label: 'Under Review',
      color: '#a78bfa',
      // Has some statuses but not yet reviewed or noted
      match: (_s: string, all: string[]) =>
        all.length > 0 && !all.includes('reviewed') && !all.includes('noted'),
    },
    {
      key: 'for_approval',
      label: 'For Approval',
      color: '#fb923c',
      // Reviewed but not yet noted by Sir Violon
      match: (_s: string, all: string[]) =>
        all.includes('reviewed') && !all.includes('noted'),
    },
    {
      key: 'completed',
      label: 'Completed',
      color: '#34d399',
      // Noted by Sir Violon — fully done
      match: (_s: string, all: string[]) => all.includes('noted'),
    },
    {
      key: 'released',
      label: 'Released',
      color: '#60a5fa',
      match: (_s: string, all: string[]) => all.includes('released') || all.includes('sent') || all.includes('sent/released'),
    },
    {
      key: 'returned',
      label: 'Returned',
      color: '#f87171',
      match: (_s: string, all: string[]) => all.includes('returned'),
    },
  ];

  const stageCounts: Record<string, number> = Object.fromEntries(STATUS_STAGES.map(s => [s.key, 0]));
  letters.forEach(l => {
    const all = (statusMap[l.id] || []).map(s => s.status_type.toLowerCase().trim());
    // Check stages in priority order (released/returned are final, then completed, etc.)
    const priorityOrder = ['released', 'returned', 'completed', 'for_approval', 'under_review', 'pending'];
    for (const key of priorityOrder) {
      const stage = STATUS_STAGES.find(s => s.key === key)!;
      if ((stage.match as Function)('', all)) {
        stageCounts[key]++;
        break;
      }
    }
  });
  const maxStageCount = Math.max(...Object.values(stageCounts), 1);

  // Office performance
  const officeStats = useMemo(() => {
    const map: Record<string, { total: number; completedDays: number[] }> = {};
    letters.forEach(l => {
      let label = (l.sender_office || '').trim() || (l.sender_name || '').trim();
      if (!label && l.document_direction === 'sending') {
        const sts = statusMap[l.id] || [];
        const sent = sts.find(s => s.signed_by?.startsWith('Sent by:'));
        if (sent) {
          const m = sent.signed_by.match(/\(([^)]+)\)$/);
          label = m ? m[1].trim() : sent.signed_by.replace(/^Sent by:.*?→\s*/, '').trim();
        }
        if (!label) label = 'PTO (Outgoing)';
      }
      if (!label) label = 'Walk-in / No Office';
      if (!map[label]) map[label] = { total: 0, completedDays: [] };
      map[label].total++;
      const sts = [...(statusMap[l.id] || [])].sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime());
      const hasNoted = sts.some(x => x.status_type === 'noted');
      const hasReview = sts.some(x => x.status_type === 'for review' || x.status_type === 'reviewed');
      const hasApproval = sts.some(x => x.status_type === 'for approval' || x.status_type === 'approved');
      const done = hasNoted || (hasReview && hasApproval);
      if (done && sts[0]) {
        const days = (new Date(sts[0].signed_at).getTime() - new Date(l.created_at).getTime()) / 86_400_000;
        if (days >= 0) map[label].completedDays.push(days);
      }
    });
    return Object.entries(map).map(([office, d]) => ({
      office,
      total: d.total,
      completed: d.completedDays.length,
      avgDays: d.completedDays.length > 0 ? d.completedDays.reduce((a, b) => a + b, 0) / d.completedDays.length : null as number | null,
    })).sort((a, b) => b.total - a.total).slice(0, 12);
  }, [letters, statusMap]);

  const officeWithTime = officeStats.filter(o => o.avgDays !== null);
  const fastest = [...officeWithTime].sort((a, b) => (a.avgDays ?? 999) - (b.avgDays ?? 999)).slice(0, 3);
  const slowest = [...officeWithTime].sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0)).slice(0, 3);
  const maxOfficeTotal = officeStats[0]?.total || 1;

  const fmtDays = (days: number) => {
    if (days < 1) return '< 1 day';
    if (days < 1.5) return '1 day';
    return `${Math.round(days)} days`;
  };

  const today         = new Date().toDateString();
  const todayCount    = letters.filter(l => new Date(l.created_at).toDateString() === today).length;
  const completionPct = letters.length ? Math.round((completed.length / letters.length) * 100) : 0;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const found = letters.find(l => l.reference_number.toLowerCase() === q || l.reference_number.toLowerCase().includes(q));
      if (found) {
        const fetchStatus = publicMode ? getPublicStatusesForLetter : getStatusesForLetter;
        const sts = statusMap[found.id] || await fetchStatus(found.id);
        setSearchResult({ letter: found, statuses: sts });
      } else {
        setSearchResult('not-found');
      }
    } finally {
      setSearching(false);
    }
  };

  const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--card-bg)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(var(--accent-rgb),0.18)',
    borderRadius: '16px',
    ...extra,
  });

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }} />
        <p className="mt-2 text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)', overflow: 'hidden' }}>

      {/* ── Page nav ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          {PAGES.map((label, i) => (
            <button key={i} onClick={() => setPage(i)} className="flex items-center gap-1.5 transition-all" style={{ opacity: page === i ? 1 : 0.4 }}>
              <div className="rounded-full transition-all duration-300" style={{ width: page === i ? '20px' : '6px', height: '6px', background: page === i ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.5)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: page === i ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.5)' }}>{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-20"
            style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' }}>
            ← Prev
          </button>
          <button onClick={() => setPage(p => Math.min(PAGES.length - 1, p + 1))} disabled={page === PAGES.length - 1}
            className="px-3 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-20"
            style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' }}>
            Next →
          </button>
        </div>
      </div>

      {/* ── Search bar row ── */}
      <div className="px-4 pb-2 flex-shrink-0 relative">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'rgba(var(--accent-rgb),0.45)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResult(null); }}
              placeholder="Track a document — enter reference number..."
              className="w-full py-2 text-sm rounded-xl focus:outline-none focus:ring-1"
              style={{ paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '12px', background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.22)', color: 'var(--accent-text)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setSearchResult(null); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }} />
              </button>
            )}
          </div>
          <button type="submit" disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--card-bg)' }}>
            {searching ? '...' : 'Track'}
          </button>
        </form>

        {/* Result drops directly below the search bar */}
        {searchResult && (
          <div className="absolute left-4 right-4 top-full z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--card-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
              {searchResult === 'not-found' ? (
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                    <X className="w-4 h-4" style={{ color: '#f87171' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>Document not found</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>No match for "{searchQuery}"</p>
                  </div>
                </div>
              ) : (() => {
                const { letter, statuses } = searchResult;
                const stageLabel = (() => {
                  const all = statuses.map(s => s.status_type.toLowerCase().trim());
                  const priorityOrder = ['completed', 'released', 'returned', 'for_approval', 'under_review', 'pending'];
                  for (const key of priorityOrder) {
                    const stage = STATUS_STAGES.find(s => s.key === key);
                    if (stage && (stage.match as Function)('', all)) return stage;
                  }
                  return null;
                })();
                const sortedStatuses = [...statuses].sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime());
                return (
                  <div>
                    {/* Header */}
                    <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                      <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(var(--accent-rgb),0.12)' }}>
                        <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{letter.reference_number}</p>
                          {stageLabel && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{ background: `${stageLabel.color}20`, color: stageLabel.color, border: `1px solid ${stageLabel.color}40` }}>
                              {stageLabel.label}
                            </span>
                          )}
                          {letter.document_type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                              style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
                              {letter.document_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>{letter.title}</p>
                        {letter.sender_office && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>From: {letter.sender_office}</p>
                        )}
                      </div>
                      <button onClick={() => setSearchResult(null)} className="flex-shrink-0 p-1 rounded-lg" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Status timeline */}
                    {sortedStatuses.length > 0 && (
                      <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                        <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>Status History</p>
                        {sortedStatuses.map((s, i) => (
                          <div key={s.id} className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: i === 0 ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.3)' }} />
                              {i < sortedStatuses.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'rgba(var(--accent-rgb),0.15)', minHeight: '12px' }} />}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold capitalize" style={{ color: i === 0 ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.6)' }}>
                                  {s.status_type}
                                </span>
                                <span className="text-[9px]" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>
                                  {new Date(s.signed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                              {s.signed_by && <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>{s.signed_by}</p>}
                              {s.notes && <p className="text-[10px] truncate" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>{s.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {sortedStatuses.length === 0 && (
                      <div className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>No status updates yet.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
      </div>

      {/* ── Slide container ── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${page * (100 / PAGES.length)}%)`, width: `${PAGES.length * 100}%`, height: '100%', alignItems: 'stretch' }}>

          {/* ══ PAGE 0: Overview ══ */}
          <div className="flex flex-col gap-3 px-4 pb-2 overflow-hidden" style={{ width: `${100 / PAGES.length}%`, height: '100%' }}>

            {/* Stat cards */}
            <div className="flex gap-2 flex-shrink-0">
              {/* Total with mini pie */}
              {(() => {
                const total = letters.length;
                const size = 44; const cx = size / 2, cy = size / 2, r = 20, inner = 12;
                let angle = -Math.PI / 2;
                const slices = total > 0 ? typeEntries.map(([type, count], i) => {
                  const sweep = (count / total) * 2 * Math.PI;
                  const x1 = cx + r * Math.cos(angle); const y1 = cy + r * Math.sin(angle);
                  angle += sweep;
                  const x2 = cx + r * Math.cos(angle); const y2 = cy + r * Math.sin(angle);
                  const xi1 = cx + inner * Math.cos(angle - sweep); const yi1 = cy + inner * Math.sin(angle - sweep);
                  const xi2 = cx + inner * Math.cos(angle); const yi2 = cy + inner * Math.sin(angle);
                  const large = sweep > Math.PI ? 1 : 0;
                  const d = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`;
                  return <path key={type} d={d} fill={TYPE_COLORS[i % TYPE_COLORS.length]} opacity={0.9} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />;
                }) : null;
                return (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1"
                    style={{ background: 'rgba(var(--accent-text-rgb),0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-text-rgb),0.14)' }}>
                    <div className="flex-shrink-0">
                      {total > 0 ? (
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                          {slices}
                          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="rgba(var(--accent-text-rgb),0.9)" fontSize="10" fontWeight="bold">{total}</text>
                        </svg>
                      ) : (
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(var(--accent-text-rgb),0.1)' }}>
                          <FileText className="w-4 h-4" style={{ color: 'var(--accent-text)' }} />
                        </div>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xl font-bold leading-none" style={{ color: 'var(--accent-text)' }}>{total}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.5)' }}>Total</p>
                      <p className="text-[9px] mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>{todayCount} today</p>
                    </div>
                  </div>
                );
              })()}
              {[
                { label: 'Pending',   value: pending.length,   sub: 'awaiting action',        color: '#fbbf24', bg: 'rgba(251,191,36,0.07)',  bdr: 'rgba(251,191,36,0.22)',  Icon: Clock,          click: () => onStatusFilter?.('pending') },
                { label: 'Completed', value: completed.length, sub: `${completionPct}% done`, color: '#34d399', bg: 'rgba(52,211,153,0.07)',  bdr: 'rgba(52,211,153,0.22)',  Icon: CheckCircle,    click: () => onStatusFilter?.('completed') },
                { label: 'Incoming',  value: incoming.length,  sub: 'received',               color: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  bdr: 'rgba(96,165,250,0.22)',  Icon: ArrowDownToLine },
                { label: 'Outgoing',  value: outgoing.length,  sub: 'sent out',               color: '#a78bfa', bg: 'rgba(167,139,250,0.07)', bdr: 'rgba(167,139,250,0.22)', Icon: ArrowUpFromLine },
                { label: 'Overdue',   value: overdue.length,   sub: 'over 3 days',            color: overdue.length > 0 ? '#f87171' : '#34d399', bg: overdue.length > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(52,211,153,0.07)', bdr: overdue.length > 0 ? 'rgba(239,68,68,0.22)' : 'rgba(52,211,153,0.22)', Icon: AlertTriangle },
              ].map(({ label, value, sub, color, bg, bdr, Icon, click }) => (
                <button key={label} onClick={click}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 active:scale-95 flex-1"
                  style={{ background: bg, backdropFilter: 'blur(20px)', border: `1px solid ${bdr}`, cursor: click ? 'pointer' : 'default' }}
                  onMouseEnter={e => click && ((e.currentTarget as HTMLButtonElement).style.borderColor = `${color}55`)}
                  onMouseLeave={e => click && ((e.currentTarget as HTMLButtonElement).style.borderColor = bdr)}>
                  <div className="p-2 rounded-xl flex-shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.5)' }}>{label}</p>
                    <p className="text-[9px] mt-0.5 truncate" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* 4 columns */}
            <div className="flex gap-3 flex-1 min-h-0">

              {/* COL 1: Recent */}
              <div className="flex flex-col rounded-2xl overflow-hidden" style={{ ...glass(), flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Recent · 7 days</span>
                  <div className="flex gap-1.5 ml-2">
                    {(['incoming', 'outgoing'] as RecentView[]).map(v => {
                      const color = v === 'incoming' ? '#60a5fa' : '#a78bfa';
                      return (
                        <button key={v} onClick={() => setRecentView(v)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 capitalize"
                          style={{ background: recentView === v ? `${color}20` : 'rgba(0,0,0,0.2)', border: recentView === v ? `1px solid ${color}50` : '1px solid rgba(var(--accent-rgb),0.1)', color: recentView === v ? color : 'rgba(var(--accent-text-rgb),0.35)' }}>
                          {v} ({recentLists[v].length})
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                  {recentLists[recentView].length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <FileText className="w-9 h-9" style={{ color: 'var(--accent)' }} />
                      <p className="text-sm" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No {recentView} docs in the last 7 days</p>
                    </div>
                  ) : recentLists[recentView].map(l => {
                    const done = isCompleted(l);
                    const daysAgo = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
                    const vColor = recentView === 'incoming' ? '#60a5fa' : '#a78bfa';
                    return (
                      <div key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: 'rgba(0,0,0,0.22)', border: `1px solid ${vColor}18` }}>
                        <div className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: `${vColor}15`, border: `1px solid ${vColor}25` }}>
                          {recentView === 'incoming' ? <ArrowDownToLine className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} /> : <ArrowUpFromLine className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold leading-tight" style={{ color: 'var(--accent-text)' }}>{l.reference_number}</p>
                            {l.document_type && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize leading-none"
                                style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                                {l.document_type}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.45)' }}>{l.title}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
                            style={done ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' } : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                            {done ? '✓ Done' : '⏳ Pending'}
                          </span>
                          <span className="text-[9px]" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>
                            {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COL 2: Status Tracker */}
              <div className="flex flex-col rounded-2xl overflow-hidden" style={{ ...glass(), flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <UserCheck className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Status Tracker</span>
                  <div className="flex gap-1.5 ml-2">
                    {(['pending', 'completed'] as StatusView[]).map(v => {
                      const color = v === 'pending' ? '#fbbf24' : '#34d399';
                      const list  = v === 'pending' ? pending : completed;
                      return (
                        <button key={v} onClick={() => setStatusView(v)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 capitalize"
                          style={{ background: statusView === v ? `${color}20` : 'rgba(0,0,0,0.2)', border: statusView === v ? `1px solid ${color}50` : '1px solid rgba(var(--accent-rgb),0.1)', color: statusView === v ? color : 'rgba(var(--accent-text-rgb),0.35)' }}>
                          {v} ({list.length})
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {(statusView === 'pending' ? pending : completed).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <CheckCircle className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No {statusView} documents</p>
                    </div>
                  ) : (statusView === 'pending' ? pending : completed).map(l => {
                    const missing = getMissing(l);
                    const done    = getDone(l);
                    const daysAgo = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
                    const isOver  = daysAgo >= 3;
                    return (
                      <div key={l.id} className="px-3 py-2.5 rounded-xl"
                        style={{ background: isOver && statusView === 'pending' ? 'rgba(239,68,68,0.07)' : 'rgba(0,0,0,0.2)', border: isOver && statusView === 'pending' ? '1px solid rgba(239,68,68,0.18)' : '1px solid rgba(var(--accent-rgb),0.08)' }}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold" style={{ color: isOver && statusView === 'pending' ? '#fca5a5' : 'var(--accent-text)' }}>{l.reference_number}</p>
                              {isOver && statusView === 'pending' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                  {daysAgo}d overdue
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.45)' }}>{l.title}</p>
                          </div>
                          {l.document_type && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0"
                              style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                              {l.document_type}
                            </span>
                          )}
                        </div>
                        {statusView === 'pending' && missing.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {missing.map(m => (
                              <span key={m} className="text-[9px] px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                ⏳ {m}
                              </span>
                            ))}
                          </div>
                        )}
                        {statusView === 'completed' && done.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {done.map(d => (
                              <span key={d} className="text-[9px] px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                                ✓ {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COL 3: Status Breakdown */}
              <div className="flex flex-col rounded-2xl overflow-hidden" style={{ ...glass(), flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Status Breakdown</span>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
                    {letters.length} total
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
                  {letters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <BarChart3 className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No documents yet</p>
                    </div>
                  ) : STATUS_STAGES.map(stage => {
                    const count  = stageCounts[stage.key];
                    const pct    = letters.length ? Math.round((count / letters.length) * 100) : 0;
                    const barPct = Math.round((count / maxStageCount) * 100);
                    return (
                      <div key={stage.key} className="rounded-xl px-3 py-2.5"
                        style={{ background: `${stage.color}0f`, border: `1px solid ${stage.color}28` }}>
                        {/* Label + count row */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color, boxShadow: `0 0 6px ${stage.color}80` }} />
                            <span className="text-xs font-bold" style={{ color: 'var(--accent-text)' }}>{stage.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black" style={{ color: stage.color }}>{count}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${stage.color}20`, color: stage.color }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${stage.color}80, ${stage.color})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COL 4: Overdue Alert — always rightmost */}
              <div className="flex flex-col rounded-2xl overflow-hidden" style={{
                flex: 1, minWidth: 0, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                background: overdue.length > 0 ? 'rgba(50,8,8,0.55)' : 'var(--card-bg)',
                border: overdue.length > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(52,211,153,0.2)',
                borderRadius: '16px',
              }}>
                <button onClick={() => overdue.length > 0 && setOverdueOpen(v => !v)}
                  className="flex flex-col items-center justify-center gap-2.5 w-full transition-all flex-shrink-0"
                  style={{ padding: overdueOpen ? '14px 16px 12px' : '0', flex: overdueOpen ? '0 0 auto' : '1', borderBottom: overdueOpen ? '1px solid rgba(239,68,68,0.18)' : 'none', cursor: overdue.length > 0 ? 'pointer' : 'default' }}>
                  {overdue.length > 0 ? (
                    <>
                      {!overdueOpen && (
                        <div className="relative flex items-center justify-center">
                          <div className="absolute rounded-full animate-ping" style={{ width: '68px', height: '68px', background: 'rgba(239,68,68,0.12)' }} />
                          <div className="relative flex items-center justify-center rounded-full" style={{ width: '60px', height: '60px', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.35)' }}>
                            <span className="font-black" style={{ color: '#f87171', fontSize: '30px', lineHeight: 1 }}>!</span>
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-base font-bold" style={{ color: '#fca5a5' }}>{overdue.length} Overdue</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(252,165,165,0.5)' }}>{overdueOpen ? 'tap to collapse' : 'over 3 days · tap to view'}</p>
                      </div>
                      {overdueOpen && <ChevronDown className="w-4 h-4" style={{ color: 'rgba(252,165,165,0.4)', transform: 'rotate(180deg)' }} />}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-10 h-10" style={{ color: '#34d399', opacity: 0.65 }} />
                      <div className="text-center">
                        <p className="text-sm font-semibold" style={{ color: '#6ee7b7' }}>All Clear</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(110,231,183,0.45)' }}>No overdue documents</p>
                      </div>
                    </>
                  )}
                </button>
                {overdueOpen && overdue.length > 0 && (
                  <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
                    {overdue.map(l => {
                      const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
                      const missing = getMissing(l);
                      return (
                        <div key={l.id} className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-bold" style={{ color: '#fca5a5' }}>{l.reference_number}</p>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg flex-shrink-0"
                              style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.28)' }}>
                              {days}d
                            </span>
                          </div>
                          <p className="text-[10px] truncate" style={{ color: 'rgba(252,165,165,0.6)' }}>{l.title}</p>
                          {missing.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {missing.map(m => (
                                <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                                  ⏳ {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>{/* end PAGE 0 */}

          {/* ══ PAGE 1: Office Performance ══ */}
          <div className="flex flex-col gap-3 px-4 pb-2 overflow-hidden" style={{ width: `${100 / PAGES.length}%`, height: '100%' }}>

            <div className="flex items-center gap-2 flex-shrink-0">
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>Office / Department Performance</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
                {officeStats.length} offices
              </span>
            </div>

            <div className="flex gap-3 flex-1 min-h-0">

              {/* COL A: Docs per office */}
              <div className="flex flex-col rounded-2xl overflow-hidden flex-1 min-w-0" style={{ ...glass() }}>
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Docs per Office</span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                  {officeStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <Building2 className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No data yet</p>
                    </div>
                  ) : officeStats.map((o, i) => (
                    <div key={o.office}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <span className="text-[10px] font-black flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>#{i+1}</span>
                          <span className="text-xs truncate" style={{ color: 'rgba(var(--accent-text-rgb),0.85)' }}>{o.office}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>{o.total}</span>
                          <span className="text-[9px]" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>docs</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(o.total / maxOfficeTotal) * 100}%`, background: 'linear-gradient(90deg, rgba(var(--accent-rgb),0.5), var(--accent))' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COL B: Avg processing time */}
              <div className="flex flex-col rounded-2xl overflow-hidden flex-1 min-w-0" style={{ ...glass() }}>
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <Timer className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Avg Processing Time</span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                  {officeWithTime.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <Timer className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs text-center" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No completed docs yet</p>
                    </div>
                  ) : (() => {
                    const maxDays = Math.max(...officeWithTime.map(o => o.avgDays ?? 0), 1);
                    return officeWithTime.map(o => {
                      const days  = o.avgDays!;
                      const color = days <= 1 ? '#34d399' : days <= 3 ? '#fbbf24' : '#f87171';
                      return (
                        <div key={o.office}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs truncate flex-1 mr-2" style={{ color: 'rgba(var(--accent-text-rgb),0.85)' }}>{o.office}</span>
                            <span className="text-xs font-black flex-shrink-0" style={{ color }}>{fmtDays(days)}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(days / maxDays) * 100}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* COL C: Fastest */}
              <div className="flex flex-col rounded-2xl overflow-hidden flex-1 min-w-0" style={{ ...glass() }}>
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <Trophy className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Fastest Offices</span>
                </div>
                <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
                  {fastest.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <Trophy className="w-8 h-8" style={{ color: '#fbbf24' }} />
                      <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No data yet</p>
                    </div>
                  ) : fastest.map((o, i) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={o.office} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}>
                        <span className="text-lg flex-shrink-0">{medals[i]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" style={{ color: 'rgba(var(--accent-text-rgb),0.9)' }}>{o.office}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>{o.total} docs · {o.completed} completed</p>
                        </div>
                        <span className="text-sm font-black flex-shrink-0" style={{ color: '#34d399' }}>
                          {fmtDays(o.avgDays ?? 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COL D: Needs Attention */}
              <div className="flex flex-col rounded-2xl overflow-hidden flex-1 min-w-0" style={{ ...glass() }}>
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Needs Attention</span>
                </div>
                <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
                  {slowest.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <CheckCircle className="w-8 h-8" style={{ color: '#34d399' }} />
                      <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>All offices on track</p>
                    </div>
                  ) : slowest.map((o, i) => (
                    <div key={o.office} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: 'rgba(248,113,113,0.5)' }}>#{i+1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate" style={{ color: 'rgba(var(--accent-text-rgb),0.9)' }}>{o.office}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>{o.total} docs · {o.completed} completed</p>
                      </div>
                      <span className="text-sm font-black flex-shrink-0" style={{ color: '#f87171' }}>{fmtDays(o.avgDays!)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* COL E: Comm. Pattern */}
              <div className="flex flex-col rounded-2xl overflow-hidden flex-1 min-w-0" style={{ ...glass() }}>
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <Building2 className="w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>Comm. Pattern</span>
                  <div className="flex gap-1 ml-auto">
                    {(['incoming', 'outgoing'] as const).map(v => {
                      const color = v === 'incoming' ? '#60a5fa' : '#a78bfa';
                      return (
                        <button key={v} onClick={() => setCommView(v)}
                          className="px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all capitalize"
                          style={{ background: commView === v ? `${color}20` : 'rgba(0,0,0,0.2)', border: commView === v ? `1px solid ${color}50` : '1px solid rgba(var(--accent-rgb),0.1)', color: commView === v ? color : 'rgba(var(--accent-text-rgb),0.3)' }}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {(() => {
                    const entries  = commView === 'incoming' ? topIncomingOffices : topOutgoingOffices;
                    const maxCount = entries[0]?.[1] || 1;
                    const color    = commView === 'incoming' ? '#60a5fa' : '#a78bfa';
                    const label    = commView === 'incoming' ? 'Top Senders' : 'Top Recipients';
                    if (entries.length === 0) return (
                      <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                        <Building2 className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                        <p className="text-xs text-center" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>No {commView} data yet</p>
                      </div>
                    );
                    return (
                      <>
                        <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>{label}</p>
                        {entries.map(([office, count], i) => (
                          <div key={office}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black w-4 flex-shrink-0" style={{ color: `${color}80` }}>#{i+1}</span>
                              <span className="text-xs flex-1 truncate font-semibold" style={{ color: 'var(--accent-text)' }}>{office}</span>
                              <span className="text-xs font-black flex-shrink-0" style={{ color }}>{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden ml-6" style={{ background: 'rgba(0,0,0,0.25)' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${(count / maxCount) * 100}%`, background: `linear-gradient(90deg, ${color}70, ${color})` }} />
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>{/* end PAGE 1 */}

          {/* ══ PAGE 2: Track ══ */}
          <div className="flex flex-col gap-3 px-4 pb-2 overflow-hidden" style={{ width: `${100 / PAGES.length}%`, height: '100%' }}>

            <div className="flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>Document Tracking</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
                  {(() => {
                    let count = letters.length;
                    if (trackFilters.direction) count = letters.filter(l => l.document_direction === trackFilters.direction).length;
                    if (trackFilters.office) count = letters.filter(l => l.sender_office === trackFilters.office).length;
                    if (trackFilters.createdBy) count = letters.filter(l => l.created_by === trackFilters.createdBy).length;
                    if (trackFilters.month) count = letters.filter(l => new Date(l.created_at).getMonth() === parseInt(trackFilters.month)).length;
                    if (trackFilters.year) count = letters.filter(l => new Date(l.created_at).getFullYear() === parseInt(trackFilters.year)).length;
                    return count;
                  })()} documents
                </span>
              </div>
            </div>

            {/* Filters - Using FilterDropdown Component */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {/* Direction Filter */}
              <FilterDropdown
                value={trackFilters.direction}
                onChange={(v) => setTrackFilters(prev => ({ ...prev, direction: v }))}
                options={[
                  { value: '', label: 'All Directions' },
                  { value: 'receiving', label: 'Incoming' },
                  { value: 'sending', label: 'Outgoing' },
                ]}
              />

              {/* Office Filter */}
              <FilterDropdown
                value={trackFilters.office}
                onChange={(v) => setTrackFilters(prev => ({ ...prev, office: v }))}
                options={[
                  { value: '', label: 'All Offices' },
                  ...Array.from(new Set(letters.map(l => l.sender_office).filter(Boolean))).sort().map(office => ({
                    value: office!,
                    label: office!
                  }))
                ]}
              />

              {/* Created By Filter */}
              <FilterDropdown
                value={trackFilters.createdBy}
                onChange={(v) => setTrackFilters(prev => ({ ...prev, createdBy: v }))}
                options={[
                  { value: '', label: 'All Users' },
                  ...Array.from(new Set(letters.map(l => l.created_by).filter(Boolean))).sort().map(user => ({
                    value: user!,
                    label: user!
                  }))
                ]}
              />

              {/* Month Filter */}
              <FilterDropdown
                value={trackFilters.month}
                onChange={(v) => setTrackFilters(prev => ({ ...prev, month: v }))}
                options={[
                  { value: '', label: 'All Months' },
                  { value: '0', label: 'January' },
                  { value: '1', label: 'February' },
                  { value: '2', label: 'March' },
                  { value: '3', label: 'April' },
                  { value: '4', label: 'May' },
                  { value: '5', label: 'June' },
                  { value: '6', label: 'July' },
                  { value: '7', label: 'August' },
                  { value: '8', label: 'September' },
                  { value: '9', label: 'October' },
                  { value: '10', label: 'November' },
                  { value: '11', label: 'December' },
                ]}
              />

              {/* Year Filter */}
              <FilterDropdown
                value={trackFilters.year}
                onChange={(v) => setTrackFilters(prev => ({ ...prev, year: v }))}
                options={[
                  { value: '', label: 'All Years' },
                  ...Array.from(new Set(letters.map(l => new Date(l.created_at).getFullYear()))).sort((a, b) => b - a).map(year => ({
                    value: year.toString(),
                    label: year.toString()
                  }))
                ]}
              />

              {/* Clear Filters Button */}
              {(trackFilters.direction || trackFilters.office || trackFilters.createdBy || trackFilters.month || trackFilters.year) && (
                <button
                  onClick={() => setTrackFilters({ direction: '', office: '', createdBy: '', month: '', year: '' })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={{
              background: 'var(--card-bg)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(var(--accent-rgb),0.18)',
              borderRadius: '16px',
            }}>
              <div className="h-full flex flex-col">
                {/* Table Header */}
                <div className="flex items-center px-4 py-2 flex-shrink-0" style={{ 
                  borderBottom: '2px solid rgba(var(--accent-rgb),0.2)', 
                  background: 'rgba(var(--accent-rgb),0.05)' 
                }}>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 10%', minWidth: '80px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>From</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 18%', minWidth: '140px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Office</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 14%', minWidth: '110px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Doc No.</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 10%', minWidth: '80px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Type</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 10%', minWidth: '85px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Direction</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 10%', minWidth: '85px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Status</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 12%', minWidth: '90px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Date</span>
                  </div>
                  <div className="text-center flex-shrink-0" style={{ flex: '0 0 10%', minWidth: '80px' }}>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Created By</span>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    // Apply filters
                    let filteredLetters = [...letters];
                    
                    if (trackFilters.direction) {
                      filteredLetters = filteredLetters.filter(l => l.document_direction === trackFilters.direction);
                    }
                    if (trackFilters.office) {
                      filteredLetters = filteredLetters.filter(l => l.sender_office === trackFilters.office);
                    }
                    if (trackFilters.createdBy) {
                      filteredLetters = filteredLetters.filter(l => l.created_by === trackFilters.createdBy);
                    }
                    if (trackFilters.month) {
                      filteredLetters = filteredLetters.filter(l => new Date(l.created_at).getMonth() === parseInt(trackFilters.month));
                    }
                    if (trackFilters.year) {
                      filteredLetters = filteredLetters.filter(l => new Date(l.created_at).getFullYear() === parseInt(trackFilters.year));
                    }

                    filteredLetters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                    if (filteredLetters.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                          <FileText className="w-10 h-10" style={{ color: 'var(--accent)' }} />
                          <p className="text-sm" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
                            {letters.length === 0 ? 'No documents yet' : 'No documents match the filters'}
                          </p>
                        </div>
                      );
                    }

                    return filteredLetters.map((l, idx) => {
                      const done = isCompleted(l);
                      const statusColor = done ? 'var(--accent)' : '#fbbf24';
                      const directionColor = l.document_direction === 'receiving' ? '#60a5fa' : '#a78bfa';
                      const directionLabel = l.document_direction === 'receiving' ? 'Incoming' : 'Outgoing';
                      
                      // Extract last name from created_by (handle email format like "jonarleen.cabago@pto")
                      const getLastName = (fullName: string | undefined) => {
                        if (!fullName) return 'N/A';
                        
                        // Handle email-like usernames (e.g., "jonarleen.cabago@pto")
                        if (fullName.includes('@')) {
                          const beforeAt = fullName.split('@')[0];
                          const parts = beforeAt.split('.');
                          // Return the last part before @ (e.g., "cabago" from "jonarleen.cabago")
                          if (parts.length > 1) {
                            const lastName = parts[parts.length - 1];
                            return lastName.charAt(0).toUpperCase() + lastName.slice(1);
                          }
                          return beforeAt;
                        }
                        
                        // For regular names, get last word
                        const parts = fullName.trim().split(/\s+/);
                        return parts.length > 0 ? parts[parts.length - 1] : fullName;
                      };
                      
                      return (
                        <div key={l.id} className="flex items-center px-4 py-2 transition-all"
                          style={{ 
                            borderBottom: '1px solid rgba(var(--accent-rgb),0.1)', 
                            background: idx % 2 === 0 ? 'rgba(var(--accent-rgb),0.02)' : 'transparent' 
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(var(--accent-rgb),0.02)' : 'transparent'}>
                          
                          {/* From Name */}
                          <div className="min-w-0 flex-shrink-0 px-2 flex justify-center items-center" style={{ flex: '0 0 10%', minWidth: '80px' }}>
                            <p className="text-xs truncate font-medium text-center" style={{ color: 'var(--accent-text)' }}>
                              {l.sender_name || 'N/A'}
                            </p>
                          </div>

                          {/* Office */}
                          <div className="min-w-0 flex-shrink-0 px-2 flex justify-center items-center" style={{ flex: '0 0 18%', minWidth: '140px' }}>
                            <p className="text-xs truncate font-medium text-center" style={{ color: 'var(--accent-text)' }}>
                              {l.sender_office || 'N/A'}
                            </p>
                          </div>

                          {/* Document No */}
                          <div className="min-w-0 flex-shrink-0 px-2 flex justify-center items-center" style={{ flex: '0 0 14%', minWidth: '110px' }}>
                            <p className="text-xs font-bold truncate text-center" style={{ color: 'var(--accent-text)' }}>
                              {l.reference_number}
                            </p>
                          </div>

                          {/* Type */}
                          <div className="min-w-0 flex justify-center items-center flex-shrink-0 px-2" style={{ flex: '0 0 10%', minWidth: '80px' }}>
                            <span className="text-[10px] px-2.5 py-1 rounded-full capitalize inline-block font-semibold"
                              style={{ background: 'rgba(var(--accent-rgb),0.25)', color: 'var(--accent-text)', border: '1px solid rgba(var(--accent-rgb),0.4)' }}>
                              {l.document_type || 'Other'}
                            </span>
                          </div>

                          {/* Direction */}
                          <div className="min-w-0 flex justify-center items-center flex-shrink-0 px-2" style={{ flex: '0 0 10%', minWidth: '85px' }}>
                            <span className="text-[10px] px-2.5 py-1 rounded-full inline-block font-semibold"
                              style={{ background: `${directionColor}20`, color: directionColor, border: `1px solid ${directionColor}40` }}>
                              {directionLabel}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="min-w-0 flex justify-center items-center flex-shrink-0 px-2" style={{ flex: '0 0 10%', minWidth: '85px' }}>
                            <span className="text-[10px] px-2.5 py-1 rounded-full inline-block font-semibold"
                              style={{ background: done ? 'rgba(var(--accent-rgb),0.2)' : 'rgba(251,191,36,0.2)', color: statusColor, border: done ? '1px solid rgba(var(--accent-rgb),0.4)' : '1px solid rgba(251,191,36,0.4)' }}>
                              {done ? 'Completed' : 'Pending'}
                            </span>
                          </div>

                          {/* Date Created */}
                          <div className="min-w-0 flex-shrink-0 px-2 flex justify-center items-center" style={{ flex: '0 0 12%', minWidth: '90px' }}>
                            <p className="text-[10px] font-medium text-center" style={{ color: 'var(--accent-text)' }}>
                              {new Date(l.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>

                          {/* Created By - Last Name Only */}
                          <div className="min-w-0 flex-shrink-0 px-2 flex justify-center items-center" style={{ flex: '0 0 10%', minWidth: '80px' }}>
                            <p className="text-[10px] truncate font-medium text-center" style={{ color: 'var(--accent-text)' }}>
                              {getLastName(l.created_by || '')}
                            </p>
                          </div>

                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

          </div>{/* end PAGE 2 */}

        </div>{/* end slide track */}
      </div>{/* end slide container */}

    </div>
  );
}
