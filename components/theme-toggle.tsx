'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme';
// The storage event only fires in other tabs, so this tab announces its own
// changes with a custom event.
const THEME_CHANGE_EVENT = 'wavedigger:theme-change';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

// The saved preference and the OS preference both live outside React, so they
// are read with useSyncExternalStore instead of being copied into state by an
// effect. The stored value is memoized so each snapshot read is stable.
let storedTheme: Theme | null = null;

function getStoredTheme(): Theme {
  if (storedTheme === null) {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      storedTheme = isTheme(saved) ? saved : 'system';
    } catch {
      storedTheme = 'system';
    }
  }
  return storedTheme;
}

function setStoredTheme(theme: Theme) {
  storedTheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private browsing). Keep the choice in memory
    // for this session rather than failing the click.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribeToStoredTheme(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    storedTheme = null;
    onStoreChange();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// The server cannot see either preference, so it renders the defaults.
const getServerTheme = (): Theme => 'system';
const getServerSystemTheme = (): 'light' | 'dark' => 'light';

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToStoredTheme, getStoredTheme, getServerTheme);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Apply the resolved theme to the document, suppressing transitions so the
  // switch does not animate every themed property at once.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition-disable');

    if (resolvedTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    const transitionTimer = setTimeout(() => {
      root.classList.remove('theme-transition-disable');
    }, 100);

    return () => clearTimeout(transitionTimer);
  }, [resolvedTheme]);

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setStoredTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />;
    }
    return resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-primary)',
        color: 'var(--text-primary)'
      }}
      title={`Current theme: ${getLabel()}`}
      aria-label={`Toggle theme, current: ${getLabel()}`}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
    </button>
  );
}
