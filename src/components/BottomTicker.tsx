import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { getLetters, getStatusesForLetter, getPublicLetters, getPublicStatusesForLetter, getToken } from '../lib/api';
import { Letter, LetterStatus } from '../types';

export default function BottomTicker() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, LetterStatus[]>>({});
  const [tickerTab, setTickerTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const isPublic = !getToken();
      const data = isPublic ? await getPublicLetters() : await getLetters();
      if (!Array.isArray(data)) return;
      setLetters(data);
      const fetchStatus = isPublic ? getPublicStatusesForLetter : getStatusesForLetter;
      const map: Record<string, LetterStatus[]> = {};
      await Promise.all(data.map(async (l) => { map[l.id] = await fetchStatus(l.id); }));
      setStatusMap(map);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadData();
    const refresh = setInterval(loadData, 60_000);
    return () => clearInterval(refresh);
  }, [loadData]);

  const isCompleted = (l: Letter) => {
    const s = statusMap[l.id] || [];
    const req = (l.required_statuses || 'noted,approved,reviewed').split(',').map(x => x.trim()).filter(Boolean);
    return req.every(r => s.some(x => x.status_type === r));
  };

  const getDocStatus = (l: Letter): { label: string; color: string; bg: string; border: string } => {
    const all = (statusMap[l.id] || []).map(s => s.status_type.toLowerCase().trim());
    if (all.includes('released') || all.includes('sent') || all.includes('sent/released'))
      return { label: '↑ Released',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   border: 'rgba(96,165,250,0.25)' };
    if (all.includes('returned'))
      return { label: '↩ Returned',    color: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.25)' };
    if (all.includes('noted'))
      return { label: '✓ Completed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.2)' };
    if (all.includes('reviewed') || all.includes('approved'))
      return { label: '⏳ For Approval', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)' };
    if (all.length > 0)
      return { label: '🔍 Under Review', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' };
    return { label: '• Pending',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',   border: 'rgba(148,163,184,0.2)' };
  };

  const incoming = letters.filter(l => l.document_direction === 'receiving');
  const outgoing = letters.filter(l => l.document_direction === 'sending');

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => {
        setTickerIdx(i => {
          const list = letters.filter(l =>
            tickerTab === 'incoming' ? l.document_direction === 'receiving' : l.document_direction === 'sending'
          );
          if (list.length === 0) return 0;
          const next = (i + 1) % list.length;
          if (next === 0) setTickerTab(t => t === 'incoming' ? 'outgoing' : 'incoming');
          return next;
        });
        setTickerVisible(true);
      }, 300);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tickerTab, letters]);

  if (incoming.length === 0 && outgoing.length === 0) return null;

  const list = tickerTab === 'incoming' ? incoming : outgoing;
  const doc = list[tickerIdx % (list.length || 1)];
  const tabColor = tickerTab === 'incoming' ? '#60a5fa' : '#a78bfa';
  const docStatus = doc ? getDocStatus(doc) : null;
  const total = list.length;
  const current = total > 0 ? (tickerIdx % total) + 1 : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-5"
      style={{
        height: '44px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `1px solid rgba(var(--accent-rgb), 0.15)`,
        boxShadow: '0 -2px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Tab buttons */}
      <div className="flex gap-1.5 flex-shrink-0">
        {(['incoming', 'outgoing'] as const).map(t => {
          const c = t === 'incoming' ? '#60a5fa' : '#a78bfa';
          return (
            <button
              key={t}
              onClick={() => { setTickerTab(t); setTickerIdx(0); setTickerVisible(true); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all capitalize active:scale-95"
              style={{
                background: tickerTab === t ? `${c}20` : 'transparent',
                border: tickerTab === t ? `1px solid ${c}45` : '1px solid transparent',
                color: tickerTab === t ? c : 'rgba(223,245,225,0.3)',
              }}
            >
              {t === 'incoming'
                ? <ArrowDownToLine className="w-2.5 h-2.5" />
                : <ArrowUpFromLine className="w-2.5 h-2.5" />}
              {t}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(var(--accent-rgb), 0.18)' }} />

      {/* Document info — fades in/out */}
      {doc ? (
        <div
          className="flex items-center gap-3 flex-1 min-w-0"
          style={{
            opacity: tickerVisible ? 1 : 0,
            transform: tickerVisible ? 'translateY(0)' : 'translateY(3px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          <div className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: `${tabColor}15` }}>
            {tickerTab === 'incoming'
              ? <ArrowDownToLine className="w-3 h-3" style={{ color: '#60a5fa' }} />
              : <ArrowUpFromLine className="w-3 h-3" style={{ color: '#a78bfa' }} />}
          </div>
          <span className="text-xs font-bold flex-shrink-0" style={{ color: tabColor }}>
            {doc.reference_number}
          </span>
          {doc.document_type && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0"
              style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}
            >
              {doc.document_type}
            </span>
          )}
          <span className="text-xs truncate" style={{ color: 'rgba(223,245,225,0.6)' }}>
            {doc.title}
          </span>
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-auto"
            style={docStatus
              ? { background: docStatus.bg, color: docStatus.color, border: `1px solid ${docStatus.border}` }
              : {}}
          >
            {docStatus?.label}
          </span>
        </div>
      ) : (
        <p className="text-xs flex-1" style={{ color: 'rgba(156,175,136,0.4)' }}>
          No {tickerTab} documents
        </p>
      )}

      {/* Counter */}
      <span className="text-[9px] font-mono flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb), 0.3)' }}>
        {current} / {total}
      </span>
    </div>
  );
}
