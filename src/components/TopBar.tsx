import { User, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { loadSettings } from './Settings';
import NotificationBell from './NotificationBell';
import { getThemeMode, setThemeMode, type ThemeMode } from '../lib/theme';
import logo1 from '../../images/LOGO1.jpg';

interface TopBarProps {
  onHome: () => void;
  onNavigateToLetter: (letterId: string) => void;
  onMenuToggle: () => void;
  publicMode?: boolean;
  onBackToLanding?: () => void;
  onLogin?: () => void;
}

export default function TopBar({ onHome, onNavigateToLetter, onMenuToggle, publicMode, onBackToLanding, onLogin }: TopBarProps) {
  const settings = loadSettings();
  const [now, setNow] = useState(new Date());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode());

  const toggleThemeMode = () => {
    const newMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    setThemeModeState(newMode);
  };

  // Helper function to get display name from username
  const getDisplayName = (username: string | null): string => {
    if (!username) return 'Staff';
    
    // Special case for ptomisor@pto
    if (username === 'ptomisor@pto') return 'PTO';
    
    // Handle email-like usernames (e.g., "jonarleen.cabago@pto")
    if (username.includes('@')) {
      const beforeAt = username.split('@')[0];
      const parts = beforeAt.split('.');
      // Return last name with first letter capitalized (e.g., "Cabago")
      const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      return lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    }
    
    // For simple usernames, just return capitalized
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  // Dynamic text color based on theme mode
  const textColor = themeMode === 'light' ? '#1a202c' : '#ffffff';
  const textColorSecondary = themeMode === 'light' ? 'rgba(26,32,44,0.7)' : 'rgba(255,255,255,0.7)';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: '60px',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderBottom: '1px solid rgba(var(--accent-rgb), 0.15)',
        boxShadow: themeMode === 'light' ? '0 2px 12px rgba(0,0,0,0.1)' : '0 2px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Left — Logo button (tapping opens the nav sheet) */}
      <button
        onClick={onMenuToggle}
        className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        style={{ outline: 'none' }}
        aria-label="Open menu"
      >
        {/* Logo with dark green tint overlay */}
        <div className="relative flex-shrink-0" style={{ width: '36px', height: '36px' }}>
          <img
            src={logo1}
            alt="Logo"
            className="w-full h-full rounded-full object-cover"
            style={{
              border: '1.5px solid rgba(var(--accent-rgb), 0.4)',
              filter: 'brightness(0.75) saturate(0.6) sepia(0.4) hue-rotate(var(--logo-hue, 80deg))',
            }}
          />
          {/* dark green color overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(var(--primary-rgb), 0.35)', mixBlendMode: 'multiply' }}
          />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold leading-tight" style={{ color: textColor }}>{settings.officeName}</p>
          <p className="text-xs leading-tight" style={{ color: textColorSecondary }}>{settings.province}</p>
        </div>
      </button>

      {/* Center — title + date + time */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p
          className="font-bold tracking-widest uppercase"
          style={{ letterSpacing: '0.12em', fontSize: '11px', color: textColor }}
        >
          DocuTrack
        </p>
        <p style={{ color: textColorSecondary, fontSize: '9px' }}>{dateStr}</p>
        <p className="font-mono font-semibold" style={{ fontSize: '10px', letterSpacing: '0.05em', color: textColor }}>{timeStr}</p>
      </div>

      {/* Right — theme toggle + notifications + user pill */}
      <div className="flex items-center gap-2">
        {/* Theme Mode Toggle */}
        <button
          onClick={toggleThemeMode}
          className="flex items-center justify-center rounded-full p-2 transition-all active:scale-95 hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-yellow-300" />
          ) : (
            <Moon className="w-4 h-4 text-blue-300" />
          )}
        </button>

        {publicMode ? (
          <>
            <button onClick={onBackToLanding}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: textColor }}>
              ← Back
            </button>
            <button onClick={onLogin}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95 text-xs font-medium text-white"
              style={{ background: 'var(--primary)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}>
              Login
            </button>
          </>
        ) : (
          <>
            <NotificationBell onNavigate={onNavigateToLetter} />
            <button onClick={onHome}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
              <User className="w-3.5 h-3.5" style={{ color: textColor }} />
              <span className="text-xs font-medium hidden sm:inline" style={{ color: textColor }}>
                {getDisplayName(localStorage.getItem('dts_username'))}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
