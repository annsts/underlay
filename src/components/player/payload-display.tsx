import React, { useMemo } from 'react';
import { Layer, GlobalConfig, PlaybackState } from '@/types/lyria';

interface PayloadDisplayProps {
  playback: PlaybackState;
  layers: Layer[];
  config: GlobalConfig;
  volume: number;
  connectionStatus: 'connected' | 'disconnected';
  sessionTimeRemaining: number | null;
  autoReconnect: boolean;
  normalizedWeights: Map<string, number>;
}

export function PayloadDisplay({
  playback,
  layers,
  config,
  volume,
  connectionStatus,
  sessionTimeRemaining,
  autoReconnect,
  normalizedWeights,
}: PayloadDisplayProps) {
  useMemo(() => {
    const activeLayers = layers.filter((l) => l.enabled && l.text.trim());
    return {
      status: playback,
      layers: activeLayers.map((l) => ({ text: l.text, weight: l.weight })),
      config: {
        bpm: config.bpm,
        scale: config.scale,
        mode: config.musicGenerationMode,
        density: config.density,
        brightness: config.brightness,
        guidance: config.guidance,
        temperature: config.temperature,
        topK: config.topK,
        seed: config.seed,
        flags: {
          muteBass: config.muteBass,
          muteDrums: config.muteDrums,
          onlyBassAndDrums: config.onlyBassAndDrums,
        },
      },
      volume: volume,
      connection: connectionStatus,
      session: {
        timeRemaining: sessionTimeRemaining,
        autoReconnect: autoReconnect,
      },
    };
  }, [playback, layers, config, volume, connectionStatus, sessionTimeRemaining, autoReconnect]);

  return (
    <div className="json-payload-overlay fixed inset-y-0 left-0 z-40 w-80 pointer-events-none">
      <div className="relative h-full flex flex-col">
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-700"
          style={{
            background:
              playback === 'playing'
                ? 'linear-gradient(to bottom, var(--primary), rgba(255, 255, 255, 0.3), var(--primary))'
                : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.2))',
            boxShadow: playback === 'playing' ? '0 0 20px var(--primary)' : 'none',
            animation: playback === 'playing' ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-8 pb-8 pl-8 pointer-events-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div
            className="text-xs font-mono leading-relaxed min-h-full"
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div className="mb-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
              &#123;
            </div>

            <div className="ml-2 space-y-1">
              <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                &quot;status&quot;:{' '}
                <span style={{ color: 'var(--primary)' }} className="font-semibold">
                  &quot;{playback}&quot;
                </span>
                ,
              </div>

              <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                &quot;layers&quot;: [
              </div>
              <div className="ml-4">
                {layers
                  .filter((l) => l.enabled && l.text.trim())
                  .map((layer, idx) => {
                    const influence = normalizedWeights.get(layer.id) ?? 0;
                    const activeLayers = layers.filter((l) => l.enabled && l.text.trim());

                    let weightColorVar = '--text-secondary';
                    let weightGlow = '';
                    let weightOpacity = 0.5;

                    if (influence >= 0.7) {
                      weightColorVar = '--primary';
                      weightGlow = 'drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]';
                      weightOpacity = 1;
                    } else if (influence >= 0.5) {
                      weightColorVar = '--primary';
                      weightGlow = 'drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]';
                      weightOpacity = 0.9;
                    } else if (influence >= 0.35) {
                      weightColorVar = '--primary';
                      weightOpacity = 0.8;
                    } else if (influence >= 0.2) {
                      weightColorVar = '--text-primary';
                      weightOpacity = 0.7;
                    } else if (influence >= 0.1) {
                      weightColorVar = '--text-secondary';
                      weightOpacity = 0.6;
                    } else if (influence >= 0.05) {
                      weightColorVar = '--text-secondary';
                      weightOpacity = 0.5;
                    }

                    return (
                      <div
                        key={layer.id}
                        className="relative group"
                        style={{
                          animation:
                            playback === 'playing' && influence > 0.5
                              ? `layerPulse 2s ease-in-out infinite ${idx * 0.2}s`
                              : 'none',
                        }}
                      >
                        {influence >= 0.5 && (
                          <div
                            className="absolute -inset-x-2 -inset-y-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                              background:
                                'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
                              backdropFilter: 'blur(8px)',
                              borderLeft: `2px solid rgba(255, 255, 255, ${influence >= 0.7 ? 0.3 : 0.2})`,
                            }}
                          />
                        )}

                        <div className="relative">
                          <span style={{ color: 'var(--text-primary)' }}>&#123;</span>
                          <span style={{ color: 'var(--text-secondary)' }} className="font-medium">
                            {' '}
                            &quot;text&quot;:{' '}
                          </span>
                          <span
                            style={{ color: 'var(--primary)', opacity: 0.9 }}
                            className="font-semibold"
                          >
                            &quot;{layer.text}&quot;
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>, </span>
                          <span style={{ color: 'var(--text-secondary)' }} className="font-medium">
                            &quot;weight&quot;:{' '}
                          </span>
                          <span
                            className={`font-semibold ${weightGlow} transition-all duration-300`}
                            style={{ color: `var(${weightColorVar})`, opacity: weightOpacity }}
                          >
                            {Number(layer.weight.toFixed(2))}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}> &#125;</span>
                          {idx < activeLayers.length - 1 ? (
                            <span style={{ color: 'var(--text-primary)' }}>,</span>
                          ) : (
                            ''
                          )}
                          <span
                            style={{
                              color: `var(${weightColorVar})`,
                              opacity: weightOpacity * 0.7,
                            }}
                            className="font-medium ml-2 transition-opacity duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div style={{ color: 'var(--text-primary)' }}>],</div>

              <div
                className="my-3 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15), transparent)',
                }}
              />

              <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                &quot;config&quot;: <span style={{ color: 'var(--text-primary)' }}>&#123;</span>
              </div>
              <div className="ml-4 space-y-0.5">
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;bpm&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {config.bpm}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;scale&quot;:{' '}
                  <span style={{ color: 'var(--primary)', opacity: 0.9 }} className="font-semibold">
                    &quot;{config.scale}&quot;
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;mode&quot;:{' '}
                  <span style={{ color: 'var(--primary)', opacity: 0.9 }} className="font-semibold">
                    &quot;{config.musicGenerationMode}&quot;
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;density&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {Number(config.density.toFixed(2))}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;brightness&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {Number(config.brightness.toFixed(2))}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;guidance&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {Number(config.guidance.toFixed(1))}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;temperature&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {Number(config.temperature.toFixed(1))}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;topK&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {config.topK}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;seed&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                    className="font-semibold"
                  >
                    {config.seed}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;flags&quot;: <span style={{ color: 'var(--text-primary)' }}>&#123;</span>
                </div>
                <div className="ml-4">
                  <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                    &quot;muteBass&quot;:{' '}
                    <span
                      style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                      className="font-semibold"
                    >
                      {config.muteBass.toString()}
                    </span>
                    ,
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                    &quot;muteDrums&quot;:{' '}
                    <span
                      style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                      className="font-semibold"
                    >
                      {config.muteDrums.toString()}
                    </span>
                    ,
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                    &quot;onlyBassAndDrums&quot;:{' '}
                    <span
                      style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                      className="font-semibold"
                    >
                      {config.onlyBassAndDrums.toString()}
                    </span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>&#125;</div>
              </div>
              <div style={{ color: 'var(--text-primary)' }}>&#125;,</div>

              <div
                className="my-3 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15), transparent)',
                }}
              />

              <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                &quot;volume&quot;:{' '}
                <span
                  style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                  className="font-semibold"
                >
                  {volume}
                </span>
                ,
              </div>

              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;connection&quot;:
                </span>
                <span style={{ color: 'var(--primary)', opacity: 0.9 }} className="font-semibold">
                  &quot;{connectionStatus}&quot;
                </span>
                {connectionStatus === 'connected' && (
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: 'var(--status-success-bg)',
                      boxShadow: '0 0 8px var(--status-success-bg)',
                    }}
                  />
                )}
                <span style={{ color: 'var(--text-primary)' }}>,</span>
              </div>

              <div
                className="my-3 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15), transparent)',
                }}
              />

              <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                &quot;session&quot;: <span style={{ color: 'var(--text-primary)' }}>&#123;</span>
              </div>
              <div className="ml-4 space-y-0.5">
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;timeRemaining&quot;:{' '}
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        sessionTimeRemaining === null
                          ? 'var(--text-secondary)'
                          : sessionTimeRemaining < 60
                            ? '#ef4444'
                            : sessionTimeRemaining < 180
                              ? '#f59e0b'
                              : 'var(--text-primary)',
                      opacity: sessionTimeRemaining === null ? 0.5 : 0.8,
                    }}
                  >
                    {sessionTimeRemaining ?? 'null'}
                  </span>
                  ,
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="font-medium">
                  &quot;autoReconnect&quot;:{' '}
                  <span
                    style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                    className="font-semibold"
                  >
                    {autoReconnect.toString()}
                  </span>
                </div>
              </div>
              <div style={{ color: 'var(--text-primary)' }}>&#125;</div>
            </div>

            <div style={{ color: 'var(--text-primary)' }} className="font-semibold mb-8">
              &#125;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
