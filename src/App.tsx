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
import { getToken, getRole, logout, login } from './lib/api';
import Toast from './components/Toast';
import BottomTicker from './components/BottomTicker';

function PublicLoginModal({ onLogin, onClose }: { onLogin: (username: string, role: string) => void; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      localStorage.setItem('dts_token', data.token);
      localStorage.setItem('dts_username', data.username);
      localStorage.setItem('dts_role', data.role);
      onLogin(data.username, data.role);
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-2xl w-full max-w-sm p-6" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', border: '1px solid var(--card-border)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--accent-text)' }}>Staff Login</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--accent-text)' }}
            placeholder="Username" required autoFocus />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--accent-text)' }}
            placeholder="Password" required />
          {error && <p className="text-xs" style={{ color: '#fca5a5' }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.6)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)' }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type View = 'dashboard' | 'tracking' | 'document-tracking' | 'letter-view' | 'track' | 'handler' | 'receipt' | 'scanner' | 'library' | 'document-info' | 'archive' | 'settings' | 'send-document';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());
  const [showLanding, setShowLanding] = useState(() => !getToken());
  const [showPublicDashboard, setShowPublicDashboard] = useState(false);
  const [showPublicLogin, setShowPublicLogin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [currentLetterId, setCurrentLetterId] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [role, setRole] = useState<string>(() => getRole());
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<'pending' | 'completed' | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Restrict receiver role from accessing staff-only views
  const safeSetView = (v: typeof view) => {
    if (role === 'receiver') {
      const allowed: typeof view[] = ['dashboard', 'tracking', 'track', 'handler', 'library', 'document-info'];
      if (!allowed.includes(v)) return;
    }
    setView(v);
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
    {(!isLoggedIn || showLanding) && !showPublicDashboard && (
      <LandingPage
        onEnter={() => { setIsLoggedIn(true); setShowLanding(false); setRole(getRole()); setToast({ message: `Welcome back, ${localStorage.getItem('dts_username') || 'staff'}!`, type: 'success' }); }}
        onViewUpdates={() => setShowPublicDashboard(true)}
      />
    )}
    {((isLoggedIn && !showLanding) || showPublicDashboard) && (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      {!showPublicDashboard && <Sidebar 
        currentView={
          view === 'library' || view === 'document-info' || view === 'track' || view === 'handler' || view === 'receipt' ? 'tracking' :
          view === 'archive' ? 'archive' :
          view === 'settings' ? 'settings' :
          view === 'send-document' ? 'send-document' :
          view === 'dashboard' || view === 'tracking' || view === 'document-tracking' ? view : 
          'dashboard'
        } 
        onViewChange={safeSetView}
        role={role}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen(o => !o)}
        onLogout={async () => { await logout(); setIsLoggedIn(false); setShowLanding(true); setRole('staff'); setToast({ message: 'You have been logged out. See you next time!', type: 'success' }); }}
      />}
      <TopBar
        onHome={() => showPublicDashboard ? null : safeSetView('dashboard')}
        onNavigateToLetter={(id) => { setCurrentLetterId(id); setView('track'); }}
        onMenuToggle={() => !showPublicDashboard && setMenuOpen(o => !o)}
        publicMode={showPublicDashboard}
        onBackToLanding={() => setShowPublicDashboard(false)}
        onLogin={() => setShowPublicLogin(true)}
      />
      <BottomTicker />      <div className="min-h-screen overflow-auto" style={{ paddingTop: '60px', paddingBottom: '56px' }}>
        {showScanner && (
          <QRScanner
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard
            onStatusFilter={showPublicDashboard ? undefined : (filter) => {
              setLibraryStatusFilter(filter);
              setPreviousView('dashboard');
              setView('library');
            }}
            publicMode={showPublicDashboard}
          />
        )}

        {view === 'tracking' && (
          <div className="p-5">
            <div className="mb-4">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>Tracking System</h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(var(--accent-rgb),0.8)' }}>Manage documents with QR codes</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <button
                onClick={() => setShowScanner(true)}
                className="group rounded-2xl p-6 transition-all duration-200 active:scale-95 hover:scale-105"
                style={{
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(var(--accent-rgb),0.2)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.border = '1px solid rgba(var(--accent-rgb),0.45)')}
                onMouseLeave={(e) => (e.currentTarget.style.border = '1px solid rgba(var(--accent-rgb),0.2)')}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-4 rounded-2xl" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                    <Camera className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--accent-text)' }}>Scan QR Code</h3>
                  <p className="text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>Track a document by scanning its QR code</p>
                </div>
              </button>

              <button
                onClick={() => setView('library')}
                className="group rounded-2xl p-6 transition-all duration-200 active:scale-95 hover:scale-105"
                style={{
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(var(--accent-rgb),0.2)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.border = '1px solid rgba(var(--accent-rgb),0.45)')}
                onMouseLeave={(e) => (e.currentTarget.style.border = '1px solid rgba(var(--accent-rgb),0.2)')}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-4 rounded-2xl" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                    <Library className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--accent-text)' }}>Document Library</h3>
                  <p className="text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>View and track all documents</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'document-tracking' && (
          <div className="p-5">
            <CreateLetter onLetterCreated={handleLetterCreated} onToast={(msg, type) => setToast({ message: msg, type })} />
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
            onBack={() => {
              setLibraryStatusFilter(undefined);
              if (previousView === 'dashboard') {
                handleBackToHome();
              } else {
                setView('tracking');
              }
            }}
            statusFilter={libraryStatusFilter}
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
    {showPublicLogin && (
      <PublicLoginModal
        onLogin={(username, role) => {
          setIsLoggedIn(true);
          setShowLanding(false);
          setShowPublicDashboard(false);
          setShowPublicLogin(false);
          setRole(role);
          setToast({ message: `Welcome back, ${username}!`, type: 'success' });
        }}
        onClose={() => setShowPublicLogin(false)}
      />
    )}
    </>
  );
}

export default App;
