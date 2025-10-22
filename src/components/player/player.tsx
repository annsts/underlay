'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MusicGenerationMode, Scale } from '@google/genai';
import { useSettings } from '@/hooks/use-settings';
import { useAudioSession } from '@/hooks/use-audio-session';
import { useSessionTimer } from '@/hooks/use-session-timer';
import { useLyriaSession } from '@/hooks/use-lyria-session';
import { Layer, GlobalConfig, PlaybackState } from '@/types/lyria';
import { cryptoRandomId } from '@/lib/utils';
import {
  initializeTheme,
  saveTheme,
  applyThemeClass,
  getNextTheme,
  ThemeType,
} from '@/lib/theme-init';
import HelpDialog from '@/components/help-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { TransportHeader } from './transport-header';
import { PayloadDisplay } from './payload-display';
import { NotificationToast } from './notification-toast';
import { SessionControls } from './session-controls';
import { LayerManager } from './layer-manager';
import { ConfigPanel } from './config-panel';
import { VisualizerContainer } from './visualizer-container';
import { useVSTSync, setVSTParameter } from '@/hooks/use-vst-sync';
import { PlatformConfig } from '@/lib/platform';

const VST_PARAM = {
  BPM: 100,
  DENSITY: 101,
  BRIGHTNESS: 102,
  GUIDANCE: 103,
  TEMPERATURE: 104,
  TOP_K: 105,
  VOLUME: 109,
  MUTE_BASS: 110,
  MUTE_DRUMS: 111,
  ONLY_BASS_DRUMS: 112,
} as const;

export default function Player() {
  const { apiKey, isLoading: settingsLoading } = useSettings();

  const [playback, setPlayback] = useState<PlaybackState>('stopped');
  const [error, setError] = useState<string | null>(null);
  const [filteredNotice, setFilteredNotice] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(80);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>(
    'disconnected'
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [windowHeight, setWindowHeight] = useState(800);
  const [mounted, setMounted] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('underlay-theme') as ThemeType | null;
      return saved || 'glass';
    }
    return 'glass';
  });
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);

  const [layers, setLayers] = useState<Layer[]>([
    { id: cryptoRandomId(), text: 'dreamy synth pads', weight: 1.0, enabled: true },
    { id: cryptoRandomId(), text: 'soft piano melody', weight: 0.8, enabled: true },
  ]);

  const [cfg, setCfg] = useState<GlobalConfig>(() => {
    const getInitialSeed = () => {
      if (typeof window === 'undefined') {
        return 1234567890;
      }
      const stored = sessionStorage.getItem('underlay-initial-seed');
      if (stored) {
        return parseInt(stored, 10);
      }
      const newSeed = Math.floor(Math.random() * 2_147_483_647);
      sessionStorage.setItem('underlay-initial-seed', String(newSeed));
      return newSeed;
    };

    return {
      bpm: 120,
      density: 0,
      brightness: 0,
      guidance: 4.0,
      temperature: 1.1,
      topK: 40,
      seed: getInitialSeed(),
      scale: Scale.SCALE_UNSPECIFIED,
      musicGenerationMode: MusicGenerationMode.QUALITY,
      muteBass: false,
      muteDrums: false,
      onlyBassAndDrums: false,
    };
  });

  const lastBpmRef = useRef(cfg.bpm);
  const lastScaleRef = useRef(cfg.scale);
  const layersRef = useRef(layers);
  const cfgRef = useRef(cfg);
  const lastApiKeyRef = useRef<string | null>(null);

  const audioSession = useAudioSession();
  const sessionTimer = useSessionTimer();

  const hardStopRef = useRef<(() => void) | null>(null);

  const {
    sessionRef,
    ensureSession,
    sendWeightedPrompts,
    sendConfig,
    play: sessionPlay,
    pause: sessionPause,
    closeSession,
  } = useLyriaSession({
    apiKey,
    onMessage: (msg) => {
      if (!sessionRef.current) return;

      if (msg.filteredPrompt) {
        setFilteredNotice(msg.filteredPrompt.filteredReason || 'Layer filtered by safety.');
      }
      const audio = msg.serverContent?.audioChunks;
      if (audio?.length) {
        audioSession.scheduleChunks(
          audio,
          setPlayback,
          setConnectionStatus,
          sessionTimer.startSessionTimer
        );
      }
    },
    onError: () => {
      setError('Connection lost. Please check your internet connection and try again.');
      hardStopRef.current?.();
    },
    onClose: () => {
      setError('Session ended. The Lyria API connection was closed.');
      if (autoReconnect && playback === 'playing') {
        setTimeout(() => handleSessionExpiry(), 1000);
      } else {
        hardStopRef.current?.();
      }
    },
    scheduleChunks: async (chunks) => {
      if (!sessionRef.current) return;

      await audioSession.scheduleChunks(
        chunks,
        setPlayback,
        setConnectionStatus,
        sessionTimer.startSessionTimer
      );
    },
  });

  useEffect(() => {
    if (lastApiKeyRef.current !== null && lastApiKeyRef.current !== apiKey) {
      if (sessionRef.current) {
        const wasPlaying = playback === 'playing';

        closeSession();

        if (wasPlaying && apiKey && apiKey.trim()) {
          setPlayback('loading');

          (async () => {
            try {
              await ensureSession();
              await sendWeightedPrompts(layersRef.current);
              await sendConfig(cfgRef.current);
              sessionPlay();
              setError(null);
            } catch (err) {
              console.error('Failed to reconnect with new API key:', err);
              setError(
                err instanceof Error ? err.message : 'Failed to connect with new API key'
              );
              hardStopRef.current?.();
            }
          })();
        } else if (wasPlaying) {
          setPlayback('stopped');
        }
      }
    }

    lastApiKeyRef.current = apiKey;
  }, [apiKey, playback, sessionRef, closeSession, ensureSession, sendWeightedPrompts, sendConfig, sessionPlay]);

  useEffect(() => {
    if ((!apiKey || !apiKey.trim()) && playback === 'loading') {
      setPlayback('stopped');
      setError('Please set your Google Gemini API key in Settings');
    }
  }, [apiKey, playback]);

  useEffect(() => {
    layersRef.current = layers;
    cfgRef.current = cfg;
  }, [layers, cfg]);

  const hardStop = useCallback(() => {
    closeSession();
    audioSession.setStoppedState();
    sessionTimer.stopSessionTimer();
    setPlayback('stopped');
    setConnectionStatus('disconnected');
    audioSession.stopAllSources();
    audioSession.resetNextStartTime();

    try {
      audioSession.fadeTo(0, 90);
    } catch {}
    audioSession.disconnectAudio();
    audioSession.clearVisualizerTap();
  }, [audioSession, sessionTimer, closeSession]);

  hardStopRef.current = hardStop;

  const handleSessionExpiry = useCallback(async () => {
    closeSession();

    if (autoReconnect) {
      setError('Session expired (10-minute limit). Reconnecting...');
      try {
        await ensureSession();
        await sendWeightedPrompts(layersRef.current);
        await sendConfig(cfgRef.current);
        sessionPlay();
        setError(null);
      } catch (err) {
        console.error('Auto-reconnect failed:', err);
        setError('Auto-reconnect failed. Please click play to reconnect manually.');
        hardStop();
      }
    } else {
      setError('Session expired (10-minute limit). Click play to start a new session.');
      hardStop();
    }
  }, [
    autoReconnect,
    ensureSession,
    sendWeightedPrompts,
    sendConfig,
    sessionPlay,
    hardStop,
    closeSession,
  ]);

  const play = async () => {
    try {
      if (!apiKey || !apiKey.trim()) {
        setError('Please set your Google Gemini API key in Settings');
        return;
      }

      setPlayback('loading');

      audioSession.setPlayingState();

      audioSession.ensureAudio(volume);
      await audioSession.resumeAudioContext();

      await ensureSession();
      setError(null);
      setFilteredNotice(null);

      await sendWeightedPrompts(layers);
      await sendConfig(cfg);

      sessionPlay();
      audioSession.fadeTo(volume / 100, 120);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start.');
      hardStop();
    }
  };

  const pause = () => {
    audioSession.setStoppedState();
    sessionPause();
    sessionTimer.stopSessionTimer();
    setPlayback('paused');
    setConnectionStatus('disconnected');
    audioSession.stopAllSources();
    audioSession.resetNextStartTime();
    audioSession.fadeTo(0, 100);
  };

  const stop = () => {
    closeSession();
    audioSession.setStoppedState();
    sessionTimer.stopSessionTimer();
    setPlayback('stopped');
    setConnectionStatus('disconnected');
    audioSession.stopAllSources();
    audioSession.fadeTo(0, 50);
    audioSession.resetNextStartTime();
  };

  const toggle = () => {
    if (!apiKey || !apiKey.trim()) {
      setPlayback('stopped');
      setError('Please set your Google Gemini API key in Settings');
      return;
    }

    if (playback === 'playing') return pause();
    if (playback === 'paused' || playback === 'stopped') {
      return play();
    }
    return stop();
  };

  useEffect(() => {
    if (!sessionRef.current) return;
    if (playback !== 'playing') return;
    const id = setTimeout(async () => {
      const result = await sendConfig(cfg, {
        maybeResetForDrastic: true,
        lastBpm: lastBpmRef.current,
        lastScale: lastScaleRef.current,
      });

      if (result?.bpmChanged) lastBpmRef.current = cfg.bpm;
      if (result?.scaleChanged) lastScaleRef.current = cfg.scale;
    }, 2000);
    return () => clearTimeout(id);
  }, [
    cfg,
    sessionRef,
    playback,
    sendConfig,
  ]);

  useEffect(() => {
    audioSession.updateVolume(volume);
  }, [volume, audioSession]);

  useEffect(() => {
    if (!settingsLoading && mounted) {
      const savedTheme = initializeTheme();
      setTheme(savedTheme);
    }
  }, [settingsLoading, mounted]);

  useEffect(() => {
    if (mounted) {
      saveTheme(theme);
      applyThemeClass(theme);
    }
  }, [theme, mounted]);

  useEffect(() => {
    const updateHeight = () => setWindowHeight(window.innerHeight);
    setMounted(true);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    if (sessionTimer.sessionTimeRemaining === 0 && autoReconnect && playback === 'playing') {
      handleSessionExpiry();
    }
  }, [sessionTimer.sessionTimeRemaining, autoReconnect, playback, handleSessionExpiry]);

  useEffect(() => {
    return () => {
      if (sessionTimer.stopSessionTimer) {
        sessionTimer.stopSessionTimer();
      }
      closeSession();
      audioSession.disconnectAudio();
      audioSession.closeAudioContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedWeights = useMemo(() => {
    const enabled = layers.filter((l) => l.enabled && l.weight > 0);
    const sum = enabled.reduce((a, l) => a + l.weight, 0);
    const map = new Map<string, number>();
    layers.forEach((l) => {
      if (!l.enabled || l.weight <= 0) map.set(l.id, 0);
      else map.set(l.id, l.weight / (sum || 1));
    });
    return map;
  }, [layers]);

  const handleLayerError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 2500);
  }, []);

  const handleConfigChange = (patch: Partial<GlobalConfig>) => {
    setCfg((c) => ({ ...c, ...patch }));

    if (PlatformConfig.isVST) {
      if ('bpm' in patch) setVSTParameter(VST_PARAM.BPM, ((patch.bpm ?? 120) - 60) / 140);
      if ('density' in patch) setVSTParameter(VST_PARAM.DENSITY, patch.density ?? 0.6);
      if ('brightness' in patch) setVSTParameter(VST_PARAM.BRIGHTNESS, patch.brightness ?? 0.5);
      if ('guidance' in patch) setVSTParameter(VST_PARAM.GUIDANCE, (patch.guidance ?? 4.0) / 6);
      if ('temperature' in patch) setVSTParameter(VST_PARAM.TEMPERATURE, (patch.temperature ?? 1.1) / 3);
      if ('topK' in patch) setVSTParameter(VST_PARAM.TOP_K, ((patch.topK ?? 40) - 1) / 999);
      if ('muteBass' in patch) setVSTParameter(VST_PARAM.MUTE_BASS, patch.muteBass ? 1 : 0);
      if ('muteDrums' in patch) setVSTParameter(VST_PARAM.MUTE_DRUMS, patch.muteDrums ? 1 : 0);
      if ('onlyBassAndDrums' in patch)
        setVSTParameter(VST_PARAM.ONLY_BASS_DRUMS, patch.onlyBassAndDrums ? 1 : 0);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (PlatformConfig.isVST) {
      setVSTParameter(VST_PARAM.VOLUME, vol / 100);
    }
  };

  useVSTSync(
    useCallback((paramId: number, normalizedValue: number) => {
      switch (paramId) {
        case VST_PARAM.BPM:
          setCfg((c) => ({ ...c, bpm: Math.round(60 + normalizedValue * 140) }));
          break;
        case VST_PARAM.DENSITY:
          setCfg((c) => ({ ...c, density: normalizedValue }));
          break;
        case VST_PARAM.BRIGHTNESS:
          setCfg((c) => ({ ...c, brightness: normalizedValue }));
          break;
        case VST_PARAM.GUIDANCE:
          setCfg((c) => ({ ...c, guidance: normalizedValue * 6 }));
          break;
        case VST_PARAM.TEMPERATURE:
          setCfg((c) => ({ ...c, temperature: normalizedValue * 3 }));
          break;
        case VST_PARAM.TOP_K:
          setCfg((c) => ({ ...c, topK: Math.round(1 + normalizedValue * 999) }));
          break;
        case VST_PARAM.VOLUME:
          setVolume(Math.round(normalizedValue * 100));
          break;
        case VST_PARAM.MUTE_BASS:
          setCfg((c) => ({ ...c, muteBass: normalizedValue > 0.5 }));
          break;
        case VST_PARAM.MUTE_DRUMS:
          setCfg((c) => ({ ...c, muteDrums: normalizedValue > 0.5 }));
          break;
        case VST_PARAM.ONLY_BASS_DRUMS:
          setCfg((c) => ({ ...c, onlyBassAndDrums: normalizedValue > 0.5 }));
          break;
      }
    }, [])
  );

  return (
    <>
      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} theme={theme} />
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} theme={theme} />

      <VisualizerContainer
        mounted={mounted}
        theme={theme}
        playback={playback}
        windowHeight={windowHeight}
        vizCtx={audioSession.vizCtx}
        vizTap={audioSession.vizTap}
      >
        <div className="relative z-10 min-h-screen min-h-[100dvh] flex items-start md:items-center justify-center p-3 md:p-6 py-4 md:py-6">
          <div className="w-full max-w-[960px] mx-auto flex flex-col min-h-0">
            <TransportHeader
              playback={playback}
              volume={volume}
              config={cfg}
              mounted={mounted}
              apiKey={apiKey}
              sessionTimeRemaining={sessionTimer.sessionTimeRemaining}
              autoReconnect={autoReconnect}
              theme={theme}
              onTogglePlayback={toggle}
              onVolumeChange={handleVolumeChange}
              onConfigChange={handleConfigChange}
              onShowSettings={() => setShowSettings(true)}
              onShowHelp={() => setShowHelp(true)}
              onThemeChange={() => setTheme(getNextTheme)}
              onAutoReconnectChange={setAutoReconnect}
              formatTimeRemaining={sessionTimer.formatTimeRemaining}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-min md:h-[500px]">
              <div className="md:col-span-2 flex flex-col gap-3 h-auto md:h-full min-w-0">
                <LayerManager
                  layers={layers}
                  playback={playback}
                  onLayersChange={setLayers}
                  onError={handleLayerError}
                  sendWeightedPrompts={sendWeightedPrompts}
                />
              </div>

              <ConfigPanel config={cfg} onConfigChange={handleConfigChange} />
            </div>
          </div>
        </div>
      </VisualizerContainer>

      <button
        onClick={() => setShowPayload(!showPayload)}
        className={`fixed bottom-4 left-4 z-50 glass-button flex items-center justify-center transition-all duration-300 ${
          showPayload ? 'bg-white/20 scale-110' : 'hover:bg-white/15'
        }`}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          padding: '0',
          minHeight: '32px',
          minWidth: '32px',
        }}
        title="Toggle Payload View"
      >
        <span className="text-[10px] font-mono font-semibold">{'{}'}</span>
      </button>

      {showPayload && (
        <PayloadDisplay
          playback={playback}
          layers={layers}
          config={cfg}
          volume={volume}
          connectionStatus={connectionStatus}
          sessionTimeRemaining={sessionTimer.sessionTimeRemaining}
          autoReconnect={autoReconnect}
          normalizedWeights={normalizedWeights}
        />
      )}

      <NotificationToast message={error} type="error" onDismiss={() => setError(null)} />
      <NotificationToast
        message={filteredNotice}
        type="warning"
        onDismiss={() => setFilteredNotice(null)}
      />

      <SessionControls mounted={mounted} apiKey={apiKey} onShowSettings={() => setShowSettings(true)} />
    </>
  );
}
