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

  // Refresh every time the component mounts or becomes active
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
      // Load statuses to determine completed/pending
      const statusResults = await Promise.all(data.map((l) => getStatusesForLetter(l.id)));
      const ids = new Set<string>();
      data.forEach((l, i) => {
        const s = statusResults[i];
        const hasReview = s.some(x => x.status_type === 'for review' || x.status_type === 'reviewed');
        const hasApproval = s.some(x => x.status_type === 'for approval' || x.status_type === 'approved');
        // Completed = both review and approval done
        if (hasReview && hasApproval) ids.add(l.id);
        // Fallback for old docs: if they have any status and no review/approval required
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

  return (
    <>
    <div className="p-5">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
          style={{ color: '#004526' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="bg-white rounded-lg shadow-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6" style={{ color: '#004526' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>
              {localStatusFilter === 'pending' ? 'Pending Documents' : localStatusFilter === 'completed' ? 'Completed Documents' : 'Document Library'}
            </h1>
          </div>

          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, title, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              >
                <option value="all">All Documents</option>
                <option value="letter">Letters</option>
                <option value="certificate">Certificates</option>
                <option value="memo">Memos</option>
                <option value="report">Reports</option>
                <option value="disbursement_voucher">Disbursement Voucher</option>
                <option value="other">Other</option>
              </select>
              <select
                value={localStatusFilter}
                onChange={(e) => setLocalStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={transmittalFilter}
                onChange={(e) => setTransmittalFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              >
                <option value="all">All Transmittal</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#004526' }}></div>
              <p className="mt-3 text-gray-600 text-sm">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">
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
                  className="rounded-xl border bg-white hover:shadow-lg transition-all duration-200"
                  style={{ borderColor, borderLeftWidth: '4px' }}
                >
                  <div className="p-4">
                    {/* Top row: transmittal badge + ref number + date */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isReceiving && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#DFF5E1', color: '#4a7c59', border: '1px solid #9CAF88' }}>
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
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                            <FileText className="w-3 h-3" />
                            No Direction
                          </span>
                        )}
                        <span className="text-xs text-gray-700 font-mono font-semibold">Ref No.: {doc.reference_number}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Title + subject */}
                    <h3 className="font-bold text-gray-800 text-sm leading-snug mb-0.5">{doc.title}</h3>
                    {doc.document_subject && (
                      <p className="text-xs text-gray-500 mb-2">{doc.document_subject}</p>
                    )}

                    {/* Bottom row: type pill + status + actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full capitalize" style={{ backgroundColor: '#DFF5E1', color: '#004526' }}>
                          {doc.document_type}
                        </span>
                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
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

          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
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
        <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ backgroundColor: '#004526' }}>
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
                <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#004526' }} />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <ol className="relative border-l-2 border-gray-200 ml-3 space-y-5">
                {activityLogs.map((log) => (
                  <li key={log.id} className="ml-5">
                    <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-white border-2" style={{ borderColor: '#004526' }} />
                    <p className="text-sm font-medium text-gray-800">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
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
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Archive Document</h2>
          <p className="text-gray-600 mb-1">Are you sure you want to archive:</p>
          <p className="font-semibold text-gray-900 mb-4">"{confirmArchive.title}"</p>
          <p className="text-sm text-yellow-600 mb-6">The document will be moved to the Archive page.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmArchive(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleArchiveConfirmed} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">Yes, Archive</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
