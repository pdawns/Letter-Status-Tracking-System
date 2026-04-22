import { useState, useEffect } from 'react';
import { getArchivedLetters, unarchiveLetter, deleteLetter } from '../lib/api';
import { Letter } from '../types';
import { Search, FileText, Eye, ArrowLeft, Filter, ArchiveRestore, Trash2 } from 'lucide-react';

interface ArchiveProps {
  onBack: () => void;
  onDocumentSelected: (letterId: string) => void;
}

export default function Archive({ onBack, onDocumentSelected }: ArchiveProps) {
  const [documents, setDocuments] = useState<Letter[]>([]);
  const [filtered, setFiltered] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'archived_at' | 'created_at'>('archived_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [confirmDelete, setConfirmDelete] = useState<Letter | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Letter | null>(null);

  useEffect(() => { fetchDocs(); }, []);

  useEffect(() => { applyFilters(); }, [documents, searchQuery, typeFilter, sortBy, sortOrder]);

  const fetchDocs = async () => {
    const data = await getArchivedLetters();
    setDocuments(data);
    setLoading(false);
  };

  const applyFilters = () => {
    let result = [...documents];

    if (typeFilter !== 'all') result = result.filter((d) => d.document_type === typeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.reference_number.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.document_subject?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date((sortBy === 'archived_at' ? a.archived_at : a.created_at) || a.created_at).getTime();
      const dateB = new Date((sortBy === 'archived_at' ? b.archived_at : b.created_at) || b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFiltered(result);
  };

  const handleUnarchive = async () => {
    if (!confirmRestore) return;
    await unarchiveLetter(confirmRestore.id);
    setConfirmRestore(null);
    fetchDocs();
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    await deleteLetter(confirmDelete.id);
    setConfirmDelete(null);
    fetchDocs();
  };

  const viewDocument = (doc: Letter) => {
    if (!doc.file_url) return;
    const isOffice = doc.file_url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
    if (isOffice) {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=false`, '_blank');
    } else {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const glassInputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid rgba(var(--accent-rgb),0.2)',
    color: 'var(--accent-text)',
  };

  return (
    <>
    <div className="p-5">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px var(--input-bg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>Archive</h1>
          </div>

          {/* Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'rgba(var(--accent-rgb),0.5)' }} />
              <input
                type="text"
                placeholder="Search by reference, title, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'rgba(var(--accent-rgb),0.8)' }} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }}>
                <option value="all" style={{ background: '#002814' }}>All Types</option>
                <option value="letter" style={{ background: '#002814' }}>Letters</option>
                <option value="certificate" style={{ background: '#002814' }}>Certificates</option>
                <option value="memo" style={{ background: '#002814' }}>Memos</option>
                <option value="report" style={{ background: '#002814' }}>Reports</option>
                <option value="disbursement_voucher" style={{ background: '#002814' }}>Disbursement Voucher</option>
                <option value="other" style={{ background: '#002814' }}>Other</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'archived_at' | 'created_at')} className="px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }}>
                <option value="archived_at" style={{ background: '#002814' }}>Sort by Archived Date</option>
                <option value="created_at" style={{ background: '#002814' }}>Sort by Created Date</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }}>
                <option value="desc" style={{ background: '#002814' }}>Newest First</option>
                <option value="asc" style={{ background: '#002814' }}>Oldest First</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(var(--accent-rgb),0.3)' }} />
              <p style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>{documents.length === 0 ? 'No archived documents' : 'No documents match your search'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((doc) => (
                <div key={doc.id} className="rounded-xl p-3 hover:shadow-md transition-shadow" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(var(--accent-rgb),0.15)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgba(var(--accent-rgb),0.5)' }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>{doc.reference_number}</p>
                          <h3 className="font-semibold break-words text-sm" style={{ color: 'var(--accent-text)' }}>{doc.title}</h3>
                        </div>
                      </div>
                      {doc.document_subject && (
                        <p className="text-xs ml-7" style={{ color: 'rgba(var(--accent-text-rgb),0.55)' }}>{doc.document_subject}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2 ml-7">
                        <span className="inline-block text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}>{doc.document_type}</span>
                        <span className="inline-block text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(var(--accent-rgb),0.7)' }}>
                          Created: {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        {doc.archived_at && (
                          <span className="inline-block text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.12)', color: '#fcd34d' }}>
                            Archived: {new Date(doc.archived_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <button
                          onClick={() => viewDocument(doc)}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-xs"
                          title="View file"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      )}
                      <button
                        onClick={() => onDocumentSelected(doc.id)}
                        className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                        style={{ backgroundColor: 'var(--primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                        title="Track document"
                      >
                        <Search className="w-3 h-3" />
                        <span className="hidden sm:inline">Track</span>
                      </button>
                      <button
                        onClick={() => setConfirmRestore(doc)}
                        className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                        style={{ backgroundColor: 'var(--accent)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                        title="Restore document"
                      >
                        <ArchiveRestore className="w-3 h-3" />
                        <span className="hidden sm:inline">Restore</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(doc)}
                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 text-xs" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)', color: 'rgba(var(--accent-rgb),0.7)' }}>
            {filtered.length} of {documents.length} archived document(s)
          </div>
        </div>
      </div>
    </div>

    {confirmRestore && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-text)' }}>Restore Document</h2>
          <p className="mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>Are you sure you want to restore:</p>
          <p className="font-semibold mb-4" style={{ color: 'var(--accent-text)' }}>"{confirmRestore.title}"</p>
          <p className="text-sm mb-6" style={{ color: 'var(--accent)' }}>This will move it back to the Document Library.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmRestore(null)} className="flex-1 px-4 py-2 rounded-lg transition-colors" style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.65)' }}>Cancel</button>
            <button onClick={handleUnarchive} className="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary)' }}>Yes, Restore</button>
          </div>
        </div>
      </div>
    )}

    {confirmDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-text)' }}>Permanently Delete</h2>
          <p className="mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>Are you sure you want to permanently delete:</p>
          <p className="font-semibold mb-4" style={{ color: 'var(--accent-text)' }}>"{confirmDelete.title}"</p>
          <p className="text-sm mb-6" style={{ color: '#fca5a5' }}>This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 rounded-lg transition-colors" style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.65)' }}>Cancel</button>
            <button onClick={handleDeleteConfirmed} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, Delete</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
