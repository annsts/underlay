import React from 'react';
import { X } from 'lucide-react';
import { Layer } from '@/types/lyria';
import GlassCheckbox from '@/components/ui/glass/checkbox';
import { GlassSlider } from '@/components/ui/glass';

interface LayerItemProps {
  layer: Layer;
  influence: number;
  canDelete: boolean;
  isHighestInfluence: boolean;
  onUpdate: (id: string, patch: Partial<Layer>) => void;
  onDelete: (id: string) => void;
  onCommit: () => void;
}

export function LayerItem({
  layer,
  canDelete,
  isHighestInfluence,
  onUpdate,
  onDelete,
  onCommit,
}: LayerItemProps) {
  return (
    <div
      className="glass-panel p-3 overflow-hidden transition-opacity duration-300"
      style={{ opacity: layer.enabled ? 1 : 0.5 }}
    >
      <div className="flex items-center gap-2 min-w-0 mb-2">
        <div className="flex-shrink-0">
          <GlassCheckbox
            checked={layer.enabled}
            onChange={(enabled) => onUpdate(layer.id, { enabled })}
          />
        </div>

        <input
          type="text"
          value={layer.text}
          onChange={(e) => onUpdate(layer.id, { text: e.target.value })}
          onBlur={onCommit}
          placeholder="e.g., ambient, punchy"
          className="glass-input flex-1 text-sm py-1.5 min-w-0 max-w-full"
        />

        <button
          onClick={() => onDelete(layer.id)}
          className="glass-button glass-button-xs p-2 md:p-1"
          disabled={!canDelete}
          style={{ '--hover-bg': 'var(--status-danger-bg)' } as React.CSSProperties}
          title="Remove layer"
        >
          <X className="w-4 h-4 md:w-3 md:h-3" />
        </button>
      </div>

      <div
        className={`flex items-center gap-2 transition-all duration-300 ${
          isHighestInfluence && layer.enabled ? 'slider-glow' : ''
        }`}
      >
        <GlassSlider
          value={layer.weight}
          onChange={(weight) => onUpdate(layer.id, { weight })}
          onCommit={onCommit}
          min={0.1}
          max={3}
          step={0.1}
          className="flex-1 h-1"
        />
        <span
          className="text-xs font-mono w-7 flex-shrink-0"
          style={{ color: 'var(--text-primary)' }}
        >
          {layer.weight.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
