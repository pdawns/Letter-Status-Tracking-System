import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';

interface CreateLetterProps {
  onLetterCreated: (letterId: string) => void;
}

export default function CreateLetter({ onLetterCreated }: CreateLetterProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReferenceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LTR-${year}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !pin) {
      setError('Please fill in all required fields');
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const referenceNumber = generateReferenceNumber();

      const { data, error: insertError } = await supabase
        .from('letters')
        .insert({
          reference_number: referenceNumber,
          title,
          description,
          handler_pin: pin,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onLetterCreated(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Create New Letter</h1>
        </div>
        <p className="text-gray-600 ml-11 mb-6">
          As the handler, create a new letter and set up the tracking system
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Letter Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Budget Approval Request"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the letter..."
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              Handler PIN * (minimum 4 characters)
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter a secure PIN"
              minLength={4}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              You'll need this PIN to record status updates after signers sign the letter. Keep it secure.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Letter...' : 'Create Letter'}
          </button>
        </form>
      </div>
    </div>
  );
}
