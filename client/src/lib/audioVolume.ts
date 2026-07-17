import { applyAudioVolume } from './audioElement';
import { applyPreviewVolume } from './songPreviewPlayer';

export function applyAllAudioVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume));
  applyAudioVolume(clamped);
  applyPreviewVolume(clamped);
}
