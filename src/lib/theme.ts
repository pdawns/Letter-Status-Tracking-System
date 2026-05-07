export type ThemeKey = 'green' | 'navy';
export type ThemeMode = 'light' | 'dark';

export interface Theme {
  key: ThemeKey;
  label: string;
  appBg: string;
  // Accent / brand
  accent: string;
  accentRgb: string;       // for rgba() usage
  accentText: string;
  accentTextRgb: string;
  // Primary button / header
  primary: string;
  primaryHover: string;
  primaryRgb: string;
  // Card / panel
  cardBg: string;
  cardBorder: string;
  cardHeader: string;
  cardHeaderBorder: string;
  // Sidebar
  sidebarBg: string;
  // Input
  inputBg: string;
  inputBorder: string;
  // Scrollbar
  scrollThumb: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  green: {
    key: 'green',
    label: 'Forest Green',
    appBg: 'linear-gradient(160deg, #002b15 0%, #004526 50%, #002b15 100%)',
    accent: '#9CAF88',
    accentRgb: '156,175,136',
    accentText: '#DFF5E1',
    accentTextRgb: '223,245,225',
    primary: '#004526',
    primaryHover: '#005c33',
    primaryRgb: '0,69,38',
    cardBg: 'rgba(0,45,20,0.45)',
    cardBorder: 'rgba(156,175,136,0.2)',
    cardHeader: 'rgba(0,45,20,0.4)',
    cardHeaderBorder: 'rgba(156,175,136,0.1)',
    sidebarBg: 'rgba(0,45,20,0.72)',
    inputBg: 'rgba(0,0,0,0.25)',
    inputBorder: 'rgba(156,175,136,0.2)',
    scrollThumb: 'rgba(156,175,136,0.25)',
  },
  navy: {
    key: 'navy',
    label: 'Navy Blue',
    appBg: 'linear-gradient(160deg, #071828 0%, #0a2a4a 50%, #071828 100%)',
    accent: '#4a90b8',
    accentRgb: '74,144,184',
    accentText: '#e0f0ff',
    accentTextRgb: '224,240,255',
    primary: '#0a2a4a',
    primaryHover: '#0d3560',
    primaryRgb: '10,42,74',
    cardBg: 'rgba(10,42,74,0.55)',
    cardBorder: 'rgba(74,144,184,0.22)',
    cardHeader: 'rgba(10,42,74,0.5)',
    cardHeaderBorder: 'rgba(74,144,184,0.15)',
    sidebarBg: 'rgba(7,24,48,0.82)',
    inputBg: 'rgba(0,0,0,0.3)',
    inputBorder: 'rgba(74,144,184,0.25)',
    scrollThumb: 'rgba(74,144,184,0.3)',
  },
};

// Light mode versions of themes
export const LIGHT_THEMES: Record<ThemeKey, Theme> = {
  green: {
    key: 'green',
    label: 'Light Green',
    appBg: 'linear-gradient(160deg, #e8f5e9 0%, #c8e6c9 50%, #e8f5e9 100%)',
    accent: '#1b5e20',
    accentRgb: '27,94,32',
    accentText: '#0d3d15',
    accentTextRgb: '13,61,21',
    primary: '#2e7d32',
    primaryHover: '#1b5e20',
    primaryRgb: '46,125,50',
    cardBg: 'rgba(255,255,255,0.9)',
    cardBorder: 'rgba(27,94,32,0.25)',
    cardHeader: 'rgba(232,245,233,0.95)',
    cardHeaderBorder: 'rgba(27,94,32,0.2)',
    sidebarBg: 'rgba(255,255,255,0.95)',
    inputBg: 'rgba(255,255,255,0.8)',
    inputBorder: 'rgba(27,94,32,0.3)',
    scrollThumb: 'rgba(27,94,32,0.4)',
  },
  navy: {
    key: 'navy',
    label: 'Light Blue',
    appBg: 'linear-gradient(160deg, #e3f2fd 0%, #bbdefb 50%, #e3f2fd 100%)',
    accent: '#0d47a1',
    accentRgb: '13,71,161',
    accentText: '#01579b',
    accentTextRgb: '1,87,155',
    primary: '#1565c0',
    primaryHover: '#0d47a1',
    primaryRgb: '21,101,192',
    cardBg: 'rgba(255,255,255,0.9)',
    cardBorder: 'rgba(13,71,161,0.25)',
    cardHeader: 'rgba(227,242,253,0.95)',
    cardHeaderBorder: 'rgba(13,71,161,0.2)',
    sidebarBg: 'rgba(255,255,255,0.95)',
    inputBg: 'rgba(255,255,255,0.8)',
    inputBorder: 'rgba(13,71,161,0.3)',
    scrollThumb: 'rgba(13,71,161,0.4)',
  },
};

const STORAGE_KEY = 'dts_theme';
const MODE_STORAGE_KEY = 'dts_theme_mode';

export function getTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
  return THEMES[saved ?? 'green'] ?? THEMES.green;
}

export function setTheme(key: ThemeKey) {
  localStorage.setItem(STORAGE_KEY, key);
  applyTheme(THEMES[key]);
}

export function getThemeMode(): ThemeMode {
  const saved = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;
  return saved ?? 'dark';
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
  applyThemeMode(mode);
}

export function applyThemeMode(mode: ThemeMode) {
  const r = document.documentElement;
  const currentThemeKey = getTheme().key;
  
  if (mode === 'light') {
    r.classList.add('light-mode');
    r.classList.remove('dark-mode');
    // Apply light version of current theme
    applyTheme(LIGHT_THEMES[currentThemeKey]);
  } else {
    r.classList.add('dark-mode');
    r.classList.remove('light-mode');
    // Apply dark version of current theme
    applyTheme(THEMES[currentThemeKey]);
  }
}

export function applyTheme(theme: Theme) {
  const r = document.documentElement;
  r.style.setProperty('--app-bg', theme.appBg);
  r.style.setProperty('--accent', theme.accent);
  r.style.setProperty('--accent-rgb', theme.accentRgb);
  r.style.setProperty('--accent-text', theme.accentText);
  r.style.setProperty('--accent-text-rgb', theme.accentTextRgb);
  r.style.setProperty('--primary', theme.primary);
  r.style.setProperty('--primary-hover', theme.primaryHover);
  r.style.setProperty('--primary-rgb', theme.primaryRgb);
  r.style.setProperty('--card-bg', theme.cardBg);
  r.style.setProperty('--card-border', theme.cardBorder);
  r.style.setProperty('--card-header', theme.cardHeader);
  r.style.setProperty('--card-header-border', theme.cardHeaderBorder);
  r.style.setProperty('--sidebar-bg', theme.sidebarBg);
  r.style.setProperty('--input-bg', theme.inputBg);
  r.style.setProperty('--input-border', theme.inputBorder);
  r.style.setProperty('--scroll-thumb', theme.scrollThumb);
  r.style.setProperty('--logo-hue', theme.key === 'navy' ? '200deg' : '80deg');
}
