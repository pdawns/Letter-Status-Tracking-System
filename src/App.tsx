import { useEffect, useState } from 'react';
import CreateLetter from './components/CreateLetter';
import LetterView from './components/LetterView';
import TrackLetter from './components/TrackLetter';
import HandlerUpdate from './components/HandlerUpdate';
import Receipt from './components/Receipt';
import { FileText } from 'lucide-react';

type View = 'home' | 'letter-view' | 'track' | 'handler' | 'receipt';

function App() {
  const [view, setView] = useState<View>('home');
  const [currentLetterId, setCurrentLetterId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');

    if (trackId) {
      setCurrentLetterId(trackId);
      setView('track');
    }
  }, []);

  const handleLetterCreated = (letterId: string) => {
    setCurrentLetterId(letterId);
    setView('letter-view');
  };

  const handleBackToHome = () => {
    setView('home');
    setCurrentLetterId('');
    window.history.pushState({}, '', '/');
  };

  const handleHandlerSelected = () => {
    setView('handler');
  };

  const handleReceiverSelected = () => {
    setView('receipt');
  };

  const handleBackToTrack = () => {
    setView('track');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {view === 'home' && (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="w-12 h-12 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Letter Tracking System
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Create and track physical letters with QR codes
            </p>
          </div>
          <CreateLetter onLetterCreated={handleLetterCreated} />
        </div>
      )}

      {view === 'letter-view' && currentLetterId && (
        <div className="container mx-auto px-4 py-8">
          <LetterView letterId={currentLetterId} onBack={handleBackToHome} />
        </div>
      )}

      {view === 'track' && currentLetterId && (
        <TrackLetter
          letterId={currentLetterId}
          onHandlerSelected={handleHandlerSelected}
          onReceiverSelected={handleReceiverSelected}
        />
      )}

      {view === 'handler' && currentLetterId && (
        <HandlerUpdate letterId={currentLetterId} onBack={handleBackToTrack} />
      )}

      {view === 'receipt' && currentLetterId && (
        <Receipt letterId={currentLetterId} onBack={handleBackToTrack} />
      )}
    </div>
  );
}

export default App;
