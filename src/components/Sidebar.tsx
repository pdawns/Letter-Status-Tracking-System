import { useState } from 'react';
import { LayoutDashboard, Search, FilePlus, Archive, Settings, LogOut, X } from 'lucide-react';
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
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, roles: ['staff', 'receiver'] },
  { id: 'document-tracking' as View, label: 'Create Document', icon: FilePlus, roles: ['staff'] },
  { id: 'tracking' as View, label: 'Track Document', icon: Search, roles: ['staff', 'receiver'] },
  { id: 'archive' as View, label: 'Archive', icon: Archive, roles: ['staff'] },
  { id: 'settings' as View, label: 'Settings', icon: Settings, roles: ['staff'] },
];

export default function Sidebar({ currentView, onViewChange, onLogout, role = 'staff', menuOpen, onMenuToggle }: SidebarProps) {
  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

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
          background: menuOpen ? 'rgba(0,0,0,0.55)' : 'transparent',
          backdropFilter: menuOpen ? 'blur(6px)' : 'none',
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
          background: 'rgba(0, 45, 20, 0.72)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(156,175,136,0.18)',
          borderBottom: 'none',
          boxShadow: '0 -12px 60px rgba(0,0,0,0.45)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <p className="text-white font-bold text-base leading-tight tracking-wide">DocuTrack</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CAF88' }}>
              {localStorage.getItem('dts_username') || 'staff'}
            </p>
            <span className="text-xs px-1.5 py-0.5 rounded-md mt-1 inline-block" style={{
              background: role === 'receiver' ? 'rgba(234,179,8,0.15)' : 'rgba(156,175,136,0.15)',
              color: role === 'receiver' ? '#fde047' : '#9CAF88',
              border: `1px solid ${role === 'receiver' ? 'rgba(234,179,8,0.3)' : 'rgba(156,175,136,0.2)'}`,
              fontSize: '9px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {role === 'receiver' ? 'Handler' : 'Staff'}
            </span>
          </div>
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-full transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 mb-4" style={{ height: '1px', background: 'rgba(156,175,136,0.15)' }} />

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
                    ? 'rgba(223,245,225,0.18)'
                    : 'rgba(255,255,255,0.05)',
                  border: isActive
                    ? '1px solid rgba(156,175,136,0.45)'
                    : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: isActive ? '0 0 16px rgba(156,175,136,0.15)' : 'none',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: isActive ? 'rgba(0,69,38,0.6)' : 'rgba(255,255,255,0.06)',
                    border: isActive ? '1px solid rgba(156,175,136,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon
                    style={{
                      width: '20px',
                      height: '20px',
                      color: isActive ? '#DFF5E1' : 'rgba(255,255,255,0.55)',
                      filter: isActive ? 'drop-shadow(0 0 5px rgba(156,175,136,0.7))' : 'none',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    color: isActive ? '#DFF5E1' : 'rgba(255,255,255,0.45)',
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
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
