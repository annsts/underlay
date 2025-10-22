import React from 'react';
import { GlobalConfig } from '@/types/lyria';
import GlassKnob from '@/components/ui/glass/knob';
import GlassPanel from '@/components/ui/glass/panel';
import { usePlatform } from '@/contexts/platform-context';

interface ControlKnobsProps {
  config: GlobalConfig;
  onConfigChange: (patch: Partial<GlobalConfig>) => void;
}

export function ControlKnobs({ config, onConfigChange }: ControlKnobsProps) {
  const { isVST } = usePlatform();

  return (
    <GlassPanel className={isVST ? "p-4 h-[140px] flex items-center flex-shrink-0" : "p-4 h-auto md:h-[140px] flex items-center flex-shrink-0"}>
        <div className="grid grid-cols-3 gap-4 w-full">
          <GlassKnob
            value={config.density}
            onChange={(v) => onConfigChange({ density: v })}
            label="Density"
            min={0}
            max={1}
            step={0.01}
            size={52}
            tooltip="Controls how many musical elements are active. Higher values create fuller, more complex arrangements."
          />
          <GlassKnob
            value={config.brightness}
            onChange={(v) => onConfigChange({ brightness: v })}
            label="Bright"
            min={0}
            max={1}
            step={0.01}
            size={52}
            tooltip="Adjusts the timbral brightness and frequency content. Higher values emphasize higher frequencies."
          />
          <GlassKnob
            value={config.guidance}
            onChange={(v) => onConfigChange({ guidance: v })}
            label="Guide"
            min={0}
            max={6}
            step={0.1}
            size={52}
            tooltip="How closely the AI follows your text prompts. Higher values create music that matches prompts more literally."
          />
        </div>
      </GlassPanel>
  );
}
