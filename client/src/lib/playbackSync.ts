import type { QueueItem } from '../types';
import { snapSmoothPlaybackTime } from '../hooks/useSmoothPlaybackTime';
import { getClientPlaybackState, getPlaybackTime } from './playbackState';
import {
  assessPlaybackResult,
  tryPlayWithAutoplayFallback,
  type PlayResult,
} from './audioUnlock';

/** 小于此值视为已对齐，不做任何校正 */
const DRIFT_LOCK_SEC = 0.05;
/** 小误差：playbackRate 微调，不 seek */
const MICRO_DRIFT_SEC = 0.3;
/** 切 tab 回来后一段时间内禁止 seek，避免可见瞬间跳进度 */
const VISIBILITY_GRACE_MS = 8000;

let visibilityResumeAt = 0;

export function markVisibilityResume(): void {
  visibilityResumeAt = Date.now();
}

function inVisibilityGrace(): boolean {
  return visibilityResumeAt > 0 && Date.now() - visibilityResumeAt < VISIBILITY_GRACE_MS;
}

function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}

export interface ApplySyncOptions {
  song: QueueItem;
  capTime: (time: number, mediaDur: number) => number;
  tvMode?: boolean;
  /** 用户拖动进度条等场景 */
  forceTime?: number;
  /** 切歌后强制归零 */
  forceZero?: boolean;
}

function resolveTargetTime(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): number {
  const mediaDur = audio.duration;
  if (options.forceZero) return options.capTime(0, mediaDur);
  if (options.forceTime !== undefined) return options.capTime(options.forceTime, mediaDur);
  const state = getClientPlaybackState();
  const t = state ? getPlaybackTime(state) : 0;
  return options.capTime(Math.max(0, t), mediaDur);
}

/**
 * Leader-Follower 同步：房主写、听众读，低频对齐。
 * 小误差不动或 playbackRate 微调，大误差才 seek。
 */
export async function applyFollowerSync(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<PlayResult | 'paused' | 'idle'> {
  if (!audio.src) return 'idle';
  // 后台标签页：完全不碰音频，避免切走时卡顿/变速
  if (isDocumentHidden()) return 'idle';

  const state = getClientPlaybackState();
  const isPlaying = state?.status === 'playing';
  const target = resolveTargetTime(audio, options);

  if (!isPlaying) {
    audio.playbackRate = 1;
    if (!audio.paused) audio.pause();
    if (Math.abs(audio.currentTime - target) > DRIFT_LOCK_SEC) {
      audio.currentTime = target;
      snapSmoothPlaybackTime(target);
    }
    return 'paused';
  }

  if (audio.paused) {
    const initial = await tryPlayWithAutoplayFallback(audio, Boolean(options.tvMode));
    const result = await assessPlaybackResult(audio, initial);
    if (result !== 'played') return result;
  }

  const diff = target - audio.currentTime;

  if (Math.abs(diff) < DRIFT_LOCK_SEC) {
    audio.playbackRate = 1;
    return 'played';
  }

  // 后台标签页或切回宽限期内：只微调速率，禁止 seek
  if (inVisibilityGrace()) {
    audio.playbackRate = diff > 0 ? 0.99 : 1.01;
    return 'played';
  }

  if (Math.abs(diff) < MICRO_DRIFT_SEC) {
    audio.playbackRate = diff > 0 ? 0.99 : 1.01;
    return 'played';
  }

  audio.playbackRate = 1;
  audio.currentTime = target;
  snapSmoothPlaybackTime(target);
  return 'played';
}

/**
 * 切回标签页：仅在浏览器把音频暂停时 resume，不 seek。
 * 若音频仍在播放则完全不动，实现无感切 tab。
 */
export async function applyVisibilityResume(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<PlayResult | 'paused' | 'idle'> {
  if (!audio.src || isDocumentHidden()) return 'idle';

  const state = getClientPlaybackState();
  const isPlaying = state?.status === 'playing';
  if (!isPlaying) {
    audio.playbackRate = 1;
    if (!audio.paused) audio.pause();
    return 'paused';
  }

  if (!audio.paused) {
    audio.playbackRate = 1;
    return 'played';
  }

  const initial = await tryPlayWithAutoplayFallback(audio, Boolean(options.tvMode));
  const result = await assessPlaybackResult(audio, initial);
  if (result !== 'played') return result;

  const target = resolveTargetTime(audio, options);
  const diff = target - audio.currentTime;
  if (Math.abs(diff) < DRIFT_LOCK_SEC) {
    audio.playbackRate = 1;
  } else {
    audio.playbackRate = diff > 0 ? 0.99 : 1.01;
  }
  return 'played';
}

export function resetPlaybackRate(audio: HTMLAudioElement): void {
  audio.playbackRate = 1;
}
