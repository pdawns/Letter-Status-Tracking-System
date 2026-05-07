import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getTheme, applyTheme, getThemeMode, applyThemeMode } from './lib/theme';

applyTheme(getTheme());
applyThemeMode(getThemeMode());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
