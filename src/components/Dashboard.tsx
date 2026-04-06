import { FileText, Clock, CheckCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface DocumentTypeCount {
  [key: string]: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    handlers: 0,
  });
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeCount>({});

  useEffect(() => {
    loadStats();
    
    // Real-time subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, () => {
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letter_handlers' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    try {
      const { data: letters } = await supabase
        .from('letters')
        .select('*, letter_handlers(*)');

      if (letters) {
        const completed = letters.filter((l: any) => l.received_at).length;
        const pending = letters.length - completed;
        
        const uniqueHandlers = new Set();
        const typeCounts: DocumentTypeCount = {};
        
        letters.forEach((letter: any) => {
          // Count document types
          const docType = letter.document_type || 'Unspecified';
          typeCounts[docType] = (typeCounts[docType] || 0) + 1;
          
          // Count handlers
          if (letter.letter_handlers) {
            letter.letter_handlers.forEach((h: any) => {
              uniqueHandlers.add(h.handler_name);
            });
          }
        });

        setStats({
          total: letters.length,
          pending,
          completed,
          handlers: uniqueHandlers.size,
        });
        setDocumentTypes(typeCounts);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const smallStatCards = [
    { label: 'Pending', value: stats.pending, icon: Clock, color: '#9CAF88' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: '#004526' },
    { label: 'Handlers', value: stats.handlers, icon: Users, color: '#9CAF88' },
  ];

  return (
    <div className="p-5">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Dashboard</h1>
        <p className="text-gray-600 text-sm mt-1">Overview of your document tracking system</p>
      </div>

      <div className="space-y-4">
        {/* Large Total Documents Card */}
        <div className="bg-white rounded-lg shadow-lg p-5 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Documents</p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#004526' }}>{stats.total}</p>
            </div>
            <div className="p-4 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
              <FileText className="w-8 h-8" style={{ color: '#004526' }} />
            </div>
          </div>
          
          {/* Document Type Breakdown */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Document Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(documentTypes).length > 0 ? (
                Object.entries(documentTypes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="rounded-lg p-3" style={{ backgroundColor: '#DFF5E1' }}>
                      <p className="text-xs font-medium" style={{ color: '#004526' }}>{type}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: '#004526' }}>{count}</p>
                    </div>
                  ))
              ) : (
                <div className="col-span-2 md:col-span-4 text-center py-3">
                  <p className="text-gray-500 text-xs">No documents yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {smallStatCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className="p-2 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
