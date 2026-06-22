import type { PlaybackState } from '../types';

const clientState = {
  server: null as PlaybackState | null,
  localVersion: 0,
};

/** 从服务端快照计算当前播放时间（秒） */
export function getPlaybackTime(state: PlaybackState | null | undefined): number {
  if (!state) return 0;
  if (state.status !== 'playing') return state.currentTime;
  return (Date.now() - state.startedAt) / 1000;
}

export function getClientPlaybackState(): PlaybackState | null {
  return clientState.server;
}

export function getClientPlaybackVersion(): number {
  return clientState.localVersion;
}

/** 应用服务端状态快照；旧版本丢弃 */
export function applyPlaybackState(state: PlaybackState): boolean {
  if (state.version < clientState.localVersion) return false;
  clientState.server = state;
  clientState.localVersion = state.version;
  return true;
}

export function resetPlaybackStateCache(): void {
  clientState.server = null;
  clientState.localVersion = 0;
}

/** 从房间数据构造初始播放状态（加入房间时） */
export function playbackStateFromRoom(
  roomId: string,
  trackId: string,
  isPlaying: boolean,
  currentTime: number,
  version = 0,
): PlaybackState {
  const now = Date.now();
  return {
    roomId,
    version,
    trackId,
    status: isPlaying ? 'playing' : 'paused',
    startedAt: isPlaying ? now - currentTime * 1000 : 0,
    currentTime,
    updatedAt: now,
  };
}
