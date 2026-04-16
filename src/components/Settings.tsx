import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Building2, Palette, Cloud, Info, Upload, Check, ClipboardList, RefreshCw, Search, KeyRound } from 'lucide-react';
import { getAllActivityLogs, ActivityLog, changePassword } from '../lib/api';

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
  primaryColor: '#004526',
  secondaryColor: '#9CAF88',
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

type Tab = 'office' | 'theme' | 'cloudinary' | 'about' | 'activitylog' | 'password';

export default function Settings() {
  const [tab, setTab] = useState<Tab>('office');
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [saved, setSaved] = useState(false);
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

  useEffect(() => {
    if (tab === 'activitylog') fetchLogs();
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

  const update = (key: keyof AppSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Apply primary color CSS variable
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', settings.secondaryColor);
  };

  const handleLogoUpload = (key: 'logo1' | 'logo2', file: File) => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'office', label: 'Office Info', icon: Building2 },
    { id: 'theme', label: 'System Theme', icon: Palette },
    { id: 'cloudinary', label: 'Cloudinary Config', icon: Cloud },
    { id: 'activitylog', label: 'Activity Log', icon: ClipboardList },
    { id: 'password', label: 'Change Password', icon: KeyRound },
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

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <SettingsIcon className="w-6 h-6" style={{ color: '#004526' }} />
        <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white rounded-lg shadow p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: tab === id ? '#004526' : 'transparent',
              color: tab === id ? 'white' : '#004526',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-5">

        {/* Office Info */}
        {tab === 'office' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: '#004526' }}>Office Information</h2>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Office Name</label>
              <input type="text" value={settings.officeName} onChange={(e) => update('officeName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Province / Region</label>
              <input type="text" value={settings.province} onChange={(e) => update('province', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={settings.address} onChange={(e) => update('address', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Office Email</label>
              <input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" />
            </div>

            {/* Logo Upload */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Logos</p>
              <div className="grid grid-cols-2 gap-4">
                {(['logo1', 'logo2'] as const).map((key, i) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Logo {i + 1}</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-green-400 transition-colors cursor-pointer"
                      onClick={() => (key === 'logo1' ? logo1Ref : logo2Ref).current?.click()}>
                      {settings[key] ? (
                        <img src={settings[key]} alt={`Logo ${i + 1}`} className="w-16 h-16 object-contain mx-auto rounded-full" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 py-2">
                          <Upload className="w-6 h-6 text-gray-400" />
                          <p className="text-xs text-gray-500">Click to upload</p>
                        </div>
                      )}
                    </div>
                    <input ref={key === 'logo1' ? logo1Ref : logo2Ref} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(key, f); }} />
                    {settings[key] && (
                      <button onClick={() => update(key, '')} className="text-xs text-red-500 mt-1 hover:underline">Remove</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme */}
        {tab === 'theme' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: '#004526' }}>System Theme</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.primaryColor} onChange={(e) => update('primaryColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border border-gray-300" />
                  <input type="text" value={settings.primaryColor} onChange={(e) => update('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="mt-2 h-8 rounded-lg" style={{ backgroundColor: settings.primaryColor }}></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border border-gray-300" />
                  <input type="text" value={settings.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="mt-2 h-8 rounded-lg" style={{ backgroundColor: settings.secondaryColor }}></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Note: Color changes apply after saving and refreshing the page.</p>
          </div>
        )}

        {/* Cloudinary */}
        {tab === 'cloudinary' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: '#004526' }}>Cloudinary Configuration</h2>
            <p className="text-xs text-gray-500 mb-4">Used for storing uploaded document files in the cloud. Get your credentials from <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="underline" style={{ color: '#004526' }}>cloudinary.com/console</a>.</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cloud Name</label>
              <input type="text" value={settings.cloudName} onChange={(e) => update('cloudName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" placeholder="e.g. domyoqsab" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
              <input type="text" value={settings.apiKey} onChange={(e) => update('apiKey', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" placeholder="e.g. 284873166776179" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">API Secret</label>
              <input type="password" value={settings.apiSecret} onChange={(e) => update('apiSecret', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" placeholder="••••••••••••" />
            </div>
          </div>
        )}

        {/* Activity Log */}
        {tab === 'activitylog' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: '#004526' }}>System Activity Log</h2>
              <button onClick={fetchLogs} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search description, user, reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg sm:w-40"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#004526' }} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredLogs.map((log) => {
                  const badge = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={log.id} className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{log.description}</p>
                        {(log.reference_number || log.title) && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {log.reference_number} {log.title ? `— ${log.title}` : ''}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          by {log.performed_by} · {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">{filteredLogs.length} record(s)</p>
          </div>
        )}

        {/* Change Password */}
        {tab === 'password' && (
          <div className="space-y-4 max-w-sm">
            <h2 className="text-base font-bold mb-4" style={{ color: '#004526' }}>Change Password</h2>
            <p className="text-xs text-gray-500">Changing password for: <span className="font-semibold">{localStorage.getItem('dts_username') || 'staff'}</span></p>

            {pwError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Password changed successfully.</p>}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="••••••••" />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#004526' }}
            >
              {pwLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )}

        {/* About */}
        {tab === 'about' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold mb-4" style={{ color: '#004526' }}>About</h2>
            <div className="space-y-3">
              {[
                { label: 'System Name', value: 'Document Tracking System (DTS)' },
                { label: 'Version', value: '1.0.0' },
                { label: 'Office', value: "Provincial Treasurer's Office" },
                { label: 'Province', value: 'Misamis Oriental' },
                { label: 'Database', value: 'SQLite (local)' },
                { label: 'File Storage', value: 'Cloudinary' },
                { label: 'Built with', value: 'React + TypeScript + Vite' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="font-medium text-xs" style={{ color: '#004526' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {tab !== 'about' && tab !== 'activitylog' && tab !== 'password' && (
          <button
            onClick={handleSave}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: saved ? '#9CAF88' : '#004526' }}
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
}
