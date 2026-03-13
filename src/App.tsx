import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CreateLetter from './components/CreateLetter';
import LetterView from './components/LetterView';
import TrackLetter from './components/TrackLetter';
import HandlerUpdate from './components/HandlerUpdate';
import Receipt from './components/Receipt';
import QRScanner from './components/QRScanner';
import DocumentLibrary from './components/DocumentLibrary';
import DocumentInfo from './components/DocumentInfo';
import { Camera, Library, Upload } from 'lucide-react';

type View = 'dashboard' | 'tracking' | 'document-tracking' | 'letter-view' | 'track' | 'handler' | 'receipt' | 'scanner' | 'library' | 'document-info';

function App() {
  const [view, setView] = useState<View>('dashboard');
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
    setView('dashboard');
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

  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Use jsQR library to decode QR code from image
      const image = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return;

          canvas.width = image.width;
          canvas.height = image.height;
          context.drawImage(image, 0, 0);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Try to decode QR code from image data
          // For now, we'll use a simple approach - extract URL from the image
          // In production, you'd want to use a proper QR code library like jsQR
          const dataUrl = e.target?.result as string;
          
          // Simple fallback: prompt user to enter tracking ID manually
          const trackingId = prompt('Please enter the tracking ID from the QR code:');
          if (trackingId) {
            setCurrentLetterId(trackingId);
            setView('track');
          }
        };
        image.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing QR code:', error);
      alert('Failed to process QR code image. Please try again.');
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
      <Sidebar 
        currentView={
          view === 'library' || view === 'document-info' || view === 'track' || view === 'handler' || view === 'receipt' ? 'tracking' :
          view === 'dashboard' || view === 'tracking' || view === 'document-tracking' ? view : 
          'dashboard'
        } 
        onViewChange={setView} 
      />
      
      <div className="ml-56 min-h-screen overflow-auto">
        {showScanner && (
          <QRScanner
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard />
        )}

        {view === 'tracking' && (
          <div className="p-5">
            <div className="mb-4">
              <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Tracking System</h1>
              <p className="text-gray-600 text-sm mt-1">Manage documents with QR codes</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
              <button
                onClick={() => setShowScanner(true)}
                className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2"
                style={{ borderColor: '#9CAF88' }}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-4 rounded-full transition-colors" style={{ backgroundColor: '#DFF5E1' }}>
                    <Camera className="w-8 h-8" style={{ color: '#004526' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: '#004526' }}>Scan QR Code</h3>
                  <p className="text-gray-600 text-sm">Track a document by scanning its QR code</p>
                </div>
              </button>

              <label className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2 cursor-pointer"
                style={{ borderColor: '#9CAF88' }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQRUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-4 rounded-full transition-colors" style={{ backgroundColor: '#DFF5E1' }}>
                    <Upload className="w-8 h-8" style={{ color: '#004526' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: '#004526' }}>Upload QR Code</h3>
                  <p className="text-gray-600 text-sm">Upload a QR code image to track</p>
                </div>
              </label>

              <button
                onClick={() => setView('library')}
                className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 border-2"
                style={{ borderColor: '#9CAF88' }}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-4 rounded-full transition-colors" style={{ backgroundColor: '#DFF5E1' }}>
                    <Library className="w-8 h-8" style={{ color: '#004526' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: '#004526' }}>Document Library</h3>
                  <p className="text-gray-600 text-sm">View and track all documents</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'document-tracking' && (
          <div className="p-5">
            <div className="mb-5">
              <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Create Document</h1>
              <p className="text-gray-600 text-sm mt-1">Create documents with QR codes</p>
            </div>

            <div className="max-w-3xl">
              <CreateLetter onLetterCreated={handleLetterCreated} />
            </div>
          </div>
        )}

        {view === 'letter-view' && currentLetterId && (
          <div className="p-8">
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
    </div>
  );
}

export default App;
