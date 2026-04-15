import { useState } from 'react';
import { FileText, QrCode, Library, ArrowRight, Shield, Clock, CheckCircle, LogIn, Eye, EyeOff, X } from 'lucide-react';
import logo3 from '../../images/LOGO3.jpg';
import logo1 from '../../images/LOGO1.jpg';
import { loadSettings } from './Settings';
import { login } from '../lib/api';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const settings = loadSettings();
  const displayLogo1 = settings.logo1 || logo1;
  const displayLogo2 = settings.logo2 || logo3;
  const officeName = settings.officeName;
  const province = settings.province;

  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const openLogin = () => { setShowLogin(true); setError(''); setUsername(''); setPassword(''); };
  const closeLogin = () => setShowLogin(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      localStorage.setItem('dts_token', data.token);
      localStorage.setItem('dts_username', data.username);
      localStorage.setItem('dts_role', data.role);
      onEnter();
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8f9fa' }}>

      {/* Header */}
      <header className="text-white py-4 px-6 shadow-lg" style={{ backgroundColor: '#004526' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0 border-2 border-yellow-400">
              <img src={displayLogo2} alt="Seal" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Republic of the Philippines</p>
              <p className="text-sm font-bold">{province}</p>
              <p className="text-xs opacity-80">{settings.address}</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs opacity-70">Document Tracking System</p>
            <p className="text-sm font-bold">{officeName}</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="text-white py-16 px-6" style={{ background: 'linear-gradient(135deg, #004526 0%, #1a6b3c 50%, #9CAF88 100%)' }}>
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block bg-white bg-opacity-20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
                Official System
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                Document Tracking System
              </h1>
              <p className="text-lg font-semibold mb-1" style={{ color: '#DFF5E1' }}>
                {officeName}
              </p>
              <p className="text-sm mb-6 opacity-80">
                {province} · {settings.address}
              </p>
              <p className="text-sm opacity-90 mb-8 max-w-lg">
                A digital system for tracking, managing, and monitoring official documents with QR code technology for efficient document routing and status updates.
              </p>
              <button
                onClick={openLogin}
                className="inline-flex items-center gap-2 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-all transform hover:scale-105 text-base"
                style={{ backgroundColor: '#9CAF88' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a9470'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
              >
                Enter System
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Logos */}
            <div className="flex gap-6 items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="w-28 h-28 rounded-full overflow-hidden shadow-xl border-4 border-yellow-400 flex items-center justify-center bg-white">
                  <img src={displayLogo2} alt="Province Seal" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs opacity-70 text-center w-28">{province}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-28 h-28 rounded-full overflow-hidden shadow-xl border-4 flex items-center justify-center bg-white" style={{ borderColor: '#9CAF88' }}>
                  <img src={displayLogo1} alt="Office Logo" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs opacity-70 text-center w-28">{officeName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-8" style={{ color: '#004526' }}>System Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: FileText, title: 'Document Management', desc: 'Create and manage official documents with unique reference numbers and QR codes.' },
                { icon: QrCode, title: 'QR Code Tracking', desc: 'Scan QR codes to instantly track document status and routing history.' },
                { icon: Library, title: 'Document Library', desc: 'Access all stored documents with advanced search and filter capabilities.' },
                { icon: Shield, title: 'PIN Security', desc: 'Handler PIN authentication ensures only authorized personnel can update document status.' },
                { icon: Clock, title: 'Status History', desc: 'Complete audit trail of all document actions — noted, reviewed, and approved.' },
                { icon: CheckCircle, title: 'Receipt Generation', desc: 'Generate official tracking receipts with QR codes for physical attachment.' },
              ].map((f) => (
                <div key={f.title} className="p-5 rounded-lg border hover:shadow-md transition-shadow" style={{ borderColor: '#DFF5E1', backgroundColor: '#f9fdf9' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#DFF5E1' }}>
                    <f.icon className="w-5 h-5" style={{ color: '#004526' }} />
                  </div>
                  <h3 className="font-bold text-sm mb-1" style={{ color: '#004526' }}>{f.title}</h3>
                  <p className="text-xs text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="py-10 px-6 text-center text-white" style={{ backgroundColor: '#004526' }}>
          <p className="text-sm opacity-80 mb-3">Ready to manage your documents?</p>
          <button
            onClick={openLogin}
            className="inline-flex items-center gap-2 font-bold px-8 py-3 rounded-lg transition-all transform hover:scale-105 text-sm"
            style={{ backgroundColor: '#9CAF88', color: 'white' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a9470'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-xs text-white" style={{ backgroundColor: '#002a18' }}>
        <p>© {new Date().getFullYear()} Provincial Treasurer's Office · Province of Misamis Oriental · All Rights Reserved</p>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={closeLogin} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            {/* Modal logos */}
            <div className="flex justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-400 bg-white">
                <img src={displayLogo2} alt="Seal" className="w-full h-full object-contain" />
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 bg-white" style={{ borderColor: '#9CAF88' }}>
                <img src={displayLogo1} alt="Logo" className="w-full h-full object-cover" />
              </div>
            </div>

            <h2 className="text-base font-bold text-center mb-1" style={{ color: '#004526' }}>Staff Login</h2>
            <p className="text-xs text-center text-gray-500 mb-5">{officeName}</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    placeholder="Enter password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#004526' }}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><LogIn className="w-4 h-4" /> Login</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
