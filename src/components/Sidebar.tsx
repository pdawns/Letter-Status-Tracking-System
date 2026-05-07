import { useState } from 'react';
import { LayoutDashboard, Search, FilePlus, Archive, Settings, LogOut, X } from 'lucide-react';
import { getThemeMode } from '../lib/theme';
import logo1 from '../../images/LOGO1.jpg';

type View = 'dashboard' | 'tracking' | 'document-tracking' | 'archive' | 'settings' | 'send-document';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  role?: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

const allMenuItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, roles: ['staff', 'admin', 'viewer', 'developer'] },
  { id: 'document-tracking' as View, label: 'Create Document', icon: FilePlus, roles: ['staff', 'admin', 'developer'] },
  { id: 'tracking' as View, label: 'Track Document', icon: Search, roles: ['staff', 'admin', 'viewer', 'developer'] },
  { id: 'archive' as View, label: 'Archive', icon: Archive, roles: ['admin', 'developer'] },
  { id: 'settings' as View, label: 'Settings', icon: Settings, roles: ['admin', 'developer', 'staff'] },
];

export default function Sidebar({ currentView, onViewChange, onLogout, role = 'staff', menuOpen, onMenuToggle }: SidebarProps) {
  const menuItems = allMenuItems.filter(item => item.roles.includes(role));
  const themeMode = getThemeMode();
  const isLight = themeMode === 'light';

  // Dynamic colors based on theme mode
  const textColor = isLight ? '#1a202c' : '#ffffff';
  const textColorSecondary = isLight ? 'rgba(26,32,44,0.7)' : 'rgba(255,255,255,0.55)';
  const textColorTertiary = isLight ? 'rgba(26,32,44,0.5)' : 'rgba(255,255,255,0.45)';
  const handleBg = isLight ? 'rgba(26,32,44,0.2)' : 'rgba(255,255,255,0.22)';
  const closeBtnBg = isLight ? 'rgba(26,32,44,0.08)' : 'rgba(255,255,255,0.08)';
  const closeBtnBorder = isLight ? 'rgba(26,32,44,0.15)' : 'rgba(255,255,255,0.1)';
  const dividerBg = isLight ? 'rgba(26,32,44,0.15)' : 'rgba(156,175,136,0.15)';
  const inactiveBg = isLight ? 'rgba(26,32,44,0.05)' : 'rgba(255,255,255,0.05)';
  const inactiveBorder = isLight ? 'rgba(26,32,44,0.1)' : 'rgba(255,255,255,0.07)';
  const inactiveIconBg = isLight ? 'rgba(26,32,44,0.08)' : 'rgba(255,255,255,0.06)';
  const inactiveIconBorder = isLight ? 'rgba(26,32,44,0.1)' : 'rgba(255,255,255,0.06)';
  const logoutBg = isLight ? 'rgba(220,38,38,0.1)' : 'rgba(239,68,68,0.08)';
  const logoutBorder = isLight ? 'rgba(220,38,38,0.3)' : 'rgba(239,68,68,0.2)';
  const logoutColor = isLight ? '#dc2626' : '#fca5a5';

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

  const handleNav = (id: View) => {
    onViewChange(id);
    onMenuToggle();
  };

  return (
    <>
      {/* ── Slide-up Sheet Overlay ── */}
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] transition-all duration-300"
        style={{
          background: menuOpen ? 'rgba(0,0,0,0.55)' : 'transparent',          backdropFilter: menuOpen ? 'blur(6px)' : 'none',
          WebkitBackdropFilter: menuOpen ? 'blur(6px)' : 'none',
          pointerEvents: menuOpen ? 'auto' : 'none',
        }}
        onClick={onMenuToggle}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 z-[61] transition-all duration-500"
        style={{
          bottom: menuOpen ? '0' : '-100%',
          borderRadius: '28px 28px 0 0',
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(var(--accent-rgb), 0.18)',
          borderBottom: 'none',
          boxShadow: '0 -12px 60px rgba(0,0,0,0.45)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: handleBg }} />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <p className="font-bold text-base leading-tight tracking-wide" style={{ color: textColor }}>DocuTrack</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent-text)' }}>
              {getDisplayName(localStorage.getItem('dts_username'))}
            </p>
            <span className="text-xs px-1.5 py-0.5 rounded-md mt-1 inline-block" style={{
              background: role === 'developer' ? 'rgba(139,92,246,0.15)' : role === 'admin' ? 'rgba(168,85,247,0.15)' : role === 'viewer' ? 'rgba(59,130,246,0.15)' : 'rgba(var(--accent-rgb),0.15)',
              color: role === 'developer' ? (isLight ? '#6d28d9' : '#c4b5fd') : role === 'admin' ? (isLight ? '#7c3aed' : '#d8b4fe') : role === 'viewer' ? (isLight ? '#1e40af' : '#93c5fd') : 'var(--accent-text)',
              border: `1px solid ${role === 'developer' ? 'rgba(139,92,246,0.3)' : role === 'admin' ? 'rgba(168,85,247,0.3)' : role === 'viewer' ? 'rgba(59,130,246,0.3)' : 'rgba(var(--accent-rgb),0.2)'}`,
              fontSize: '9px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {role === 'developer' ? '🔒 Developer' : role === 'admin' ? 'Prov. Treasurer' : role === 'viewer' ? 'Viewer' : 'Staff'}
            </span>
          </div>
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-full transition-all"
            style={{ background: closeBtnBg, border: `1px solid ${closeBtnBorder}` }}
          >
            <X className="w-4 h-4" style={{ color: textColor }} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 mb-4" style={{ height: '1px', background: dividerBg }} />

        {/* Icon grid */}
        <div className={`grid gap-2 px-4 mb-5`} style={{ gridTemplateColumns: `repeat(${menuItems.length}, minmax(0, 1fr))` }}>
          {menuItems.map(({ id, icon: Icon, label }) => {
            const isActive = currentView === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all duration-200 active:scale-95"
                style={{
                  background: isActive
                    ? 'rgba(var(--accent-text-rgb),0.18)'
                    : inactiveBg,
                  border: isActive
                    ? '1px solid rgba(var(--accent-rgb),0.45)'
                    : `1px solid ${inactiveBorder}`,
                  boxShadow: isActive ? `0 0 16px rgba(var(--accent-rgb),0.15)` : 'none',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: isActive ? 'rgba(var(--primary-rgb),0.6)' : inactiveIconBg,
                    border: isActive ? '1px solid rgba(var(--accent-rgb),0.3)' : `1px solid ${inactiveIconBorder}`,
                  }}
                >
                  <Icon
                    style={{
                      width: '20px',
                      height: '20px',
                      color: isActive ? 'var(--accent-text)' : textColorSecondary,
                      filter: isActive ? `drop-shadow(0 0 5px rgba(var(--accent-rgb),0.7))` : 'none',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    color: isActive ? 'var(--accent-text)' : textColorTertiary,
                    fontWeight: isActive ? 700 : 400,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="px-4 pb-6">
          <button
            onClick={() => { onMenuToggle(); onLogout(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-200 active:scale-95 hover:opacity-80"
            style={{
              background: logoutBg,
              border: `1px solid ${logoutBorder}`,
              color: logoutColor,
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
