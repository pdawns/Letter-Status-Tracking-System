import { useState, useEffect } from 'react';
import { getLetters, archiveLetter } from '../lib/api';
import { Letter } from '../types';
import { Search, FileText, Download, Eye, ArrowLeft, Filter, Info, Archive } from 'lucide-react';

interface DocumentLibraryProps {
  onDocumentSelected: (letterId: string) => void;
  onViewDocumentInfo: (letterId: string) => void;
  onBack: () => void;
}

export default function DocumentLibrary({ onDocumentSelected, onViewDocumentInfo, onBack }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<Letter[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Letter | null>(null);

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
  }, [documents, searchQuery, typeFilter, sortOrder]);

  const fetchDocuments = async () => {
    try {
      const data = await getLetters();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.document_type === typeFilter);
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
      const inlineUrl = doc.file_url.includes('/upload/')
        ? doc.file_url.replace('/upload/', '/upload/fl_inline/')
        : doc.file_url;
      window.open(inlineUrl, '_blank', 'noopener,noreferrer');
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
            <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Document Library</h1>
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
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#004526' }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">
                            {doc.reference_number}
                          </p>
                          <h3 className="font-semibold text-gray-900 break-words text-sm">
                            {doc.title}
                          </h3>
                        </div>
                      </div>
                      {doc.document_subject && (
                        <p className="text-xs text-gray-600 ml-7">{doc.document_subject}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2 ml-7">
                        <span className="inline-block text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#DFF5E1', color: '#004526' }}>
                          {doc.document_type}
                        </span>
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
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
                        className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors text-xs disabled:opacity-50"
                        title="Archive document"
                      >
                        <Archive className="w-3 h-3" />
                        <span className="hidden sm:inline">Archive</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
