'use client';

import React from 'react';
import { GlobalConfig } from '@/types/lyria';
import { ControlKnobs } from './control-knobs';
import { AdvancedControls } from './advanced-controls';
import { MixControls } from './mix-controls';

interface ConfigPanelProps {
  config: GlobalConfig;
  onConfigChange: (patch: Partial<GlobalConfig>) => void;
}

/**
 * Configuration panel combining all control sections
 * Groups BPM/Density/Brightness, Advanced settings, and Mix controls
 */
export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  return (
    <div className="flex flex-col gap-3 h-auto md:h-full min-w-0">
      <ControlKnobs config={config} onConfigChange={onConfigChange} />
      <AdvancedControls config={config} onConfigChange={onConfigChange} />
      <MixControls config={config} onConfigChange={onConfigChange} />
    </div>
  );
}
