import { Bell, User } from 'lucide-react';
import { loadSettings } from './Settings';

interface TopBarProps {
  onHome: () => void;
}

export default function TopBar({ onHome }: TopBarProps) {
  const settings = loadSettings();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-6 py-2 shadow-md"
      style={{ backgroundColor: '#003d1f', height: '56px', borderBottomLeftRadius: '16px', left: '232px' }}
    >
      {/* Left — office name (clickable → dashboard) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onHome}
          className="hidden sm:block text-left hover:opacity-80 transition-opacity"
        >
          <p className="text-white text-xs font-bold leading-tight">{settings.officeName}</p>
          <p className="text-xs leading-tight" style={{ color: '#9CAF88' }}>{settings.province}</p>
        </button>
      </div>

      {/* Center — system title */}
      <div className="hidden md:block text-center">
        <p className="text-white text-sm font-bold tracking-wide">Document Tracking System</p>
        <p className="text-xs" style={{ color: '#9CAF88' }}>{dateStr}</p>
      </div>

      {/* Right — icons */}
      <div className="flex items-center gap-3">
        <button className="text-white hover:opacity-75 transition-opacity" title="Notifications">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-full px-3 py-1">
          <User className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium hidden sm:inline">Staff</span>
        </div>
      </div>
    </div>
  );
}
