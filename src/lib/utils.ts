import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from '@/lib/constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function decodeBase64PCMToAudioBuffer(
  base64: string,
  ctx: AudioContext,
  sampleRate = AUDIO_SAMPLE_RATE,
  numChannels = AUDIO_CHANNELS
): Promise<AudioBuffer> {
  const bytes = base64ToBytes(base64);
  const totalSamples = bytes.byteLength / 2;
  const frameCount = Math.floor(totalSamples / numChannels);

  const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, totalSamples);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    let writeIndex = 0;
    for (let i = channel; i < int16.length; i += numChannels) {
      channelData[writeIndex++] = Math.max(-1, Math.min(1, int16[i] / 32768));
    }
  }
  return buffer;
}

function base64ToBytes(base64String: string): Uint8Array {
  const binaryString =
    typeof atob === 'function' ? atob(base64String) : Buffer.from(base64String, 'base64').toString('binary');
  const output = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) output[i] = binaryString.charCodeAt(i) & 0xff;
  return output;
}

import { Scale } from '@google/genai';

export const SCALE_OPTIONS = [
  { label: 'Let model decide', value: Scale.SCALE_UNSPECIFIED },
  { label: 'C maj / A min', value: Scale.C_MAJOR_A_MINOR },
  { label: 'D♭ maj / B♭ min', value: Scale.D_FLAT_MAJOR_B_FLAT_MINOR },
  { label: 'D maj / B min', value: Scale.D_MAJOR_B_MINOR },
  { label: 'E♭ maj / C min', value: Scale.E_FLAT_MAJOR_C_MINOR },
  { label: 'E maj / C♯–D♭ min', value: Scale.E_MAJOR_D_FLAT_MINOR },
  { label: 'F maj / D min', value: Scale.F_MAJOR_D_MINOR },
  { label: 'G♭ maj / E♭ min', value: Scale.G_FLAT_MAJOR_E_FLAT_MINOR },
  { label: 'G maj / E min', value: Scale.G_MAJOR_E_MINOR },
  { label: 'A♭ maj / F min', value: Scale.A_FLAT_MAJOR_F_MINOR },
  { label: 'A maj / F♯–G♭ min', value: Scale.A_MAJOR_G_FLAT_MINOR },
  { label: 'B♭ maj / G min', value: Scale.B_FLAT_MAJOR_G_MINOR },
  { label: 'B maj / G♯–A♭ min', value: Scale.B_MAJOR_A_FLAT_MINOR },
];
