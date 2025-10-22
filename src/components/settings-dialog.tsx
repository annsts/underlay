'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import GlassButton from '@/components/ui/glass/button';
import { GlassPanel } from '@/components/ui/glass/panel';
import GlassToggle from '@/components/ui/glass/toggle';
import { Settings, X, Key, Save, Trash2, Eye, EyeOff, Info } from 'lucide-react';
import { getThemeClass, ThemeType } from '@/lib/theme-init';
import { PlatformConfig } from '@/lib/platform';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeType;
}

export function SettingsDialog({ isOpen, onClose, theme = 'glass' }: SettingsDialogProps) {
  const { apiKey, setApiKey, userPreferences, showTooltips, setShowTooltips, clearAllSettings, isLoading } = useSettings();

  const [tempApiKey, setTempApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen && !isLoading) {
      setTempApiKey(apiKey);
      setValidationError('');
    }
  }, [isOpen, apiKey, isLoading]);

  const validateApiKey = (key: string): string => {
    if (!key.trim()) {
      return 'API key is required';
    }
    if (!key.startsWith('AIza')) {
      return 'Google Gemini API keys typically start with "AIza"';
    }
    if (key.length < 39) {
      return 'API key appears to be too short';
    }
    return '';
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    const error = validateApiKey(tempApiKey);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSaving(true);
    setValidationError('');
    try {
      await setApiKey(tempApiKey);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      setValidationError('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    await clearAllSettings();
    setTempApiKey('');
    onClose();
  };

  const maskedApiKey = apiKey
    ? `${apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, apiKey.length - 8))}`
    : '';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm ${getThemeClass(theme)}`}
    >
      <GlassPanel className="w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Preferences Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Preferences
              </label>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <GlassToggle
                checked={showTooltips}
                onChange={setShowTooltips}
                label="Show tooltips"
              />
              <div className="text-xs mt-1.5 ml-0" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                Display helpful hints when hovering over controls
              </div>
            </div>
          </div>

          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Google Gemini API Key
              </label>
            </div>

            {apiKey && (
              <div
                className="text-xs mb-2"
                style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
              >
                Current key: {maskedApiKey}
              </div>
            )}

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={tempApiKey}
                onChange={(e) => {
                  setTempApiKey(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="Enter your Google Gemini API key"
                className={`w-full px-3 py-2 bg-white/10 border rounded-lg placeholder-white/50 focus:outline-none focus:bg-white/15 transition-all ${
                  validationError ? 'border-red-400 focus:border-red-400' : 'border-white/20'
                }`}
                style={{
                  color: 'var(--text-primary)',
                  borderColor: validationError ? undefined : 'var(--glass-border)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showApiKey ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {validationError && (
              <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                {validationError}
              </div>
            )}

            <div className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
              {PlatformConfig.isVST
                ? 'API key is stored locally and persists across plugin sessions.'
                : 'API key is stored only in this browser tab and will be cleared when you close it.'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <GlassButton
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </GlassButton>

            <GlassButton
              onClick={handleClearAll}
              variant="danger"
              className="flex items-center gap-2"
              disabled={!apiKey && Object.keys(userPreferences).length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </GlassButton>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
