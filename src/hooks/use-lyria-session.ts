import { useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI, LiveMusicSession, LiveMusicServerMessage, AudioChunk } from '@google/genai';
import { Layer, GlobalConfig } from '@/types/lyria';
import { MODEL, API_VERSION } from '@/lib/constants';

interface UseLyriaSessionProps {
  apiKey: string | null;
  onMessage: (msg: LiveMusicServerMessage) => void;
  onError: () => void;
  onClose: () => void;
  scheduleChunks: (chunks: AudioChunk[]) => Promise<void>;
}

export function useLyriaSession({
  apiKey,
  onMessage,
  onError,
  onClose,
  scheduleChunks,
}: UseLyriaSessionProps) {
  const sessionRef = useRef<LiveMusicSession | null>(null);

  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);
  const scheduleChunksRef = useRef(scheduleChunks);

  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onCloseRef.current = onClose;
  scheduleChunksRef.current = scheduleChunks;

  const ai = useMemo(() => {
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey, apiVersion: API_VERSION });
  }, [apiKey]);

  const ensureSession = useCallback(async () => {
    if (!ai) throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY');
    if (sessionRef.current) {
      return sessionRef.current;
    }

    let resolveSetup: () => void;
    const setupCompletePromise = new Promise<void>((resolve) => {
      resolveSetup = resolve;
    });

    const session = await ai.live.music.connect({
      model: MODEL,
      callbacks: {
        onmessage: async (msg: LiveMusicServerMessage) => {
          if (msg.setupComplete) {
            resolveSetup();
          }
          onMessageRef.current(msg);
          const audio = msg.serverContent?.audioChunks;
          if (audio?.length) {
            await scheduleChunksRef.current(audio);
          }
        },
        onerror: (error) => {
          onErrorRef.current();
        },
        onclose: () => {
          sessionRef.current = null;
          onCloseRef.current();
        },
      },
    });

    sessionRef.current = session;

    await setupCompletePromise;

    return session;
  }, [ai]);

  const buildWeightedPrompts = useCallback((layers: Layer[]) => {
    const enabled = layers.filter((layer) => layer.enabled && layer.weight > 0);
    if (enabled.length === 0) return [];
    const sum = enabled.reduce((acc, layer) => acc + layer.weight, 0);
    return enabled.map((layer) => ({
      text: layer.text,
      weight: Math.max(0.001, layer.weight / (sum || 1)),
    }));
  }, []);

  const sendWeightedPrompts = useCallback(
    async (layers: Layer[]) => {
      if (!sessionRef.current) return;
      const weightedPrompts = buildWeightedPrompts(layers);
      if (weightedPrompts.length === 0) {
        await sessionRef.current.pause();
        return;
      }
      await sessionRef.current.setWeightedPrompts({ weightedPrompts });
    },
    [buildWeightedPrompts]
  );

  const sendConfig = useCallback(
    async (
      cfg: GlobalConfig,
      opts?: {
        maybeResetForDrastic?: boolean;
        lastBpm?: number;
        lastScale?: string | number;
      }
    ) => {
      if (!sessionRef.current) return;

      const musicConfig: Record<string, number | string | boolean> = {
        bpm: cfg.bpm,
        guidance: cfg.guidance,
        temperature: cfg.temperature,
        topK: cfg.topK,
        seed: cfg.seed,
        scale: cfg.scale,
        musicGenerationMode: cfg.musicGenerationMode,
        muteBass: cfg.muteBass,
        muteDrums: cfg.muteDrums,
        onlyBassAndDrums: cfg.onlyBassAndDrums,
      };

      if (cfg.density > 0) musicConfig.density = cfg.density;
      if (cfg.brightness > 0) musicConfig.brightness = cfg.brightness;

      await sessionRef.current.setMusicGenerationConfig({
        musicGenerationConfig: musicConfig,
      });

      if (
        opts?.maybeResetForDrastic &&
        opts.lastBpm !== undefined &&
        opts.lastScale !== undefined
      ) {
        const bpmChanged = cfg.bpm !== opts.lastBpm;
        const scaleChanged = cfg.scale !== opts.lastScale;
        if (bpmChanged || scaleChanged) {
          await sessionRef.current.resetContext();
          return { bpmChanged, scaleChanged };
        }
      }
      return { bpmChanged: false, scaleChanged: false };
    },
    []
  );

  const resetContext = useCallback(async () => {
    if (!sessionRef.current) return;
    await sessionRef.current.resetContext();
  }, []);

  const play = useCallback(() => {
    sessionRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    sessionRef.current?.pause();
  }, []);

  const stop = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      await sessionRef.current.stop();
    } catch (err) {
      console.error('Error stopping session:', err);
    }
  }, []);

  const closeSession = useCallback(async () => {
    if (!sessionRef.current) return;

    const session = sessionRef.current;
    sessionRef.current = null;

    try {
      await session.stop();
      session.close?.();
    } catch (err) {
      console.error('[Lyria] Error closing session:', err);
    }
  }, []);

  return {
    sessionRef,
    ensureSession,
    buildWeightedPrompts,
    sendWeightedPrompts,
    sendConfig,
    resetContext,
    play,
    pause,
    stop,
    closeSession,
  };
}
