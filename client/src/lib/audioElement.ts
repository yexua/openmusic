import { configureInlineAudio } from './audioUnlock';

let sharedAudio: HTMLAudioElement | null = null;

export function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    configureInlineAudio(sharedAudio);
  }
  return sharedAudio;
}

export function stopSharedAudio(): void {
  if (!sharedAudio) return;
  sharedAudio.pause();
  sharedAudio.removeAttribute('src');
  sharedAudio.load();
}
