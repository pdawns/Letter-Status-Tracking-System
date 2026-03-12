import { useEffect, useState } from 'react';
import CreateLetter from './components/CreateLetter';
import LetterView from './components/LetterView';
import TrackLetter from './components/TrackLetter';
import HandlerUpdate from './components/HandlerUpdate';
import Receipt from './components/Receipt';
import QRScanner from './components/QRScanner';
import DocumentLibrary from './components/DocumentLibrary';
import DocumentInfo from './components/DocumentInfo';
import { FileText, Camera, Library } from 'lucide-react';

type View = 'home' | 'letter-view' | 'track' | 'handler' | 'receipt' | 'scanner' | 'library' | 'document-info';

function App() {
  const [view, setView] = useState<View>('home');
  const [currentLetterId, setCurrentLetterId] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [previousView, setPreviousView] = useState<View | null>(null);

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

  const handleQRScanSuccess = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const trackId = url.searchParams.get('track');
      if (trackId) {
        setCurrentLetterId(trackId);
        setView('track');
        setShowScanner(false);
      }
    } catch {
      alert('Invalid QR code. Please try again.');
    }
  };

  const handleDocumentSelected = (letterId: string) => {
    setCurrentLetterId(letterId);
    setPreviousView('library');
    setView('track');
  };

  const handleViewDocumentInfo = (letterId: string) => {
    setCurrentLetterId(letterId);
    setView('document-info');
  };

  const handleBackToLibrary = () => {
    setView('library');
    setPreviousView(null);
  };

  const handleBackFromTrack = () => {
    if (previousView === 'library') {
      setView('library');
      setPreviousView(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {showScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      {view === 'home' && (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="w-12 h-12 text-blue-600" />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Document Tracking System
              </h1>
            </div>
            <p className="text-base sm:text-lg text-gray-600">
              Create and track documents with QR codes - Letters, Certificates, and More
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  const element = document.querySelector('form');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2 border-blue-600"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-blue-100 p-4 rounded-full group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Create Document</h3>
                  <p className="text-sm text-gray-600">Upload a new document</p>
                </div>
              </button>

              <button
                onClick={() => setShowScanner(true)}
                className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2 border-green-600"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-green-100 p-4 rounded-full group-hover:bg-green-200 transition-colors">
                    <Camera className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Scan QR Code</h3>
                  <p className="text-sm text-gray-600">Track a document</p>
                </div>
              </button>

              <button
                onClick={() => setView('library')}
                className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2 border-purple-600"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-purple-100 p-4 rounded-full group-hover:bg-purple-200 transition-colors">
                    <Library className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Document Library</h3>
                  <p className="text-sm text-gray-600">View all documents</p>
                </div>
              </button>
            </div>

            <div className="mt-8">
              <CreateLetter onLetterCreated={handleLetterCreated} />
            </div>
          </div>
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
          onBack={previousView === 'library' ? handleBackFromTrack : undefined}
        />
      )}

      {view === 'handler' && currentLetterId && (
        <HandlerUpdate letterId={currentLetterId} onBack={handleBackToTrack} />
      )}

      {view === 'receipt' && currentLetterId && (
        <Receipt letterId={currentLetterId} onBack={handleBackToTrack} />
      )}

      {view === 'library' && (
        <DocumentLibrary
          onDocumentSelected={handleDocumentSelected}
          onViewDocumentInfo={handleViewDocumentInfo}
          onBack={handleBackToHome}
        />
      )}

      {view === 'document-info' && currentLetterId && (
        <DocumentInfo
          letterId={currentLetterId}
          onBack={handleBackToLibrary}
        />
      )}
    </div>
  );
}

export default App;
