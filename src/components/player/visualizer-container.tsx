'use client';

import React, { ReactNode } from 'react';
import AudioVisualizer from '@/components/audio-visualizer';
import ShaderVisualizer from '@/components/shader-visualizer';
import { ThemeType } from '@/lib/theme-init';

interface VisualizerContainerProps {
  mounted: boolean;
  theme: ThemeType;
  playback: 'playing' | 'paused' | 'stopped' | 'loading';
  windowHeight: number;
  vizCtx: AudioContext | null;
  vizTap: AudioNode | null;
  children: ReactNode;
}

/**
 * Manages two audio visualizers (Fractal Tree and Shader)
 * Handles conditional rendering based on theme and playback state
 * Wraps content with visualizer backgrounds
 */
export function VisualizerContainer({
  mounted,
  theme,
  playback,
  windowHeight,
  vizCtx,
  vizTap,
  children,
}: VisualizerContainerProps) {
  return (
    <>
      {/* Shader Visualizer - Dark Cinematic theme only */}
      {mounted && theme === 'dark-cinematic' && (
        <ShaderVisualizer
          context={vizCtx}
          tap={vizTap}
          smoothing={0.85}
          fftSize={2048}
          grainIntensity={0.35}
          colorShift={true}
          idleMode={playback === 'stopped'}
        />
      )}

      {/* Full viewport background */}
      <div
        className="min-h-screen min-h-[100dvh] relative overflow-hidden"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95))',
        }}
      >
        {/* Audio Visualization Background */}
        {mounted && (
          <div className="viz-background">
            {/* Fractal Tree Visualizer (layered on top) */}
            <div
              className={`viz-canvas ${playback === 'playing' ? 'active' : playback === 'stopped' ? 'idle' : ''}`}
            >
              <AudioVisualizer
                context={vizCtx}
                tap={vizTap}
                smoothing={0.85}
                fftSize={1024}
                height={windowHeight}
                idleMode={playback === 'stopped'}
              />
            </div>
          </div>
        )}

        {/* Background Overlays */}
        <div
          className="fixed inset-0 z-2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.05), transparent 70%)',
          }}
        />
        <div className={`fixed inset-0 z-2 ${playback === 'stopped' ? 'idle-gradient-1' : ''}`} />
        <div className={`fixed inset-0 z-2 ${playback === 'stopped' ? 'idle-gradient-2' : ''}`} />
        {playback !== 'stopped' && (
          <>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(236,72,153,0.06),transparent_60%)] z-2" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(109,159,104,0.08),transparent_60%)] z-2" />
          </>
        )}

        {/* Plugin Container */}
        {mounted && (
          <div
            className="fixed inset-0 z-5"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(40px) saturate(120%)',
              WebkitBackdropFilter: 'blur(40px) saturate(120%)',
            }}
          />
        )}
        {children}
      </div>
    </>
  );
}
