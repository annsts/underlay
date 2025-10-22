import React, { useMemo } from 'react';
import { Plus, Layers } from 'lucide-react';
import { Layer } from '@/types/lyria';
import { MAX_LAYERS } from '@/lib/constants';
import GlassButton from '@/components/ui/glass/button';
import GlassPanel from '@/components/ui/glass/panel';
import { LayerItem } from './layer-item';
import { usePlatform } from '@/contexts/platform-context';

interface LayerListProps {
  layers: Layer[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Layer>) => void;
  onDelete: (id: string) => void;
  onCommit: () => void;
}

export function LayerList({ layers, onAdd, onUpdate, onDelete, onCommit }: LayerListProps) {
  const { isVST } = usePlatform();
  // Calculate normalized weights and find highest influence
  const { normalizedWeights, highestInfluenceId } = useMemo(() => {
    const enabled = layers.filter((l) => l.enabled && l.weight > 0);
    const sum = enabled.reduce((a, l) => a + l.weight, 0);
    const map = new Map<string, number>();
    let maxInfluence = 0;
    let maxId: string | null = null;

    layers.forEach((l) => {
      if (!l.enabled || l.weight <= 0) {
        map.set(l.id, 0);
      } else {
        const influence = l.weight / (sum || 1);
        map.set(l.id, influence);
        if (influence > maxInfluence) {
          maxInfluence = influence;
          maxId = l.id;
        }
      }
    });

    return { normalizedWeights: map, highestInfluenceId: maxId };
  }, [layers]);

  const emptyLayerCount = layers.filter((layer) => !layer.text.trim()).length;
  const canAddLayer = layers.length < MAX_LAYERS && emptyLayerCount < 2;

  return (
    <GlassPanel className={isVST ? "p-4 flex flex-col h-full min-h-[350px] overflow-hidden" : "p-4 flex flex-col h-[50vh] min-h-[300px] md:h-full md:min-h-[350px] overflow-hidden"}>
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Layers{' '}
            {layers.length > 0 && (
              <span className="text-xs opacity-60">
                ({layers.length}/{MAX_LAYERS})
              </span>
            )}
          </h2>
        </div>
        <GlassButton
          onClick={onAdd}
          size="sm"
          variant="primary"
          className="flex items-center gap-1.5"
          disabled={!canAddLayer}
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">Add Layer</span>
          <span className="sm:hidden">Add</span>
        </GlassButton>
      </div>

      <div
        className="layers-scroll overflow-y-auto overflow-x-hidden space-y-3 flex-1 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
          border: '1px solid rgba(109, 159, 104, 0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05)',
          maxHeight: '450px',
          minHeight: '200px',
          padding: '12px',
        }}
      >
        {layers.map((layer) => {
          const influence = normalizedWeights.get(layer.id) ?? 0;
          return (
            <LayerItem
              key={layer.id}
              layer={layer}
              influence={influence}
              canDelete={layers.length > 1}
              isHighestInfluence={layer.id === highestInfluenceId}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCommit={onCommit}
            />
          );
        })}
      </div>
    </GlassPanel>
  );
}
