import React from 'react';
import { GlobalConfig } from '@/types/lyria';
import GlassToggle from '@/components/ui/glass/toggle';
import GlassPanel from '@/components/ui/glass/panel';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/glass/tooltip';
import { usePlatform } from '@/contexts/platform-context';

interface MixControlsProps {
  config: GlobalConfig;
  onConfigChange: (patch: Partial<GlobalConfig>) => void;
}

export function MixControls({ config, onConfigChange }: MixControlsProps) {
  const { isVST } = usePlatform();

  return (
    <GlassPanel className={isVST ? "p-4 flex-1 h-auto flex-shrink-0" : "p-4 h-auto md:flex-1 md:h-auto flex-shrink-0"}>
        <div className="space-y-3 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <GlassToggle
                  checked={config.muteBass}
                  onChange={(checked) => onConfigChange({ muteBass: checked })}
                  label="Mute Bass"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Requests to remove bass frequencies. Note: The AI may not always honor this request.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <GlassToggle
                  checked={config.muteDrums}
                  onChange={(checked) => onConfigChange({ muteDrums: checked })}
                  label="Mute Drums"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Requests to remove drums and percussion. Note: The AI may not always honor this request.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <GlassToggle
                  checked={config.onlyBassAndDrums}
                  onChange={(checked) => onConfigChange({ onlyBassAndDrums: checked })}
                  label="Bass & Drums Only"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Requests only bass and drums. Note: The AI may not always honor this request.
            </TooltipContent>
          </Tooltip>
        </div>
      </GlassPanel>
  );
}
