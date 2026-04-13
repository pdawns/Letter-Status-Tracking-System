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

  return (
    <>
    <div className="p-5">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#004526' }}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6" style={{ color: '#004526' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Archive</h1>
          </div>

          {/* Filters */}
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
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
                <option value="all">All Types</option>
                <option value="letter">Letters</option>
                <option value="certificate">Certificates</option>
                <option value="memo">Memos</option>
                <option value="report">Reports</option>
                <option value="disbursement_voucher">Disbursement Voucher</option>
                <option value="other">Other</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'archived_at' | 'created_at')} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
                <option value="archived_at">Sort by Archived Date</option>
                <option value="created_at">Sort by Created Date</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#004526' }}></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">{documents.length === 0 ? 'No archived documents' : 'No documents match your search'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <FileText className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">{doc.reference_number}</p>
                          <h3 className="font-semibold text-gray-700 break-words text-sm">{doc.title}</h3>
                        </div>
                      </div>
                      {doc.document_subject && (
                        <p className="text-xs text-gray-500 ml-7">{doc.document_subject}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2 ml-7">
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">{doc.document_type}</span>
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                          Created: {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        {doc.archived_at && (
                          <span className="inline-block text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
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
                        style={{ backgroundColor: '#004526' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                        title="Track document"
                      >
                        <Search className="w-3 h-3" />
                        <span className="hidden sm:inline">Track</span>
                      </button>
                      <button
                        onClick={() => setConfirmRestore(doc)}
                        className="flex items-center gap-1 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                        style={{ backgroundColor: '#9CAF88' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
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

          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
            {filtered.length} of {documents.length} archived document(s)
          </div>
        </div>
      </div>
    </div>

    {confirmRestore && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Restore Document</h2>
          <p className="text-gray-600 mb-1">Are you sure you want to restore:</p>
          <p className="font-semibold text-gray-900 mb-4">"{confirmRestore.title}"</p>
          <p className="text-sm text-green-600 mb-6">This will move it back to the Document Library.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmRestore(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleUnarchive} className="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: '#004526' }}>Yes, Restore</button>
          </div>
        </div>
      </div>
    )}

    {confirmDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Permanently Delete</h2>
          <p className="text-gray-600 mb-1">Are you sure you want to permanently delete:</p>
          <p className="font-semibold text-gray-900 mb-4">"{confirmDelete.title}"</p>
          <p className="text-sm text-red-600 mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteConfirmed} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, Delete</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
