import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Building2, Palette, Cloud, Info, Upload, Check, ClipboardList, RefreshCw, Search, KeyRound, Users } from 'lucide-react';
import { getAllActivityLogs, ActivityLog, changePassword } from '../lib/api';
import { THEMES, ThemeKey, getTheme, setTheme } from '../lib/theme';

const STORAGE_KEY = 'dts_settings';

interface AppSettings {
  officeName: string;
  province: string;
  address: string;
  email: string;
  logo1: string; // base64
  logo2: string; // base64
  primaryColor: string;
  secondaryColor: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

const defaultSettings: AppSettings = {
  officeName: "Provincial Treasurer's Office",
  province: 'Province of Misamis Oriental',
  address: 'Provincial Capitol, Cagayan de Oro City',
  email: import.meta.env.VITE_OFFICE_EMAIL || 'pto.misamisoriental@gmail.com',
  logo1: '',
  logo2: '',
  primaryColor: 'var(--primary)',
  secondaryColor: 'var(--accent)',
  cloudName: '',
  apiKey: '',
  apiSecret: '',
};

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch { return defaultSettings; }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

type Tab = 'office' | 'theme' | 'cloudinary' | 'about' | 'activitylog' | 'password' | 'activeusers';

interface ActiveSession {
  username: string;
  role: string;
  login_time: string;
  minutes_active: number;
  token_preview: string;
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>('office');
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [saved, setSaved] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(getTheme().key);
  const [themeSwitching, setThemeSwitching] = useState(false);
  const [themeConfirm, setThemeConfirm] = useState<ThemeKey | null>(null);
  const logo1Ref = useRef<HTMLInputElement>(null);
  const logo2Ref = useRef<HTMLInputElement>(null);

  // Activity Log state
  const [logs, setLogs] = useState<(ActivityLog & { reference_number?: string; title?: string })[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Change Password state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Active Users state
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [totalActive, setTotalActive] = useState(0);

  useEffect(() => {
    if (tab === 'activitylog') fetchLogs();
    if (tab === 'activeusers') fetchActiveSessions();
  }, [tab]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await getAllActivityLogs({ limit: 200 });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    setSessionsLoading(true);
    try {
      const token = localStorage.getItem('dts_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dev/active-sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setActiveSessions(data.sessions || []);
      setTotalActive(data.total_active || 0);
    } catch (err) {
      console.error(err);
      setActiveSessions([]);
      setTotalActive(0);
    } finally {
      setSessionsLoading(false);
    }
  };

  const update = (key: keyof AppSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', settings.secondaryColor);
  };

  const handleLogoUpload = (key: 'logo1' | 'logo2', file: File) => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  const userRole = localStorage.getItem('dts_role') || 'staff';
  
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'office', label: 'Office Info', icon: Building2 },
    { id: 'theme', label: 'System Theme', icon: Palette },
    { id: 'cloudinary', label: 'Cloudinary Config', icon: Cloud },
    { id: 'activitylog', label: 'Activity Log', icon: ClipboardList },
    { id: 'password', label: 'Change Password', icon: KeyRound },
    ...(userRole === 'developer' ? [{ id: 'activeusers' as Tab, label: 'Active Users', icon: Users }] : []),
    { id: 'about', label: 'About', icon: Info },
  ];

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    document_created:   { label: 'Created',    color: 'bg-blue-100 text-blue-700' },
    document_updated:   { label: 'Updated',    color: 'bg-yellow-100 text-yellow-700' },
    document_archived:  { label: 'Archived',   color: 'bg-orange-100 text-orange-700' },
    document_unarchived:{ label: 'Restored',   color: 'bg-teal-100 text-teal-700' },
    status_added:       { label: 'Status',     color: 'bg-purple-100 text-purple-700' },
    ticket_created:     { label: 'Ticket',     color: 'bg-indigo-100 text-indigo-700' },
    ticket_completed:   { label: 'Completed',  color: 'bg-green-100 text-green-700' },
    email_sent:         { label: 'Email Sent', color: 'bg-pink-100 text-pink-700' },
    file_uploaded:      { label: 'File',       color: 'bg-cyan-100 text-cyan-700' },
  };

  const filteredLogs = logs.filter(l => {
    const matchesAction = actionFilter ? l.action === actionFilter : true;
    const q = searchQuery.toLowerCase();
    const matchesSearch = q
      ? l.description.toLowerCase().includes(q) ||
        l.performed_by.toLowerCase().includes(q) ||
        (l.reference_number?.toLowerCase().includes(q) ?? false) ||
        (l.title?.toLowerCase().includes(q) ?? false)
      : true;
    return matchesAction && matchesSearch;
  });

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess(false);
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError('All fields are required.'); return; }
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match.'); return; }
    if (pwNew.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    setPwLoading(true);
    try {
      await changePassword(pwCurrent, pwNew);
      setPwSuccess(true);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const glassInputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid rgba(var(--accent-rgb),0.2)',
    color: 'var(--accent-text)',
  };

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <SettingsIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 rounded-xl p-1" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: tab === id ? 'var(--primary)' : 'transparent',
              color: tab === id ? 'white' : 'rgba(var(--accent-text-rgb),0.6)',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px var(--input-bg)' }}>

        {/* Office Info */}
        {tab === 'office' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--accent-text)' }}>Office Information</h2>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Office Name</label>
              <input type="text" value={settings.officeName} onChange={(e) => update('officeName', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600" style={{ ...glassInputStyle }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Province / Region</label>
              <input type="text" value={settings.province} onChange={(e) => update('province', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600" style={{ ...glassInputStyle }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Address</label>
              <input type="text" value={settings.address} onChange={(e) => update('address', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600" style={{ ...glassInputStyle }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Office Email</label>
              <input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600" style={{ ...glassInputStyle }} />
            </div>

            {/* Logo Upload */}
            <div className="pt-4" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Logos</p>
              <div className="grid grid-cols-2 gap-4">
                {(['logo1', 'logo2'] as const).map((key, i) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Logo {i + 1}</label>
                    <div
                      className="border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer"
                      style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(var(--accent-rgb),0.3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.6)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.3)')}
                      onClick={() => (key === 'logo1' ? logo1Ref : logo2Ref).current?.click()}
                    >
                      {settings[key] ? (
                        <img src={settings[key]} alt={`Logo ${i + 1}`} className="w-16 h-16 object-contain mx-auto rounded-full" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 py-2">
                          <Upload className="w-6 h-6" style={{ color: 'rgba(var(--accent-rgb),0.5)' }} />
                          <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Click to upload</p>
                        </div>
                      )}
                    </div>
                    <input ref={key === 'logo1' ? logo1Ref : logo2Ref} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(key, f); }} />
                    {settings[key] && (
                      <button onClick={() => update(key, '')} className="text-xs mt-1 hover:underline" style={{ color: '#fca5a5' }}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme */}
        {tab === 'theme' && (
          <div className="space-y-5">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--accent-text)' }}>System Theme</h2>
            
            <div>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Select Theme</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(THEMES).map(theme => (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => {
                      if (theme.key === activeTheme) return;
                      setThemeConfirm(theme.key);
                    }}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl transition-all"
                    style={{
                      background: activeTheme === theme.key ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(0,0,0,0.2)',
                      border: activeTheme === theme.key ? '2px solid rgba(var(--accent-rgb),0.5)' : '2px solid rgba(var(--accent-rgb),0.12)',
                    }}
                  >
                    <div className="w-full h-20 rounded-lg" style={{ background: theme.appBg }} />
                    <div className="text-center">
                      <p className="text-sm font-semibold" style={{ color: activeTheme === theme.key ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.6)' }}>
                        {theme.label}
                      </p>
                      {activeTheme === theme.key && (
                        <p className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: 'var(--accent)' }}>
                          <Check className="w-3 h-3" /> Active
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Theme changes apply immediately and persist across sessions.</p>
            </div>

            <div className="pt-4" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Custom Colors (Advanced)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.primaryColor} onChange={(e) => update('primaryColor', e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer" style={{ border: '1px solid rgba(var(--accent-rgb),0.2)' }} />
                    <input type="text" value={settings.primaryColor} onChange={(e) => update('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }} />
                  </div>
                  <div className="mt-2 h-8 rounded-lg" style={{ backgroundColor: settings.primaryColor }}></div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer" style={{ border: '1px solid rgba(var(--accent-rgb),0.2)' }} />
                    <input type="text" value={settings.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }} />
                  </div>
                  <div className="mt-2 h-8 rounded-lg" style={{ backgroundColor: settings.secondaryColor }}></div>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Note: Custom color changes require saving and refreshing the page.</p>
            </div>
          </div>
        )}

        {/* Theme confirm dialog */}
        {themeConfirm && !themeSwitching && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
            <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                <Palette className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="text-base font-bold text-center mb-1" style={{ color: 'var(--accent-text)' }}>Switch Theme?</h2>
              <p className="text-sm text-center mb-5" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
                Switch to <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{THEMES[themeConfirm].label}</span>? The page will reload to apply the new theme.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setThemeConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.65)' }}>
                  Cancel
                </button>
                <button onClick={() => {
                    setThemeConfirm(null);
                    setThemeSwitching(true);
                    setTimeout(() => {
                      setActiveTheme(themeConfirm!);
                      setTheme(themeConfirm!);
                      window.location.reload();
                    }, 1500);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary)' }}>
                  Yes, Switch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Theme switching overlay */}
        {themeSwitching && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="flex flex-col items-center gap-4 rounded-2xl px-10 py-8"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.15)' }}>
                <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>Theme Applied!</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Reloading with your new theme...</p>
              </div>
            </div>
          </div>
        )}

        {/* Cloudinary */}
        {tab === 'cloudinary' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--accent-text)' }}>Cloudinary Configuration</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Used for storing uploaded document files in the cloud. Get your credentials from <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>cloudinary.com/console</a>.</p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Cloud Name</label>
              <input type="text" value={settings.cloudName} onChange={(e) => update('cloudName', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }} placeholder="e.g. domyoqsab" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>API Key</label>
              <input type="text" value={settings.apiKey} onChange={(e) => update('apiKey', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }} placeholder="e.g. 284873166776179" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>API Secret</label>
              <input type="password" value={settings.apiSecret} onChange={(e) => update('apiSecret', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...glassInputStyle }} placeholder="••••••••••••" />
            </div>
          </div>
        )}

        {/* Activity Log */}
        {tab === 'activitylog' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>System Activity Log</h2>
              <button
                onClick={fetchLogs}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.65)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--input-bg)')}
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }} />
                <input
                  type="text"
                  placeholder="Search description, user, reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none"
                  style={{ ...glassInputStyle }}
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg sm:w-40 focus:outline-none"
                style={{ ...glassInputStyle }}
              >
                <option value="" style={{ background: '#002814' }}>All Actions</option>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key} style={{ background: '#002814' }}>{label}</option>
                ))}
              </select>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: 'var(--accent)' }} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(var(--accent-rgb),0.3)' }} />
                <p className="text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.5)' }}>No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredLogs.map((log) => {
                  const badge = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <div
                      key={log.id}
                      className="flex gap-3 p-3 rounded-lg transition-colors"
                      style={{ border: '1px solid rgba(var(--accent-rgb),0.1)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.85)' }}>{log.description}</p>
                        {(log.reference_number || log.title) && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>
                            {log.reference_number} {log.title ? `— ${log.title}` : ''}
                          </p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>
                          by {log.performed_by} · {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs mt-3" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>{filteredLogs.length} record(s)</p>
          </div>
        )}

        {/* Change Password */}
        {tab === 'password' && (
          <div className="space-y-4 max-w-sm">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--accent-text)' }}>Change Password</h2>
            <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Changing password for: <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{localStorage.getItem('dts_username') || 'staff'}</span></p>

            {pwError && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-xs px-3 py-2 rounded-lg flex items-center gap-1" style={{ color: '#6ee7b7', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check className="w-3.5 h-3.5" /> Password changed successfully.
              </p>
            )}

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Current Password</label>
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
                placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>New Password</label>
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
                placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(var(--accent-rgb),0.85)' }}>Confirm New Password</label>
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
                placeholder="••••••••" />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {pwLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )}

        {/* Active Users (Admin Only) */}
        {tab === 'activeusers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>Active Users</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>
                  Currently logged in users • {totalActive} active session{totalActive !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={fetchActiveSessions}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.65)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--input-bg)')}
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {sessionsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: 'var(--accent)' }} />
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(var(--accent-rgb),0.3)' }} />
                <p className="text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.5)' }}>No active sessions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((session, idx) => {
                  const isCurrentUser = session.username === localStorage.getItem('dts_username');
                  const roleColors: Record<string, string> = {
                    developer: 'bg-purple-100 text-purple-700',
                    admin: 'bg-red-100 text-red-700',
                    staff: 'bg-blue-100 text-blue-700',
                    viewer: 'bg-gray-100 text-gray-700',
                  };
                  const roleColor = roleColors[session.role] || 'bg-gray-100 text-gray-600';
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                      style={{ 
                        border: isCurrentUser ? '1px solid rgba(var(--accent-rgb),0.3)' : '1px solid rgba(var(--accent-rgb),0.1)',
                        background: isCurrentUser ? 'rgba(var(--accent-rgb),0.05)' : 'transparent'
                      }}
                      onMouseEnter={(e) => !isCurrentUser && (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.05)')}
                      onMouseLeave={(e) => !isCurrentUser && (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                          style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                          <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                            {session.username}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium" 
                              style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}>
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColor}`}>
                            {session.role}
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>
                            • Active for {session.minutes_active} min{session.minutes_active !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>
                          Logged in: {new Date(session.login_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
                <span className="font-semibold" style={{ color: '#a78bfa' }}>🔒 Developer-Only Feature:</span> This monitoring tool shows all active login sessions in real-time. Sessions persist until logout or server restart. Only accessible with developer credentials.
              </p>
            </div>
          </div>
        )}

        {/* About */}
        {tab === 'about' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--accent-text)' }}>About</h2>
            <div className="space-y-3">
              {[
                { label: 'System Name', value: 'DocuTrack' },
                { label: 'Version', value: '1.0.0' },
                { label: 'Office', value: "Provincial Treasurer's Office" },
                { label: 'Province', value: 'Misamis Oriental' },
                { label: 'Database', value: 'SQLite (local)' },
                { label: 'File Storage', value: 'Cloudinary' },
                { label: 'Built with', value: 'React + TypeScript + Vite' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 text-sm" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.12)' }}>
                  <span className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>{label}</span>
                  <span className="font-medium text-xs" style={{ color: 'var(--accent)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {tab !== 'about' && tab !== 'activitylog' && tab !== 'password' && tab !== 'activeusers' && (
          <button
            onClick={handleSave}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: saved ? 'var(--accent)' : 'var(--primary)' }}
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
}
