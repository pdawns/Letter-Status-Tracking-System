import { useState } from 'react';
import { login } from '../lib/api';
import { loadSettings } from './Settings';
import logo1 from '../../images/LOGO1.jpg';
import logo3 from '../../images/LOGO3.jpg';
import { LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const settings = loadSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      onLogin(data.username);
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const displayLogo1 = settings.logo1 || logo1;
  const displayLogo2 = settings.logo2 || logo3;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #004526 0%, #1a6b3c 60%, #9CAF88 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logos */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-400 bg-white flex items-center justify-center">
            <img src={displayLogo2} alt="Seal" className="w-full h-full object-contain" />
          </div>
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 bg-white flex items-center justify-center" style={{ borderColor: '#9CAF88' }}>
            <img src={displayLogo1} alt="Logo" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">Document Tracking System</h1>
          <p className="text-sm text-green-200 mt-1">{settings.officeName}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-base font-bold mb-5 text-center" style={{ color: '#004526' }}>Staff Login</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ focusRingColor: '#004526' }}
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#004526' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-4 h-4" /> Login</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-green-200 mt-4 opacity-70">
          {settings.province} · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
