import { User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { loadSettings } from './Settings';
import NotificationBell from './NotificationBell';
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

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: '60px',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderBottom: '1px solid rgba(var(--accent-rgb), 0.15)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.3)',
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
          <p className="text-white text-xs font-bold leading-tight">{settings.officeName}</p>
          <p className="text-xs leading-tight" style={{ color: 'var(--accent)' }}>{settings.province}</p>
        </div>
      </button>

      {/* Center — title + date + time */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p
          className="text-white font-bold tracking-widest uppercase"
          style={{ letterSpacing: '0.12em', fontSize: '11px' }}
        >
          DocuTrack
        </p>
        <p style={{ color: 'var(--accent)', opacity: 0.75, fontSize: '9px' }}>{dateStr}</p>
        <p className="font-mono font-semibold" style={{ color: 'var(--accent-text)', fontSize: '10px', letterSpacing: '0.05em' }}>{timeStr}</p>
      </div>

      {/* Right — notifications + user pill */}
      <div className="flex items-center gap-2">
        {publicMode ? (
          <>
            <button onClick={onBackToLanding}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95 text-xs font-medium text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
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
              <User className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium hidden sm:inline capitalize">
                {localStorage.getItem('dts_username') || 'Staff'}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
