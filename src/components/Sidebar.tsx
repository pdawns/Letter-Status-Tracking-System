import { LayoutDashboard, Search, FileText, Archive, Settings } from 'lucide-react';
import logo1 from '../../images/LOGO1.jpg';

type View = 'dashboard' | 'tracking' | 'document-tracking' | 'archive' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'document-tracking' as View, label: 'Create Document', icon: FileText },
    { id: 'tracking' as View, label: 'Tracking System', icon: Search },
    { id: 'archive' as View, label: 'Archive', icon: Archive },
    { id: 'settings' as View, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-56 text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto" style={{ backgroundColor: '#004526', fontFamily: 'serif' }}>
      <div className="p-4 border-b border-opacity-20" style={{ borderColor: '#9CAF88' }}>
        <button
          onClick={() => onViewChange('dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity w-full text-left"
        >
          <img
            src={logo1}
            alt="PTO Logo"
            className="w-8 h-8 rounded-full object-cover"
            style={{ filter: 'hue-rotate(200deg) saturate(1.5) brightness(0.95)' }}
          />
          <h1 className="text-lg font-bold">DTS</h1>
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                  style={{
                    backgroundColor: isActive ? '#DFF5E1' : 'transparent',
                    color: isActive ? '#004526' : 'white',
                    fontWeight: 'bold',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#9CAF88';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-left">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
