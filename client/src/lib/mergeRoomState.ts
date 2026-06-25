import type { RoomState } from '../types';

/** room_update 已是核心快照（不含 messages/songHistory），直接替换本地房间状态。 */
export function mergeRoomState(incoming: RoomState, current: RoomState | null): RoomState {
  if (!current || current.id !== incoming.id) {
    return incoming;
  }
  return incoming;
}
