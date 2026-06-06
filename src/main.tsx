import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Apply saved theme before first render to prevent flash
try {
  const saved = localStorage.getItem('theme');
  if (saved && JSON.parse(saved)?.state?.theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
