import { isMobileDevice } from './audioUnlock';

export function waitForAudioCanPlay(audio: HTMLAudioElement, timeoutMs?: number): Promise<void> {
  const mobile = isMobileDevice();
  const timeout = timeoutMs ?? (mobile ? 2500 : 10000);
  const minReadyState = mobile
    ? HTMLMediaElement.HAVE_METADATA
    : HTMLMediaElement.HAVE_FUTURE_DATA;

  if (audio.readyState >= minReadyState) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeout);

    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('loadedmetadata', onReady);
    };

    const onReady = () => {
      if (audio.readyState < minReadyState) return;
      cleanup();
      resolve();
    };

    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('loadedmetadata', onReady, { once: true });
  });
}

/** 移动端：metadata 就绪即可尝试播放/弹解锁，避免等满 10 秒 */
export function waitForAudioMinimumReady(audio: HTMLAudioElement): Promise<void> {
  if (!isMobileDevice()) {
    return waitForAudioCanPlay(audio);
  }

  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 400);
    const done = () => {
      window.clearTimeout(timer);
      audio.removeEventListener('loadedmetadata', done);
      audio.removeEventListener('canplay', done);
      resolve();
    };
    audio.addEventListener('loadedmetadata', done, { once: true });
    audio.addEventListener('canplay', done, { once: true });
  });
}
