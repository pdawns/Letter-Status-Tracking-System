import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Letter } from '../types';
import { FileText, User, Eye } from 'lucide-react';

interface TrackLetterProps {
  letterId: string;
  onHandlerSelected: () => void;
  onReceiverSelected: () => void;
}

export default function TrackLetter({
  letterId,
  onHandlerSelected,
  onReceiverSelected,
}: TrackLetterProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLetter();
  }, [letterId]);

  const fetchLetter = async () => {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;
      setLetter(data);
    } catch (err) {
      console.error('Error fetching letter:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 text-lg">Letter not found</p>
          <p className="text-gray-600 mt-2">Please check the QR code and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Letter Tracking</h1>
          <p className="text-gray-600 mb-1">{letter.title}</p>
          <p className="text-sm text-gray-500">Ref: {letter.reference_number}</p>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            What's your role?
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={onHandlerSelected}
              className="group bg-white border-2 border-blue-600 rounded-lg p-6 hover:bg-blue-50 transition-all transform hover:scale-105"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-blue-100 p-4 rounded-full group-hover:bg-blue-200 transition-colors">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  I'm the Handler
                </h3>
                <p className="text-sm text-gray-600">
                  I created this letter and manage the tracking system. I record who signed and what statuses were completed.
                </p>
                <span className="text-xs text-blue-600 font-medium">
                  Requires PIN
                </span>
              </div>
            </button>

            <button
              onClick={onReceiverSelected}
              className="group bg-white border-2 border-green-600 rounded-lg p-6 hover:bg-green-50 transition-all transform hover:scale-105"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-green-100 p-4 rounded-full group-hover:bg-green-200 transition-colors">
                  <Eye className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  I'm a Receiver/Signer
                </h3>
                <p className="text-sm text-gray-600">
                  I need to sign this letter (Approved, Noted, or Reviewed). I want to see the tracking receipt.
                </p>
                <span className="text-xs text-green-600 font-medium">
                  No PIN required
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
