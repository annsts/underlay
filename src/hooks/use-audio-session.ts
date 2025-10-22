import { useCallback, useRef, useState } from 'react';
import { AudioChunk } from '@google/genai';
import { decodeBase64PCMToAudioBuffer } from '@/lib/utils';
import { PlaybackState } from '@/types/lyria';
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from '@/lib/constants';
import { PlatformConfig } from '@/lib/platform';

export function useAudioSession() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const bufferLeadRef = useRef<number>(1.8);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const processedChunksRef = useRef<Set<string>>(new Set());
  const isStoppedRef = useRef<boolean>(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [vizCtx, setVizCtx] = useState<AudioContext | null>(null);
  const [vizTap, setVizTap] = useState<AudioNode | null>(null);

  const sendAudioToVST = useCallback((buffer: AudioBuffer) => {
    const hasVSTBridge = typeof window !== 'undefined' && window.webkit?.messageHandlers?.vstHost !== undefined;

    if (!hasVSTBridge) {
      return;
    }

    try {
      const leftChannel = buffer.getChannelData(0);
      const rightChannel = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftChannel;

      const leftArray = Array.from(leftChannel);
      const rightArray = Array.from(rightChannel);

      if (window.webkit?.messageHandlers?.vstHost) {
        window.webkit.messageHandlers.vstHost.postMessage({
          type: 'audio',
          left: leftArray,
          right: rightArray,
          sampleRate: buffer.sampleRate,
        });
      }
    } catch (error) {
      console.error('[VST] Error sending audio to VST:', error);
    }
  }, []);

  const ensureAudio = useCallback((volume: number) => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    }
    if (!gainRef.current) {
      const gainNode = ctxRef.current.createGain();

      if (!PlatformConfig.isVST) {
        gainNode.connect(ctxRef.current.destination);
      }

      gainNode.gain.value = Math.max(0, Math.min(1, volume / 100));
      gainRef.current = gainNode;
      setVizCtx((prev) => (prev !== ctxRef.current ? ctxRef.current : prev));
      setVizTap((prev) => (prev !== gainRef.current ? gainRef.current : prev));
    }
  }, []);

  const fadeTo = useCallback((value: number, ms = 120) => {
    if (!ctxRef.current || !gainRef.current) return;
    const now = ctxRef.current.currentTime;
    const param = gainRef.current.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + ms / 1000);
  }, []);

  const scheduleChunks = useCallback(
    async (
      chunks: AudioChunk[],
      setPlayback: (state: PlaybackState | ((prev: PlaybackState) => PlaybackState)) => void,
      setConnectionStatus: (status: 'connected' | 'disconnected') => void,
      startSessionTimer: () => void
    ) => {
      if (isStoppedRef.current) {
        return;
      }

      if (!ctxRef.current || !gainRef.current || ctxRef.current.state === 'closed') {
        console.warn('[Audio] Cannot schedule chunks: AudioContext is not ready');
        return;
      }
      const audioContext = ctxRef.current;

      for (const chunk of chunks) {
        const base64 = chunk.data;
        if (!base64) continue;

        const chunkHash = base64.substring(0, 100);
        if (processedChunksRef.current.has(chunkHash)) {
          continue;
        }
        processedChunksRef.current.add(chunkHash);

        if (processedChunksRef.current.size > 50) {
          const firstKey = processedChunksRef.current.values().next().value;
          if (firstKey !== undefined) {
            processedChunksRef.current.delete(firstKey);
          }
        }

        const audioBuffer = await decodeBase64PCMToAudioBuffer(base64, audioContext, AUDIO_SAMPLE_RATE, AUDIO_CHANNELS);

        sendAudioToVST(audioBuffer);

        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(gainRef.current);

        sourceNodesRef.current.push(bufferSource);
        bufferSource.onended = () => {
          const idx = sourceNodesRef.current.indexOf(bufferSource);
          if (idx !== -1) sourceNodesRef.current.splice(idx, 1);
        };

        if (nextStartTimeRef.current === 0) {
          nextStartTimeRef.current = audioContext.currentTime + bufferLeadRef.current;
          setPlayback('loading');

          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }

          loadingTimeoutRef.current = setTimeout(
            () => {
              if (!isStoppedRef.current) {
                setPlayback((p: PlaybackState) => (p === 'loading' ? 'playing' : p));
                setConnectionStatus('connected');
                startSessionTimer();
              }
              loadingTimeoutRef.current = null;
            },
            Math.round(bufferLeadRef.current * 1000)
          );
        }

        if (nextStartTimeRef.current < audioContext.currentTime) {
          if (!isStoppedRef.current) {
            setPlayback('loading');
            nextStartTimeRef.current = 0;
          }
          const idx = sourceNodesRef.current.indexOf(bufferSource);
          if (idx !== -1) sourceNodesRef.current.splice(idx, 1);
          return;
        }

        bufferSource.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
      }
    },
    [sendAudioToVST]
  );

  const updateVolume = useCallback((volume: number) => {
    if (!gainRef.current || !ctxRef.current) return;
    const target = Math.max(0, Math.min(1, volume / 100));
    try {
      gainRef.current.gain.setTargetAtTime(target, ctxRef.current.currentTime, 0.02);
    } catch (error) {
      console.error('Error updating volume:', error);
    }
  }, []);

  const resetNextStartTime = useCallback(() => {
    nextStartTimeRef.current = 0;
    processedChunksRef.current.clear();
  }, []);

  const setPlayingState = useCallback(() => {
    isStoppedRef.current = false;
  }, []);

  const setStoppedState = useCallback(() => {
    isStoppedRef.current = true;
    processedChunksRef.current.clear();
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const clearVisualizerTap = useCallback(() => {
    setVizTap(null);
    setVizCtx(null);
  }, []);

  const disconnectAudio = useCallback(() => {
    try {
      gainRef.current?.disconnect();
    } catch (error) {
      console.error('Error disconnecting audio:', error);
    }
    gainRef.current = null;
  }, []);

  const closeAudioContext = useCallback(() => {
    try {
      ctxRef.current?.close();
    } catch (error) {
      console.error('Error closing audio context:', error);
    }
    ctxRef.current = null;
  }, []);

  const resumeAudioContext = useCallback(async () => {
    if (ctxRef.current) {
      await ctxRef.current.resume();
    }
  }, []);

  const stopAllSources = useCallback(() => {
    sourceNodesRef.current.forEach((source) => {
      try {
        if (source.context.state !== 'closed') {
          source.stop();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name !== 'InvalidStateError') {
          console.error('Error stopping audio source:', error);
        }
      }
    });
    sourceNodesRef.current = [];
  }, []);

  return {
    ctxRef,
    gainRef,
    vizCtx,
    vizTap,
    ensureAudio,
    fadeTo,
    scheduleChunks,
    updateVolume,
    resetNextStartTime,
    clearVisualizerTap,
    disconnectAudio,
    closeAudioContext,
    resumeAudioContext,
    stopAllSources,
    setPlayingState,
    setStoppedState,
  };
}
