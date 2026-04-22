import { useState, useEffect } from 'react';
import { getLetters, archiveLetter, getStatusesForLetter, getActivityLogs, ActivityLog } from '../lib/api';
import { Letter } from '../types';
import { Search, FileText, Download, Eye, ArrowLeft, Filter, Info, Archive, ClipboardList, X, ArrowDownToLine, ArrowUpFromLine, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface DocumentLibraryProps {
  onDocumentSelected: (letterId: string) => void;
  onViewDocumentInfo: (letterId: string) => void;
  onBack: () => void;
  statusFilter?: 'pending' | 'completed';
}

export default function DocumentLibrary({ onDocumentSelected, onViewDocumentInfo, onBack, statusFilter }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<Letter[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Letter | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [localStatusFilter, setLocalStatusFilter] = useState<string>(statusFilter ?? 'all');
  const [transmittalFilter, setTransmittalFilter] = useState<string>('all');
  const [activityDoc, setActivityDoc] = useState<Letter | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    fetchDocuments();
    const handleFocus = () => fetchDocuments();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, typeFilter, sortOrder, completedIds, localStatusFilter, transmittalFilter]);

  const fetchDocuments = async () => {
    try {
      const data = await getLetters();
      setDocuments(data);
      const statusResults = await Promise.all(data.map((l) => getStatusesForLetter(l.id)));
      const ids = new Set<string>();
      data.forEach((l, i) => {
        const s = statusResults[i];
        const hasReview = s.some(x => x.status_type === 'for review' || x.status_type === 'reviewed');
        const hasApproval = s.some(x => x.status_type === 'for approval' || x.status_type === 'approved');
        if (hasReview && hasApproval) ids.add(l.id);
        else if (s.length > 0 && !hasReview && !hasApproval) ids.add(l.id);
      });
      setCompletedIds(ids);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (localStatusFilter === 'completed') {
      filtered = filtered.filter((doc) => completedIds.has(doc.id));
    } else if (localStatusFilter === 'pending') {
      filtered = filtered.filter((doc) => !completedIds.has(doc.id));
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.document_type === typeFilter);
    }

    if (transmittalFilter === 'incoming') {
      filtered = filtered.filter((doc) => doc.document_direction === 'receiving');
    } else if (transmittalFilter === 'outgoing') {
      filtered = filtered.filter((doc) => doc.document_direction === 'sending');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.reference_number.toLowerCase().includes(query) ||
          doc.title.toLowerCase().includes(query) ||
          doc.document_subject?.toLowerCase().includes(query) ||
          doc.document_type?.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }));
  };

  const viewDocument = (doc: Letter) => {
    if (!doc.file_url) return;
    const isOfficeFile = doc.file_url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
    if (isOfficeFile) {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=false`, '_blank');
    } else {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const openActivityLog = async (doc: Letter) => {
    setActivityDoc(doc);
    setActivityLogs([]);
    setActivityLoading(true);
    try {
      const logs = await getActivityLogs(doc.id);
      setActivityLogs(logs);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleArchiveConfirmed = async () => {
    if (!confirmArchive) return;
    setArchivingId(confirmArchive.id);
    setConfirmArchive(null);
    try {
      await archiveLetter(confirmArchive.id);
      setDocuments((prev) => prev.filter((d) => d.id !== confirmArchive.id));
    } catch (err) {
      console.error('Error archiving document:', err);
    } finally {
      setArchivingId(null);
    }
  };

  const glassInputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(156,175,136,0.2)',
    color: '#DFF5E1',
  };

  return (
    <>
    <div className="p-5">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
          style={{ color: '#9CAF88' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="rounded-2xl p-5" style={{ background: 'rgba(0, 45, 20, 0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6" style={{ color: '#9CAF88' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#DFF5E1' }}>
              {localStatusFilter === 'pending' ? 'Pending Documents' : localStatusFilter === 'completed' ? 'Completed Documents' : 'Document Library'}
            </h1>
          </div>

          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'rgba(156,175,136,0.5)' }} />
              <input
                type="text"
                placeholder="Search by reference, title, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'rgba(156,175,136,0.8)' }} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...glassInputStyle }}
              >
                <option value="all" style={{ background: '#002814' }}>All Documents</option>
                <option value="letter" style={{ background: '#002814' }}>Letters</option>
                <option value="certificate" style={{ background: '#002814' }}>Certificates</option>
                <option value="memo" style={{ background: '#002814' }}>Memos</option>
                <option value="report" style={{ background: '#002814' }}>Reports</option>
                <option value="disbursement_voucher" style={{ background: '#002814' }}>Disbursement Voucher</option>
                <option value="other" style={{ background: '#002814' }}>Other</option>
              </select>
              <select
                value={localStatusFilter}
                onChange={(e) => setLocalStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...glassInputStyle }}
              >
                <option value="all" style={{ background: '#002814' }}>All Status</option>
                <option value="pending" style={{ background: '#002814' }}>Pending</option>
                <option value="completed" style={{ background: '#002814' }}>Completed</option>
              </select>
              <select
                value={transmittalFilter}
                onChange={(e) => setTransmittalFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...glassInputStyle }}
              >
                <option value="all" style={{ background: '#002814' }}>All Transmittal</option>
                <option value="incoming" style={{ background: '#002814' }}>Incoming</option>
                <option value="outgoing" style={{ background: '#002814' }}>Outgoing</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...glassInputStyle }}
              >
                <option value="desc" style={{ background: '#002814' }}>Newest First</option>
                <option value="asc" style={{ background: '#002814' }}>Oldest First</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#9CAF88' }}></div>
              <p className="mt-3 text-sm" style={{ color: 'rgba(156,175,136,0.8)' }}>Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(156,175,136,0.3)' }} />
              <p style={{ color: 'rgba(223,245,225,0.6)' }}>
                {documents.length === 0 ? 'No documents yet' : 'No documents match your search'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const isCompleted = completedIds.has(doc.id);
                const isReceiving = doc.document_direction === 'receiving';
                const isSending = doc.document_direction === 'sending';
                const borderColor = isReceiving ? '#9CAF88' : isSending ? '#004526' : '#e5e7eb';
                return (
                <div
                  key={doc.id}
                  className="rounded-xl hover:shadow-lg transition-all duration-200"
                  style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid rgba(156,175,136,0.15)`, borderLeftWidth: '4px', borderLeftColor: borderColor }}
                >
                  <div className="p-4">
                    {/* Top row: transmittal badge + ref number + date */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isReceiving && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(156,175,136,0.15)', color: '#9CAF88', border: '1px solid rgba(156,175,136,0.25)' }}>
                            <ArrowDownToLine className="w-3 h-3" />
                            Incoming
                          </span>
                        )}
                        {isSending && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: '#004526', border: '1px solid #004526' }}>
                            <ArrowUpFromLine className="w-3 h-3" />
                            Outgoing
                          </span>
                        )}
                        {!isReceiving && !isSending && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(156,175,136,0.6)', border: '1px solid rgba(156,175,136,0.15)' }}>
                            <FileText className="w-3 h-3" />
                            No Direction
                          </span>
                        )}
                        <span className="text-xs font-mono font-semibold" style={{ color: 'rgba(223,245,225,0.8)' }}>Ref No.: {doc.reference_number}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(156,175,136,0.6)' }}>
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Title + subject */}
                    <h3 className="font-bold text-sm leading-snug mb-0.5" style={{ color: '#DFF5E1' }}>{doc.title}</h3>
                    {doc.document_subject && (
                      <p className="text-xs mb-2" style={{ color: 'rgba(223,245,225,0.55)' }}>{doc.document_subject}</p>
                    )}

                    {/* Bottom row: type pill + status + actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full capitalize" style={{ background: 'rgba(156,175,136,0.15)', color: '#9CAF88', border: '1px solid rgba(156,175,136,0.25)' }}>
                          {doc.document_type}
                        </span>
                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => openActivityLog(doc)}
                          className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                          style={{ backgroundColor: '#6366f1' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                          title="View activity log"
                        >
                          <ClipboardList className="w-3 h-3" />
                          <span className="hidden sm:inline">Log</span>
                        </button>
                        <button
                          onClick={() => onViewDocumentInfo(doc.id)}
                          className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                          style={{ backgroundColor: '#9CAF88' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                          title="View document info"
                        >
                          <Info className="w-3 h-3" />
                          <span className="hidden sm:inline">Info</span>
                        </button>
                        {doc.file_url && (
                          <button
                            onClick={() => viewDocument(doc)}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-xs"
                            title="View document"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        )}
                        <button
                          onClick={() => onDocumentSelected(doc.id)}
                          className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                          style={{ backgroundColor: '#004526' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                          title="Track document"
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden sm:inline">Track</span>
                        </button>
                        <button
                          onClick={() => setConfirmArchive(doc)}
                          disabled={archivingId === doc.id}
                          className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors text-xs disabled:opacity-50"
                          title="Archive document"
                        >
                          <Archive className="w-3 h-3" />
                          <span className="hidden sm:inline">Archive</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 text-xs" style={{ borderTop: '1px solid rgba(156,175,136,0.15)', color: 'rgba(156,175,136,0.7)' }}>
            <p>
              {filteredDocuments.length} of {documents.length} document(s)
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Activity Log Drawer */}
    {activityDoc && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setActivityDoc(null)} />
        <div
          className="relative w-full max-w-md h-full flex flex-col"
          style={{ background: 'rgba(0,40,18,0.92)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderLeft: '1px solid rgba(156,175,136,0.2)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#004526', borderBottom: '1px solid rgba(156,175,136,0.2)' }}>
            <div className="flex items-center gap-2 text-white">
              <ClipboardList className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Activity Log</p>
                <p className="text-xs opacity-75 truncate max-w-[220px]">{activityDoc.reference_number} — {activityDoc.title}</p>
              </div>
            </div>
            <button onClick={() => setActivityDoc(null)} className="text-white hover:opacity-75">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activityLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#9CAF88' }} />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(156,175,136,0.3)' }} />
                <p className="text-sm" style={{ color: 'rgba(223,245,225,0.5)' }}>No activity recorded yet</p>
              </div>
            ) : (
              <ol className="relative ml-3 space-y-5" style={{ borderLeft: '2px solid rgba(156,175,136,0.2)' }}>
                {activityLogs.map((log) => (
                  <li key={log.id} className="ml-5">
                    <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full" style={{ background: 'rgba(0,40,18,0.92)', border: '2px solid #9CAF88' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgba(223,245,225,0.85)' }}>{log.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(156,175,136,0.6)' }}>
                      by {log.performed_by} · {new Date(log.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    )}

    {confirmArchive && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'rgba(0, 40, 18, 0.88)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#DFF5E1' }}>Archive Document</h2>
          <p className="mb-1" style={{ color: 'rgba(223,245,225,0.65)' }}>Are you sure you want to archive:</p>
          <p className="font-semibold mb-4" style={{ color: '#DFF5E1' }}>"{confirmArchive.title}"</p>
          <p className="text-sm mb-6" style={{ color: '#fcd34d' }}>The document will be moved to the Archive page.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmArchive(null)} className="flex-1 px-4 py-2 rounded-lg transition-colors" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: 'rgba(223,245,225,0.65)' }}>Cancel</button>
            <button onClick={handleArchiveConfirmed} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">Yes, Archive</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
