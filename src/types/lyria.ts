import { MusicGenerationMode, Scale } from '@google/genai';

export type PlaybackState = 'stopped' | 'loading' | 'playing' | 'paused';

export interface Layer {
  id: string;
  text: string;
  weight: number;
  enabled: boolean;
}

export interface GlobalConfig {
  bpm: number;
  density: number;
  brightness: number;
  guidance: number;
  temperature: number;
  topK: number;
  seed: number;
  scale: Scale;
  musicGenerationMode: MusicGenerationMode;
  muteBass: boolean;
  muteDrums: boolean;
  onlyBassAndDrums: boolean;
}
