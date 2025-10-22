'use client';
import { Layers, Sliders, Settings, Volume2, Clock, Zap, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getThemeClass, ThemeType } from '@/lib/theme-init';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeType;
}

function HelpDialog({ isOpen, onClose, theme = 'glass' }: HelpDialogProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div className={getThemeClass(theme)}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-md z-[9999]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[10000] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="glass-dialog w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div
              className="glass-dialog-header flex items-center justify-between p-6 border-b"
              style={{ borderBottomColor: 'var(--glass-border)' }}
            >
              <h2
                className="text-xl font-semibold flex items-center gap-3"
                style={{ color: 'var(--text-primary)' }}
              >
                How It Works
              </h2>
              <button onClick={onClose} className="glass-button glass-button-small rounded-full">
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] help-dialog-scroll">
              {/* Important Info */}
              <div className="mb-8 grid grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <Clock
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                  />
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>10 minute session</strong>
                    <br />
                    Lyria API limit. Reload to restart.
                  </div>
                </div>
                <div className="flex gap-3">
                  <Zap
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                  />
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>~1 second latency</strong>
                    <br />
                    Audio responds with slight delay.
                  </div>
                </div>
              </div>

              <div
                className="mb-6 border-t"
                style={{ borderColor: 'var(--glass-border)', opacity: 0.5 }}
              />

              {/* Layers */}
              <div className="mb-8">
                <h3
                  className="text-base font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Layers className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                  Layers
                </h3>
                <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Text prompts that shape the generated music. Stack multiple layers with different
                  weights to create complex textures. Think of them as ingredients in a mix.
                </div>

                {/* Example Layer UI */}
                <div className="glass-panel p-3" style={{ pointerEvents: 'none' }}>
                  {/* Top row: checkbox, text input, delete button */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: 'var(--text-primary)' }}
                      />
                    </div>
                    <input
                      type="text"
                      value="ambient drone"
                      readOnly
                      className="glass-input text-sm flex-1 py-1.5"
                    />
                    <button className="glass-button glass-button-xs">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bottom row: weight slider with value */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1 rounded-full relative"
                      style={{ backgroundColor: 'var(--glass-border)' }}
                    >
                      <div
                        className="absolute h-full rounded-full"
                        style={{ backgroundColor: 'var(--text-primary)', width: '50%' }}
                      />
                    </div>
                    <span
                      className="text-xs font-mono w-7 flex-shrink-0"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      1.5
                    </span>
                  </div>
                </div>

                <div
                  className="text-xs mt-2"
                  style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
                >
                  Checkbox to enable/disable · Text prompt · X button to delete · Weight slider (0.1-3.0)
                </div>
              </div>

              {/* Main Controls */}
              <div className="mb-8">
                <h3
                  className="text-base font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Sliders className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                  Main Controls
                </h3>
                <div className="grid gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>BPM</strong> · 60-200
                      <br />
                      Tempo. Higher = faster. Resets context when changed.
                    </div>
                    <div
                      className="w-16 h-8 rounded flex items-center justify-center text-xs font-mono"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      120
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Scale</strong>
                      <br />
                      Musical key/mode (Major, Minor, Dorian, etc). Resets context.
                    </div>
                    <div
                      className="w-32 h-8 rounded flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      C maj / A min
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Density</strong> · 0-1
                      <br />
                      How many notes. Low = sparse/minimal, high = busy/complex.
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-full relative flex items-center justify-center"
                        style={{
                          backgroundColor: 'var(--glass-bg)',
                          border: '2px solid var(--glass-border)',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(var(--text-primary) 0deg, var(--text-primary) ${180}deg, transparent ${180}deg)`,
                            opacity: 0.3,
                          }}
                        />
                        <span
                          className="text-xs font-mono relative z-10"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          0.5
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        knob
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Brightness</strong> · 0-1
                      <br />
                      Tonal color. Low = dark/warm, high = bright/brilliant.
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-full relative flex items-center justify-center"
                        style={{
                          backgroundColor: 'var(--glass-bg)',
                          border: '2px solid var(--glass-border)',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(var(--text-primary) 0deg, var(--text-primary) ${216}deg, transparent ${216}deg)`,
                            opacity: 0.3,
                          }}
                        />
                        <span
                          className="text-xs font-mono relative z-10"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          0.6
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        knob
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Guidance</strong> · 0-6
                      <br />
                      Prompt adherence. Low = creative freedom, high = strict following.
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-full relative flex items-center justify-center"
                        style={{
                          backgroundColor: 'var(--glass-bg)',
                          border: '2px solid var(--glass-border)',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(var(--text-primary) 0deg, var(--text-primary) ${240}deg, transparent ${240}deg)`,
                            opacity: 0.3,
                          }}
                        />
                        <span
                          className="text-xs font-mono relative z-10"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          4.0
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        knob
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced */}
              <div className="mb-8">
                <h3
                  className="text-base font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Settings className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                  Advanced
                </h3>
                <div className="grid gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Temperature</strong> · 0-3
                      <br />
                      Randomness. Low = predictable, high = experimental.
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-14 h-1 rounded-full relative"
                        style={{ backgroundColor: 'var(--glass-border)' }}
                      >
                        <div
                          className="absolute h-full rounded-full"
                          style={{ backgroundColor: 'var(--text-primary)', width: '40%' }}
                        />
                      </div>
                      <span
                        className="text-xs font-mono w-9"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        1.20
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Top K</strong> · 1-1000
                      <br />
                      Choice pool size. Low = focused, high = varied.
                    </div>
                    <div
                      className="w-16 h-8 rounded flex items-center justify-center text-xs font-mono"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      40
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Seed</strong>
                      <br />
                      For reproducible results with same settings.
                    </div>
                    <div
                      className="w-24 h-8 rounded flex items-center justify-center text-xs font-mono"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      1234567
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Mode</strong>
                      <br />
                      Quality (coherent) · Diversity (varied) · Vocal (melodic)
                    </div>
                    <div
                      className="w-24 h-8 rounded flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Quality
                    </div>
                  </div>
                </div>
              </div>

              {/* Mix */}
              <div className="mb-4">
                <h3
                  className="text-base font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Volume2 className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                  Mix
                </h3>
                <div className="grid gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Mute Bass</strong>
                      <br />
                      Remove low frequencies. Focus on melody.
                    </div>
                    <div
                      className="w-10 h-6 rounded-full relative flex items-center"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full absolute transition-all"
                        style={{
                          backgroundColor: 'var(--text-primary)',
                          left: '3px',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Mute Drums</strong>
                      <br />
                      Remove percussion. More ambient feel.
                    </div>
                    <div
                      className="w-10 h-6 rounded-full relative flex items-center"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full absolute transition-all"
                        style={{
                          backgroundColor: 'var(--text-primary)',
                          right: '3px',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <strong style={{ color: 'var(--text-primary)' }}>Bass & Drums Only</strong>
                      <br />
                      Isolate rhythm section only.
                    </div>
                    <div
                      className="w-10 h-6 rounded-full relative flex items-center"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full absolute transition-all"
                        style={{
                          backgroundColor: 'var(--text-primary)',
                          left: '3px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}

export default HelpDialog;
