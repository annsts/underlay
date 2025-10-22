import React from 'react';
import { Play, Pause, Volume2, HelpCircle, Settings, Sparkles } from 'lucide-react';
import { Scale } from '@google/genai';
import { PlaybackState, GlobalConfig } from '@/types/lyria';
import { SCALE_OPTIONS } from '@/lib/utils';
import { GlassSlider, GlassSelect } from '@/components/ui/glass';
import { NumericDragInput } from '@/components/ui/glass';
import GlassPanel from '@/components/ui/glass/panel';
import { SessionStatus } from './session-status';
import { ThemeType } from '@/lib/theme-init';
import { usePlatform } from '@/contexts/platform-context';

interface TransportHeaderProps {
  playback: PlaybackState;
  volume: number;
  config: GlobalConfig;
  mounted: boolean;
  apiKey: string | null;
  sessionTimeRemaining: number | null;
  autoReconnect: boolean;
  theme: ThemeType;
  onTogglePlayback: () => void;
  onVolumeChange: (volume: number) => void;
  onConfigChange: (patch: Partial<GlobalConfig>) => void;
  onShowSettings: () => void;
  onShowHelp: () => void;
  onThemeChange: () => void;
  onAutoReconnectChange: (value: boolean) => void;
  formatTimeRemaining: (seconds: number | null) => string;
}

export function TransportHeader({
  playback,
  volume,
  config,
  mounted,
  apiKey,
  sessionTimeRemaining,
  autoReconnect,
  onTogglePlayback,
  onVolumeChange,
  onConfigChange,
  onShowSettings,
  onShowHelp,
  onThemeChange,
  onAutoReconnectChange,
  formatTimeRemaining,
}: TransportHeaderProps) {
  const { isVST } = usePlatform();
  return (
    <header className="mb-4">
      <GlassPanel className="p-4">
        {!isVST && <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onTogglePlayback}
              disabled={!mounted || !apiKey || !apiKey.trim()}
              className={`glass-button-primary w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                playback === 'playing' ? 'animate-pulse shadow-xl' : ''
              } ${mounted && (!apiKey || !apiKey.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {playback === 'playing' ? (
                <Pause className="w-5 h-5" />
              ) : playback === 'loading' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <div className="flex items-center gap-2 flex-1">
              <Volume2 className="w-4 h-4 flex-shrink-0" />
              <GlassSlider
                value={volume}
                onChange={onVolumeChange}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span
                className="text-xs font-mono w-10 flex-shrink-0"
                style={{ color: 'var(--text-primary)' }}
              >
                {Math.round(volume)}%
              </span>
            </div>

            <button
              onClick={onShowSettings}
              className="glass-button glass-button-small flex-shrink-0 relative"
              title={`Settings ${mounted && apiKey ? '(API key configured)' : '(Setup required)'}`}
            >
              <Settings className="w-4 h-4" />
              {mounted && apiKey && (
                <span
                  className="w-1.5 h-1.5 rounded-full absolute top-0.5 right-0.5"
                  style={{ backgroundColor: 'var(--status-success-bg)', opacity: 0.6 }}
                ></span>
              )}
              {mounted && !apiKey && (
                <span
                  className="w-1.5 h-1.5 rounded-full absolute top-0.5 right-0.5 animate-pulse"
                  style={{ backgroundColor: 'var(--status-danger-bg)', opacity: 0.8 }}
                ></span>
              )}
            </button>

            <button
              onClick={onShowHelp}
              className="glass-button glass-button-small flex-shrink-0"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onThemeChange}
              className="glass-button glass-button-small flex-shrink-0"
              title="Toggle Theme"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center gap-2">
              <NumericDragInput
                value={config.bpm}
                onChange={(bpm) => onConfigChange({ bpm })}
                min={60}
                max={200}
                title="Click to edit, or drag to adjust"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Scale
              </span>
              <GlassSelect
                value={config.scale}
                onChange={(v) => onConfigChange({ scale: v as Scale })}
                options={SCALE_OPTIONS}
                minWidth={170}
                maxWidth={170}
                fitContent={false}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center pt-2 border-t border-white/10">
            <SessionStatus
              timeRemaining={sessionTimeRemaining}
              autoReconnect={autoReconnect}
              onAutoReconnectChange={onAutoReconnectChange}
              formatTime={formatTimeRemaining}
            />
          </div>
        </div>}

        <div className={isVST ? "block" : "hidden md:block"}>
          <div className={isVST ? "flex items-center justify-between gap-3 flex-nowrap" : "flex items-center justify-between gap-1.5 lg:gap-3 flex-nowrap"}>
            <div className={isVST ? "flex items-center gap-3 flex-shrink-0" : "flex items-center gap-1.5 lg:gap-3 flex-shrink-0"}>
              <button
                onClick={onTogglePlayback}
                disabled={!mounted || !apiKey || !apiKey.trim()}
                className={`glass-button-primary w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  playback === 'playing' ? 'animate-pulse shadow-xl' : ''
                } ${mounted && (!apiKey || !apiKey.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {playback === 'playing' ? (
                  <Pause className="w-5 h-5" />
                ) : playback === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
            </div>

            <div className={isVST ? "flex items-center gap-3 flex-shrink min-w-0" : "flex items-center gap-1.5 lg:gap-3 flex-shrink min-w-0"}>
              <div className={isVST ? "flex items-center gap-2 flex-shrink-0" : "flex items-center gap-1 lg:gap-2 flex-shrink-0"}>
                <span
                  className={isVST ? "text-sm font-semibold whitespace-nowrap inline" : "text-sm font-semibold whitespace-nowrap hidden lg:inline"}
                  style={{ color: 'var(--text-primary)' }}
                >
                  BPM
                </span>
                <NumericDragInput
                  value={config.bpm}
                  onChange={(bpm) => onConfigChange({ bpm })}
                  min={60}
                  max={200}
                  title="Click to edit, or drag to adjust"
                />
              </div>

              <div className={isVST ? "flex items-center gap-2 min-w-0 flex-shrink" : "flex items-center gap-1 lg:gap-2 min-w-0 flex-shrink"}>
                <span
                  className={isVST ? "text-sm font-semibold whitespace-nowrap inline" : "text-sm font-semibold whitespace-nowrap hidden lg:inline"}
                  style={{ color: 'var(--text-primary)' }}
                >
                  Scale
                </span>
                <GlassSelect
                  value={config.scale}
                  onChange={(v) => onConfigChange({ scale: v as Scale })}
                  options={SCALE_OPTIONS}
                  minWidth={170}
                  maxWidth={170}
                  fitContent={false}
                  className="text-sm"
                />
              </div>

              <div className={isVST ? "flex items-center ml-2 pl-3 border-l border-white/10 flex-shrink-0" : "hidden lg:flex items-center ml-2 pl-3 border-l border-white/10 flex-shrink-0"}>
                <SessionStatus
                  timeRemaining={sessionTimeRemaining}
                  autoReconnect={autoReconnect}
                  onAutoReconnectChange={onAutoReconnectChange}
                  formatTime={formatTimeRemaining}
                />
              </div>
            </div>

            <div className={isVST ? "flex items-center gap-3 flex-shrink-0" : "flex items-center gap-1.5 lg:gap-3 flex-shrink-0"}>
              <div className={isVST ? "flex items-center gap-2" : "hidden lg:flex items-center gap-2"}>
                <Volume2 className="w-4 h-4" />
                <GlassSlider
                  value={volume}
                  onChange={onVolumeChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-20"
                />
                <span className="text-xs font-mono w-10" style={{ color: 'var(--text-primary)' }}>
                  {Math.round(volume)}%
                </span>
              </div>

              <button
                onClick={onShowSettings}
                className="glass-button glass-button-small relative flex-shrink-0"
                title={`Settings ${mounted && apiKey ? '(API key configured)' : '(Setup required)'}`}
              >
                <Settings className="w-4 h-4" />
                {mounted && apiKey && (
                  <span
                    className="w-1.5 h-1.5 rounded-full absolute top-0.5 right-0.5"
                    style={{ backgroundColor: 'var(--status-success-bg)', opacity: 0.6 }}
                  ></span>
                )}
                {mounted && !apiKey && (
                  <span
                    className="w-1.5 h-1.5 rounded-full absolute top-0.5 right-0.5 animate-pulse"
                    style={{ backgroundColor: 'var(--status-danger-bg)', opacity: 0.8 }}
                  ></span>
                )}
              </button>

              <button
                onClick={onShowHelp}
                className="glass-button glass-button-small flex-shrink-0"
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={onThemeChange}
                className="glass-button glass-button-small flex-shrink-0"
                title="Toggle Theme"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:hidden space-y-2 mt-2">
            <div className="flex justify-center pt-2 border-t border-white/10">
              <SessionStatus
                timeRemaining={sessionTimeRemaining}
                autoReconnect={autoReconnect}
                onAutoReconnectChange={onAutoReconnectChange}
                formatTime={formatTimeRemaining}
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <Volume2 className="w-4 h-4 flex-shrink-0" />
              <GlassSlider
                value={volume}
                onChange={onVolumeChange}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span
                className="text-xs font-mono w-10 flex-shrink-0"
                style={{ color: 'var(--text-primary)' }}
              >
                {Math.round(volume)}%
              </span>
            </div>
          </div>
        </div>
      </GlassPanel>
    </header>
  );
}
