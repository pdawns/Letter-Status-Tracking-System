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
import { Camera, Library } from 'lucide-react';
import DocumentInfo from './components/DocumentInfo';
import LandingPage from './components/LandingPage';
import TopBar from './components/TopBar';
import Archive from './components/Archive';
import Settings from './components/Settings';
import SendDocument from './components/SendDocument';
import { getToken, getRole, logout } from './lib/api';
import Toast from './components/Toast';

type View = 'dashboard' | 'tracking' | 'document-tracking' | 'letter-view' | 'track' | 'handler' | 'receipt' | 'scanner' | 'library' | 'document-info' | 'archive' | 'settings' | 'send-document';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());
  const [showLanding, setShowLanding] = useState(() => !getToken());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [currentLetterId, setCurrentLetterId] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [role, setRole] = useState<string>(() => getRole());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Try new format first: ?ref=XXX&type=YYY&id=ZZZ
    const trackId = params.get('id');
    
    // Fallback to old format: ?track=id
    const oldTrackId = params.get('track');

    if (trackId) {
      // New format detected
      setCurrentLetterId(trackId);
      setView('track');
    } else if (oldTrackId) {
      // Old format detected (backward compatibility)
      setCurrentLetterId(oldTrackId);
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

  const handleQRScanSuccess = (letterId: string) => {
    setCurrentLetterId(letterId);
    setView('track');
    setShowScanner(false);
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
    } else if (previousView === 'archive') {
      setView('archive');
      setPreviousView(null);
    }
  };

  return (
    <>
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
    {(!isLoggedIn || showLanding) && (
      <LandingPage onEnter={() => { setIsLoggedIn(true); setShowLanding(false); setRole(getRole()); setToast({ message: `Welcome back, ${localStorage.getItem('dts_username') || 'staff'}!`, type: 'success' }); }} />
    )}
    {isLoggedIn && !showLanding && (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar 
        currentView={
          view === 'library' || view === 'document-info' || view === 'track' || view === 'handler' || view === 'receipt' ? 'tracking' :
          view === 'archive' ? 'archive' :
          view === 'settings' ? 'settings' :
          view === 'send-document' ? 'send-document' :
          view === 'dashboard' || view === 'tracking' || view === 'document-tracking' ? view : 
          'dashboard'
        } 
        onViewChange={setView}
        role={role}
        onLogout={async () => { await logout(); setIsLoggedIn(false); setShowLanding(true); setRole('staff'); setToast({ message: 'You have been logged out. See you next time!', type: 'success' }); }}
      />
      <TopBar
        onHome={() => setView('dashboard')}
        onNavigateToLetter={(id) => { setCurrentLetterId(id); setView('track'); }}
      />
      <div className="ml-56 min-h-screen overflow-auto" style={{ paddingTop: '56px' }}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
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
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <CreateLetter onLetterCreated={handleLetterCreated} />
              </div>
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
          <Receipt letterId={currentLetterId} onBack={handleBackToLibrary} />
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

        {view === 'archive' && (
          <Archive
            onBack={() => setView('dashboard')}
            onDocumentSelected={(id: string) => {
              setCurrentLetterId(id);
              setPreviousView('archive');
              setView('track');
            }}
          />
        )}

        {view === 'settings' && <Settings />}

        {view === 'send-document' && <SendDocument />}
      </div>
    </div>
    )}
    </>
  );
}

export default App;
