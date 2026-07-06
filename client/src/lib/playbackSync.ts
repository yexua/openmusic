import type { QueueItem } from '../types';
import { snapSmoothPlaybackTime } from '../hooks/useSmoothPlaybackTime';
import { resolveTrackDurationSeconds } from '../hooks/useTrackDuration';
import { useAudioStore } from '../stores/audioStore';
import { getClientPlaybackState, getPlaybackTime } from './playbackState';
import { isAudioBuffering } from './audioBuffering';
import { shouldSkipRoutineSync as shouldSkipByBufferingState } from './syncStateMachine';
import { resetDriftController } from './driftController';
import {
  assessPlaybackResult,
  tryPlayWithAutoplayFallback,
  type PlayResult,
} from './audioUnlock';
import { debugLine, debugLog } from './debugTools';
import { recordDriftSample } from './driftHistogram';

/**
 * 离散事件同步：
 * - 播放中：UI/歌词跟本机 audio；仅尾部 FINAL（≤3s）或服务端已播完时向前跳
 * - 强制同步（切歌 forceZero、拖进度 forceTime）：立即对齐
 * - 状态校正（forceCorrection）：暂停/远端 seek（偏差 > 阈值）时对齐，中途不追
 */
const FINAL_WINDOW_SEC = 3;
/** 播放中远端校正阈值；略低于常见 pending-snapshot 延迟，避免长期固定偏差 */
const REMOTE_SEEK_THRESHOLD_SEC = 0.5;

let finalSyncTrackId: string | null = null;
let finalSyncDone = false;

function durationSources() {
  const { lrcDurationMs, lrcTrackKey, mediaDurationMs, mediaTrackKey } = useAudioStore.getState();
  return { lrcDurationMs, lrcTrackKey, mediaDurationMs, mediaTrackKey };
}

/** 用户 seek / 切歌：必须立即同步 */
function isMandatorySync(options: ApplySyncOptions): boolean {
  return options.forceZero === true
    || options.forceTime !== undefined;
}

function isStatusCorrection(options: ApplySyncOptions): boolean {
  return options.forceCorrection === true;
}

export interface ApplySyncOptions {
  song: QueueItem;
  capTime: (time: number, mediaDur: number) => number;
  tvMode?: boolean;
  forceTime?: number;
  forceZero?: boolean;
  /** 服务端 playback_state：暂停/远端 seek 时校正，播放中途不追 */
  forceCorrection?: boolean;
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

function getRemainingTimeSec(song: QueueItem, positionSec: number): number {
  const durationSec = resolveTrackDurationSeconds(song, durationSources());
  if (durationSec <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, durationSec - positionSec);
}

function ensureFinalSyncTrack(trackId: string): void {
  if (finalSyncTrackId !== trackId) {
    finalSyncTrackId = trackId;
    finalSyncDone = false;
  }
}

function lockPlaybackRate(audio: HTMLAudioElement): void {
  resetDriftController(audio);
}

function syncModeLabel(options: ApplySyncOptions): string {
  if (options.forceZero) return 'force_zero';
  if (options.forceTime !== undefined) return 'force_time';
  if (options.forceCorrection) return 'force_correction';
  return 'routine';
}

function recordSyncDrift(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
  mode: string,
): void {
  const target = resolveTargetTime(audio, options);
  const audioTime = audio.currentTime;
  const diffSec = target - audioTime;
  recordDriftSample(diffSec);
  const state = getClientPlaybackState();
  debugLog('sync_drift', debugLine({
    mode,
    target: Number(target.toFixed(3)),
    audio: Number(audioTime.toFixed(3)),
    diffMs: Math.round(diffSec * 1000),
    absDiffMs: Math.round(Math.abs(diffSec) * 1000),
    version: state?.version ?? null,
    trackId: state?.trackId ?? options.song.queueId,
  }));
}

function explicitHardSeek(
  audio: HTMLAudioElement,
  target: number,
  trackId?: string,
  reason = 'hard_seek',
): void {
  const before = audio.currentTime;
  debugLog('sync_seek', debugLine({
    reason,
    target: Number(target.toFixed(3)),
    before: Number(before.toFixed(3)),
    diffMs: Math.round((target - before) * 1000),
    trackId: trackId || null,
    version: getClientPlaybackState()?.version ?? null,
  }));
  if (trackId) ensureFinalSyncTrack(trackId);
  finalSyncDone = false;
  lockPlaybackRate(audio);
  audio.currentTime = target;
  snapSmoothPlaybackTime(target);
  debugLog('sync_seek_done', debugLine({
    reason,
    after: Number(audio.currentTime.toFixed(3)),
    target: Number(target.toFixed(3)),
    seekErrorMs: Math.round((audio.currentTime - target) * 1000),
  }));
}

function shouldSkipRoutineSync(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): boolean {
  if (isMandatorySync(options)) return false;
  if (shouldSkipByBufferingState(false)) return true;
  return isAudioBuffering(audio);
}

/** 自动播放追赶：NORMAL 不动，FINAL 尾部一次性 seek（无 drift） */
function applyAutoPlaybackSync(
  audio: HTMLAudioElement,
  target: number,
  options: ApplySyncOptions,
): 'played' {
  lockPlaybackRate(audio);

  const trackId = getClientPlaybackState()?.trackId || options.song.queueId;
  ensureFinalSyncTrack(trackId);

  const remaining = getRemainingTimeSec(options.song, target);
  if (remaining > FINAL_WINDOW_SEC) {
    return 'played';
  }

  if (finalSyncDone) {
    return 'played';
  }

  const diff = target - audio.currentTime;
  if (diff > 0) {
    audio.currentTime = target;
    snapSmoothPlaybackTime(target);
    finalSyncDone = true;
  }

  return 'played';
}

/** 播放状态变更：暂停必对齐；播放中仅远端 seek（偏差大）或开声，中途不追 */
async function applyCorrectionSync(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<PlayResult | 'paused' | 'idle'> {
  const state = getClientPlaybackState();
  const target = resolveTargetTime(audio, options);
  const trackId = state?.trackId || options.song.queueId;
  const isPlaying = state?.status === 'playing';

  if (!isPlaying) {
    lockPlaybackRate(audio);
    if (!audio.paused) audio.pause();
    explicitHardSeek(audio, target, trackId, 'correction_paused');
    return 'paused';
  }

  const diff = target - audio.currentTime;
  if (Math.abs(diff) > REMOTE_SEEK_THRESHOLD_SEC) {
    explicitHardSeek(audio, target, trackId, 'force_correction');
  } else {
    debugLog('sync_skip', debugLine({
      reason: 'correction_below_threshold',
      diffMs: Math.round(diff * 1000),
      thresholdMs: Math.round(REMOTE_SEEK_THRESHOLD_SEC * 1000),
      target: Number(target.toFixed(3)),
      audio: Number(audio.currentTime.toFixed(3)),
    }));
    lockPlaybackRate(audio);
  }

  if (audio.paused) {
    const initial = await tryPlayWithAutoplayFallback(audio, Boolean(options.tvMode));
    const result = await assessPlaybackResult(audio, initial);
    debugLog('sync_play', debugLine({
      reason: 'correction',
      result,
      audio: Number(audio.currentTime.toFixed(3)),
    }));
    if (result !== 'played') return result;
  }

  return 'played';
}

async function applyMandatorySync(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<PlayResult | 'paused' | 'idle'> {
  const state = getClientPlaybackState();
  const target = resolveTargetTime(audio, options);
  const trackId = state?.trackId || options.song.queueId;
  const isPlaying = state?.status === 'playing';

  if (!isPlaying) {
    lockPlaybackRate(audio);
    if (!audio.paused) audio.pause();
    explicitHardSeek(audio, target, trackId, 'mandatory_paused');
    return 'paused';
  }

  explicitHardSeek(audio, target, trackId, options.forceZero ? 'force_zero' : 'mandatory');

  if (audio.paused) {
    const initial = await tryPlayWithAutoplayFallback(audio, Boolean(options.tvMode));
    const result = await assessPlaybackResult(audio, initial);
    debugLog('sync_play', debugLine({
      reason: options.forceZero ? 'force_zero' : 'mandatory',
      result,
      audio: Number(audio.currentTime.toFixed(3)),
    }));
    if (result !== 'played') return result;
  }

  return 'played';
}

export async function applyFollowerSync(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<PlayResult | 'paused' | 'idle'> {
  if (!audio.src) return 'idle';

  const mode = syncModeLabel(options);
  recordSyncDrift(audio, options, mode);

  if (isMandatorySync(options)) {
    return applyMandatorySync(audio, options);
  }

  if (isStatusCorrection(options)) {
    return applyCorrectionSync(audio, options);
  }

  if (shouldSkipRoutineSync(audio, options)) {
    return 'played';
  }

  const state = getClientPlaybackState();
  const isPlaying = state?.status === 'playing';
  const target = resolveTargetTime(audio, options);

  if (!isPlaying) {
    lockPlaybackRate(audio);
    if (!audio.paused) audio.pause();
    return 'paused';
  }

  if (audio.paused) {
    const initial = await tryPlayWithAutoplayFallback(audio, Boolean(options.tvMode));
    const result = await assessPlaybackResult(audio, initial);
    if (result !== 'played') return result;
  }

  if (shouldSkipRoutineSync(audio, options)) {
    return 'played';
  }

  return applyAutoPlaybackSync(audio, target, options);
}

export async function applyVisibilityResume(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<PlayResult | 'paused' | 'idle'> {
  return applyFollowerSync(audio, options);
}

export function resetPlaybackRate(audio: HTMLAudioElement): void {
  resetDriftController(audio);
}

export async function applyPostBufferSync(
  audio: HTMLAudioElement,
  options: ApplySyncOptions,
): Promise<void> {
  if (!audio.src || audio.paused || audio.ended) return;
  if (getClientPlaybackState()?.status !== 'playing') return;
  if (isMandatorySync(options)) {
    await applyMandatorySync(audio, options);
    return;
  }
  if (isStatusCorrection(options)) {
    await applyCorrectionSync(audio, options);
    return;
  }
  if (shouldSkipRoutineSync(audio, options)) return;

  const target = resolveTargetTime(audio, options);
  applyAutoPlaybackSync(audio, target, options);
}

export function resetPhaseSync(): void {
  finalSyncTrackId = null;
  finalSyncDone = false;
}
