export type ThemeType = 'glass' | 'dark' | 'dark-cinematic';

const THEME_CONFIG = {
  glass: 'theme-glass',
  dark: 'theme-dark',
  'dark-cinematic': 'theme-dark-cinematic',
} as const;

const ALL_THEME_CLASSES = Object.values(THEME_CONFIG);

/**
 * Get CSS class name for a theme
 */
export const getThemeClass = (theme: ThemeType): string => {
  return THEME_CONFIG[theme];
};

/**
 * Apply theme class to DOM
 */
export const applyThemeClass = (theme: ThemeType): void => {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.remove(...ALL_THEME_CLASSES);

  if (theme === 'dark-cinematic') {
    document.documentElement.classList.add('theme-dark', 'theme-dark-cinematic');
  } else {
    document.documentElement.classList.add(getThemeClass(theme));
  }
};

/**
 * Cycle to next theme in order
 */
export const getNextTheme = (current: ThemeType): ThemeType => {
  const themes = Object.keys(THEME_CONFIG) as ThemeType[];
  const currentIndex = themes.indexOf(current);
  const nextIndex = (currentIndex + 1) % themes.length;
  return themes[nextIndex];
};

/**
 * Initialize theme from localStorage and apply to DOM
 */
export const initializeTheme = (): ThemeType => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('underlay-theme') as ThemeType | null;
    const theme: ThemeType = savedTheme || 'glass';
    applyThemeClass(theme);
    return theme;
  }
  return 'glass';
};

/**
 * Save theme preference to localStorage
 */
export const saveTheme = (theme: ThemeType) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('underlay-theme', theme);
  }
};

export const getThemeInitScript = () => `
(function() {
  function initTheme() {
    try {
      const savedTheme = localStorage.getItem('underlay-theme');
      const theme = savedTheme || 'glass';

      if (theme === 'dark-cinematic') {
        document.documentElement.classList.add('theme-dark', 'theme-dark-cinematic');
      } else if (theme === 'dark') {
        document.documentElement.classList.add('theme-dark');
      } else {
        document.documentElement.classList.add('theme-glass');
      }
    } catch (e) {
      document.documentElement.classList.add('theme-glass');
    }
  }

  initTheme();
})();
`;
