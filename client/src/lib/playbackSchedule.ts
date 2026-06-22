import type { PlaybackState } from '../types';
import { useAudioStore } from '../stores/audioStore';
import { useRoomStore } from '../stores/roomStore';
import {
  applyPlaybackState,
  getPlaybackTime,
  playbackStateFromRoom,
  resetPlaybackStateCache,
} from './playbackState';
import type { RoomState } from '../types';

const PLAYBACK_DEBOUNCE_MS = 150;

let latestPlaybackState: PlaybackState | null = null;
let playbackScheduled = false;
let playbackDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function syncRoomPlaybackFromState(state: PlaybackState) {
  const { room } = useRoomStore.getState();
  if (!room || room.id !== state.roomId) return;
  useRoomStore.getState().setRoom({
    ...room,
    currentTime: getPlaybackTime(state),
    isPlaying: state.status === 'playing',
  });
}

/** 立即应用（加入房间等初始同步） */
export function commitPlaybackState(state: PlaybackState): boolean {
  if (!applyPlaybackState(state)) return false;
  useAudioStore.getState().setPlaybackVersion(state.version);
  syncRoomPlaybackFromState(state);
  return true;
}

/** 防抖合并高频 playback_state（150ms） */
export function schedulePlaybackState(state: PlaybackState): void {
  latestPlaybackState = state;
  if (playbackScheduled) return;
  playbackScheduled = true;
  playbackDebounceTimer = setTimeout(() => {
    playbackScheduled = false;
    playbackDebounceTimer = null;
    if (latestPlaybackState) {
      commitPlaybackState(latestPlaybackState);
      latestPlaybackState = null;
    }
  }, PLAYBACK_DEBOUNCE_MS);
}

export function resetPlaybackScheduling(): void {
  if (playbackDebounceTimer) {
    clearTimeout(playbackDebounceTimer);
    playbackDebounceTimer = null;
  }
  playbackScheduled = false;
  latestPlaybackState = null;
}

export function seedPlaybackFromRoom(room: RoomState): void {
  if (!room.current) {
    resetPlaybackStateCache();
    resetPlaybackScheduling();
    useAudioStore.getState().setPlaybackVersion(0);
    return;
  }
  const state = playbackStateFromRoom(
    room.id,
    room.current.queueId,
    room.isPlaying,
    room.currentTime,
  );
  commitPlaybackState(state);
}
