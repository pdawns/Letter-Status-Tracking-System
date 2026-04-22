import { FileText, Clock, CheckCircle, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CalendarDays, ChevronDown, UserCheck } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getLetters, getStatusesForLetter } from '../lib/api';
import { Letter, LetterStatus } from '../types';

interface DashboardProps {
  onStatusFilter?: (filter: 'pending' | 'completed') => void;
}

type RecentView = 'incoming' | 'outgoing';
type StatusView = 'pending' | 'completed';

const TYPE_COLORS = ['#60a5fa', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#9CAF88', '#fb923c'];

const SIR_LINMARK = 'Linmark G. Benlot';
const SIR_RONALD  = 'RONALD JAME D. VIOLON';

export default function Dashboard({ onStatusFilter }: DashboardProps) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, LetterStatus[]>>({});
  const [loading, setLoading] = useState(true);
  const [recentView, setRecentView] = useState<RecentView>('incoming');
  const [statusView, setStatusView] = useState<StatusView>('pending');
  const [overdueOpen, setOverdueOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getLetters();
      setLetters(data);
      const map: Record<string, LetterStatus[]> = {};
      await Promise.all(data.map(async (l) => { map[l.id] = await getStatusesForLetter(l.id); }));
      setStatusMap(map);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isCompleted = (l: Letter) => {
    const s = statusMap[l.id] || [];
    const req = (l.required_statuses || 'noted,approved,reviewed').split(',').map(x => x.trim()).filter(Boolean);
    return req.every(r => s.some(x => x.status_type === r));
  };

  // What's missing for a letter
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

  // What's done for a letter
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
  const isRecent = (l: Letter) => new Date(l.created_at).getTime() >= oneWeekAgo;

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

  const maxTypeCount = typeEntries[0]?.[1] || 1;

  const today = new Date().toDateString();
  const todayCount = letters.filter(l => new Date(l.created_at).toDateString() === today).length;
  const completionPct = letters.length ? Math.round((completed.length / letters.length) * 100) : 0;

  const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'rgba(0,45,20,0.45)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(156,175,136,0.18)',
    borderRadius: '16px',
    ...extra,
  });

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 mx-auto" style={{ borderColor: '#9CAF88' }} />
        <p className="mt-2 text-xs" style={{ color: 'rgba(156,175,136,0.7)' }}>Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-3 pb-2 flex flex-col gap-3" style={{ height: 'calc(100vh - 140px)', overflow: 'hidden' }}>

      {/* ── ROW 1: Stat cards only (no title) ── */}
      <div className="flex gap-2 flex-shrink-0">
        {[
          { label: 'Total',     value: letters.length,   sub: `${todayCount} today`,     color: '#DFF5E1', bg: 'rgba(223,245,225,0.07)', bdr: 'rgba(223,245,225,0.14)', Icon: FileText },
          { label: 'Pending',   value: pending.length,   sub: 'awaiting action',          color: '#fbbf24', bg: 'rgba(251,191,36,0.07)',  bdr: 'rgba(251,191,36,0.22)',  Icon: Clock,          click: () => onStatusFilter?.('pending') },
          { label: 'Completed', value: completed.length, sub: `${completionPct}% done`,   color: '#34d399', bg: 'rgba(52,211,153,0.07)',  bdr: 'rgba(52,211,153,0.22)',  Icon: CheckCircle,    click: () => onStatusFilter?.('completed') },
          { label: 'Incoming',  value: incoming.length,  sub: 'received',                 color: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  bdr: 'rgba(96,165,250,0.22)',  Icon: ArrowDownToLine },
          { label: 'Outgoing',  value: outgoing.length,  sub: 'sent out',                 color: '#a78bfa', bg: 'rgba(167,139,250,0.07)', bdr: 'rgba(167,139,250,0.22)', Icon: ArrowUpFromLine },
          { label: 'Overdue',   value: overdue.length,   sub: 'over 3 days',              color: overdue.length > 0 ? '#f87171' : '#34d399', bg: overdue.length > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(52,211,153,0.07)', bdr: overdue.length > 0 ? 'rgba(239,68,68,0.22)' : 'rgba(52,211,153,0.22)', Icon: AlertTriangle },
        ].map(({ label, value, sub, color, bg, bdr, Icon, click }) => (
          <button key={label} onClick={click}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 active:scale-95 flex-1"
            style={{ background: bg, backdropFilter: 'blur(20px)', border: `1px solid ${bdr}`, cursor: click ? 'pointer' : 'default' }}
            onMouseEnter={(e) => click && ((e.currentTarget as HTMLButtonElement).style.borderColor = `${color}55`)}
            onMouseLeave={(e) => click && ((e.currentTarget as HTMLButtonElement).style.borderColor = bdr)}>
            <div className="p-2 rounded-xl flex-shrink-0" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'rgba(223,245,225,0.5)' }}>{label}</p>
              <p className="text-[9px] mt-0.5 truncate" style={{ color: 'rgba(156,175,136,0.45)' }}>{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── ROW 2: 4 equal columns ── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── COL 1: Recent (Incoming / Outgoing) ── */}
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{ ...glass(), flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(156,175,136,0.1)' }}>
            <CalendarDays className="w-3.5 h-3.5" style={{ color: 'rgba(156,175,136,0.55)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(156,175,136,0.55)' }}>Recent · 7 days</span>
            <div className="flex gap-1.5 ml-2">
              {(['incoming', 'outgoing'] as RecentView[]).map(v => {
                const color = v === 'incoming' ? '#60a5fa' : '#a78bfa';
                return (
                  <button key={v} onClick={() => setRecentView(v)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 capitalize"
                    style={{
                      background: recentView === v ? `${color}20` : 'rgba(0,0,0,0.2)',
                      border: recentView === v ? `1px solid ${color}50` : '1px solid rgba(156,175,136,0.1)',
                      color: recentView === v ? color : 'rgba(223,245,225,0.35)',
                    }}>
                    {v} ({recentLists[v].length})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {recentLists[recentView].length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <FileText className="w-9 h-9" style={{ color: '#9CAF88' }} />
                <p className="text-sm" style={{ color: 'rgba(156,175,136,0.7)' }}>No {recentView} docs in the last 7 days</p>
              </div>
            ) : recentLists[recentView].map(l => {
              const done = isCompleted(l);
              const daysAgo = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
              const vColor = recentView === 'incoming' ? '#60a5fa' : '#a78bfa';
              return (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(0,0,0,0.22)', border: `1px solid ${vColor}18` }}>
                  {/* Direction icon */}
                  <div className="flex-shrink-0 p-2.5 rounded-xl" style={{ background: `${vColor}15`, border: `1px solid ${vColor}30` }}>
                    {recentView === 'incoming'
                      ? <ArrowDownToLine className="w-4 h-4" style={{ color: '#60a5fa' }} />
                      : <ArrowUpFromLine className="w-4 h-4" style={{ color: '#a78bfa' }} />}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-tight" style={{ color: '#DFF5E1' }}>{l.reference_number}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(223,245,225,0.55)' }}>{l.title}</p>
                    {l.document_type && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full capitalize mt-1"
                        style={{ background: 'rgba(156,175,136,0.12)', color: '#9CAF88', border: '1px solid rgba(156,175,136,0.2)' }}>
                        {l.document_type}
                      </span>
                    )}
                  </div>
                  {/* Status + date stacked */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={done
                        ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
                        : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      {done ? '✓ Done' : '⏳ Pending'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'rgba(156,175,136,0.45)' }}>
                      {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COL 2: Status Tracker ── */}
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{ ...glass(), flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(156,175,136,0.1)' }}>
            <UserCheck className="w-3.5 h-3.5" style={{ color: 'rgba(156,175,136,0.55)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(156,175,136,0.55)' }}>Status Tracker</span>
            <div className="flex gap-1.5 ml-2">
              {(['pending', 'completed'] as StatusView[]).map(v => {
                const color = v === 'pending' ? '#fbbf24' : '#34d399';
                const list = v === 'pending' ? pending : completed;
                return (
                  <button key={v} onClick={() => setStatusView(v)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 capitalize"
                    style={{
                      background: statusView === v ? `${color}20` : 'rgba(0,0,0,0.2)',
                      border: statusView === v ? `1px solid ${color}50` : '1px solid rgba(156,175,136,0.1)',
                      color: statusView === v ? color : 'rgba(223,245,225,0.35)',
                    }}>
                    {v} ({list.length})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {(statusView === 'pending' ? pending : completed).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <CheckCircle className="w-8 h-8" style={{ color: '#9CAF88' }} />
                <p className="text-xs" style={{ color: 'rgba(156,175,136,0.7)' }}>No {statusView} documents</p>
              </div>
            ) : (statusView === 'pending' ? pending : completed).map(l => {
              const missing = getMissing(l);
              const done = getDone(l);
              const daysAgo = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
              const isOver = daysAgo >= 3;
              return (
                <div key={l.id} className="px-3 py-2.5 rounded-xl"
                  style={{
                    background: isOver && statusView === 'pending' ? 'rgba(239,68,68,0.07)' : 'rgba(0,0,0,0.2)',
                    border: isOver && statusView === 'pending' ? '1px solid rgba(239,68,68,0.18)' : '1px solid rgba(156,175,136,0.08)',
                  }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold" style={{ color: isOver && statusView === 'pending' ? '#fca5a5' : '#DFF5E1' }}>{l.reference_number}</p>
                        {isOver && statusView === 'pending' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                            {daysAgo}d overdue
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(223,245,225,0.45)' }}>{l.title}</p>
                    </div>
                    {l.document_type && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0"
                        style={{ background: 'rgba(156,175,136,0.1)', color: '#9CAF88', border: '1px solid rgba(156,175,136,0.18)' }}>
                        {l.document_type}
                      </span>
                    )}
                  </div>
                  {/* Missing actions */}
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
                  {/* Done actions */}
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

        {/* ── COL 3: Doc Types ── */}
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{ ...glass(), flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(156,175,136,0.1)' }}>
            <FileText className="w-3.5 h-3.5" style={{ color: '#9CAF88' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(156,175,136,0.7)' }}>Doc Types</span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(156,175,136,0.12)', color: '#9CAF88', border: '1px solid rgba(156,175,136,0.2)' }}>
              {letters.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {typeEntries.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'rgba(156,175,136,0.4)' }}>No documents yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {typeEntries.map(([type, count], i) => {
                  const color = TYPE_COLORS[i % TYPE_COLORS.length];
                  return (
                    <div key={type} className="flex flex-col items-center justify-center py-3 px-2 rounded-xl text-center"
                      style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
                      <span className="text-2xl font-black leading-none" style={{ color }}>{count}</span>
                      <span className="text-[10px] font-medium capitalize mt-1.5 leading-tight" style={{ color: 'rgba(223,245,225,0.75)' }}>{type}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── COL 4: Overdue Alert ── */}
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{
          flex: 1,
          minWidth: 0,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: overdue.length > 0 ? 'rgba(50,8,8,0.55)' : 'rgba(0,45,20,0.45)',
          border: overdue.length > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(52,211,153,0.2)',
          borderRadius: '16px',
        }}>
          <button
            onClick={() => overdue.length > 0 && setOverdueOpen(v => !v)}
            className="flex flex-col items-center justify-center gap-2.5 w-full transition-all flex-shrink-0"
            style={{
              padding: overdueOpen ? '14px 16px 12px' : '0',
              flex: overdueOpen ? '0 0 auto' : '1',
              borderBottom: overdueOpen ? '1px solid rgba(239,68,68,0.18)' : 'none',
              cursor: overdue.length > 0 ? 'pointer' : 'default',
            }}>
            {overdue.length > 0 ? (
              <>
                {!overdueOpen && (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute rounded-full animate-ping"
                      style={{ width: '68px', height: '68px', background: 'rgba(239,68,68,0.12)' }} />
                    <div className="relative flex items-center justify-center rounded-full"
                      style={{ width: '60px', height: '60px', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.35)' }}>
                      <span className="font-black" style={{ color: '#f87171', fontSize: '30px', lineHeight: 1 }}>!</span>
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-base font-bold" style={{ color: '#fca5a5' }}>{overdue.length} Overdue</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(252,165,165,0.5)' }}>
                    {overdueOpen ? 'tap to collapse' : 'over 3 days · tap to view'}
                  </p>
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
                  <div key={l.id} className="p-3 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
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

    </div>
  );
}
