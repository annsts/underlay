import React, { useMemo } from 'react';
import { Shuffle } from 'lucide-react';
import { MusicGenerationMode } from '@google/genai';
import { GlobalConfig } from '@/types/lyria';
import { clampInt } from '@/lib/utils';
import { GlassSlider, GlassSelect } from '@/components/ui/glass';
import { NumericDragInput } from '@/components/ui/glass';
import GlassPanel from '@/components/ui/glass/panel';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/glass/tooltip';
import { usePlatform } from '@/contexts/platform-context';

interface AdvancedControlsProps {
  config: GlobalConfig;
  onConfigChange: (patch: Partial<GlobalConfig>) => void;
}

export function AdvancedControls({ config, onConfigChange }: AdvancedControlsProps) {
  const { isVST } = usePlatform();
  const modeOptions = useMemo(
    () => [
      { value: MusicGenerationMode.QUALITY, label: 'Quality' },
      { value: MusicGenerationMode.DIVERSITY, label: 'Diversity' },
      { value: MusicGenerationMode.VOCALIZATION, label: 'Vocal' },
    ],
    []
  );

  return (
    <GlassPanel className={isVST ? "p-4 h-[230px] flex-shrink-0" : "p-4 h-auto md:h-[230px] flex-shrink-0"}>
        <div className="space-y-3 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Temperature
                </span>
                <div className="flex items-center gap-2">
                  <GlassSlider
                    value={config.temperature}
                    onChange={(v) => onConfigChange({ temperature: v })}
                    min={0}
                    max={3}
                    step={0.05}
                    className="w-14"
                  />
                  <span className="text-xs font-mono w-9" style={{ color: 'var(--text-primary)' }}>
                    {config.temperature.toFixed(2)}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Controls randomness in generation. Higher values create more experimental and varied music.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Top K
                </span>
                <NumericDragInput
                  value={config.topK}
                  onChange={(topK) => onConfigChange({ topK })}
                  min={1}
                  max={1000}
                  title="Click to edit, or drag to adjust"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Limits the AI&apos;s token selection pool. Lower values (40-100) create more focused music, higher values allow more variety.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-medium flex-shrink-0"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Seed
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <input
                    type="number"
                    value={config.seed}
                    onChange={(e) =>
                      onConfigChange({ seed: clampInt(Number(e.target.value), 0, 2_147_483_647) })
                    }
                    className="glass-input w-32 md:w-36 text-center text-xs font-mono py-1"
                  />
                  <button
                    onClick={() => onConfigChange({ seed: Math.floor(Math.random() * 2_147_483_647) })}
                    className="glass-button glass-button-xs flex-shrink-0"
                    title="Randomize"
                  >
                    <Shuffle className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Random number seed for reproducible generation. Same seed with same settings creates identical music.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-medium flex-shrink-0"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Mode
                </span>
                <GlassSelect
                  value={config.musicGenerationMode}
                  onChange={(v) => onConfigChange({ musicGenerationMode: v as MusicGenerationMode })}
                  options={modeOptions}
                  minWidth={120}
                  maxWidth={120}
                  fitContent={false}
                  className="text-xs"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Quality: balanced output. Diversity: varied styles. Vocal: includes vocalization elements.
            </TooltipContent>
          </Tooltip>
        </div>
      </GlassPanel>
  );
}
