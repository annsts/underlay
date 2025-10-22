import { useState, useEffect } from 'react';
import { PlatformConfig } from '@/lib/platform';

interface UserPreferences {
  showTooltips?: boolean;
  [key: string]: unknown;
}

interface UseSettingsReturn {
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  userPreferences: UserPreferences;
  setUserPreferences: (prefs: UserPreferences) => Promise<void>;
  showTooltips: boolean;
  setShowTooltips: (show: boolean) => Promise<void>;
  clearAllSettings: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Get the appropriate storage API based on platform
 * - VST: localStorage (persists across sessions)
 * - Web: sessionStorage (secure, cleared on tab close)
 */
function getStorage(): Storage {
  if (typeof window === 'undefined') {
    // SSR fallback - return a mock storage
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
  }
  return PlatformConfig.isVST ? localStorage : sessionStorage;
}

export function useSettings(): UseSettingsReturn {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [userPreferences, setUserPreferencesState] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();

    // Listen for settings updates from other hook instances
    if (typeof window !== 'undefined') {
      const handleSettingsUpdate = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail?.apiKey !== undefined) {
          setApiKeyState(customEvent.detail.apiKey);
        }
      };
      window.addEventListener('settings-updated', handleSettingsUpdate);
      return () => window.removeEventListener('settings-updated', handleSettingsUpdate);
    }
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const storage = getStorage();
      const savedApiKey = storage.getItem('underlay-api-key') || '';
      const savedPrefs = JSON.parse(storage.getItem('underlay-preferences') || '{}');
      // Default showTooltips to true if not set
      if (savedPrefs.showTooltips === undefined) {
        savedPrefs.showTooltips = true;
      }
      setApiKeyState(savedApiKey);
      setUserPreferencesState(savedPrefs);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setApiKey = async (key: string) => {
    try {
      const storage = getStorage();
      storage.setItem('underlay-api-key', key);
      setApiKeyState(key);

      // Notify other hook instances of the change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: { apiKey: key } }));
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  const setUserPreferences = async (prefs: UserPreferences) => {
    try {
      const storage = getStorage();
      storage.setItem('underlay-preferences', JSON.stringify(prefs));
      setUserPreferencesState(prefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const setShowTooltips = async (show: boolean) => {
    const newPrefs = { ...userPreferences, showTooltips: show };
    await setUserPreferences(newPrefs);

    // Notify tooltip context of the change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tooltip-preference-changed', { detail: { showTooltips: show } }));
    }
  };

  const clearAllSettings = async () => {
    try {
      const storage = getStorage();
      storage.removeItem('underlay-api-key');
      storage.removeItem('underlay-preferences');
      setApiKeyState('');
      setUserPreferencesState({});

      // Notify other hook instances that API key was cleared
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: { apiKey: '' } }));
      }
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  };

  return {
    apiKey,
    setApiKey,
    userPreferences,
    setUserPreferences,
    showTooltips: userPreferences.showTooltips ?? true,
    setShowTooltips,
    clearAllSettings,
    isLoading,
  };
}
