'use client';

import React, { useCallback } from 'react';
import { Layer } from '@/types/lyria';
import { MAX_LAYERS } from '@/lib/constants';
import { LayerList } from './layer-list';

interface LayerManagerProps {
  layers: Layer[];
  playback: 'playing' | 'paused' | 'stopped' | 'loading';
  onLayersChange: (layers: Layer[]) => void;
  onError: (message: string) => void;
  sendWeightedPrompts: (layers: Layer[]) => Promise<void>;
}

export function LayerManager({
  layers,
  playback,
  onLayersChange,
  onError,
  sendWeightedPrompts,
}: LayerManagerProps) {

  const addLayer = useCallback(() => {
    if (layers.length >= MAX_LAYERS) {
      onError(`Maximum of ${MAX_LAYERS} layers allowed`);
      return;
    }

    const emptyLayerCount = layers.filter((layer) => !layer.text.trim()).length;
    if (emptyLayerCount >= 2) {
      onError('Consider filling some layers before adding more');
      return;
    }

    const newLayer: Layer = {
      id: crypto.randomUUID(),
      text: '',
      weight: 1.0,
      enabled: true,
    };
    onLayersChange([...layers, newLayer]);
  }, [layers, onLayersChange, onError]);

  const removeLayer = useCallback(
    (id: string) => {
      const newLayers = layers.filter((layer) => layer.id !== id);
      onLayersChange(newLayers);
      if (playback === 'playing') {
        sendWeightedPrompts(newLayers);
      }
    },
    [layers, playback, onLayersChange, sendWeightedPrompts]
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<Layer>) => {
      const newLayers = layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
      onLayersChange(newLayers);
    },
    [layers, onLayersChange]
  );

  const onLayerCommit = useCallback(() => {
    if (playback === 'playing') {
      sendWeightedPrompts(layers);
    }
  }, [playback, sendWeightedPrompts, layers]);

  return (
    <LayerList
      layers={layers}
      onAdd={addLayer}
      onUpdate={updateLayer}
      onDelete={removeLayer}
      onCommit={onLayerCommit}
    />
  );
}
