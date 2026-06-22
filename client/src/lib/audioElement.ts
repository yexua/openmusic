import { configureInlineAudio } from './audioUnlock';
import { useAudioStore } from '../stores/audioStore';
import { getAudioController } from './audioController';

let sharedAudio: HTMLAudioElement | null = null;

export function applyAudioVolume(volume: number): void {
  const audio = sharedAudio;
  if (!audio) return;
  audio.volume = Math.min(1, Math.max(0, volume));
}

export function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    configureInlineAudio(sharedAudio);
    applyAudioVolume(useAudioStore.getState().volume);
  }
  return sharedAudio;
}

export function stopSharedAudio(): void {
  getAudioController().clearQueue();
  if (!sharedAudio) return;
  sharedAudio.pause();
  sharedAudio.removeAttribute('src');
  sharedAudio.load();
}
