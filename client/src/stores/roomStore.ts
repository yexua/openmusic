import { create } from 'zustand';
import type { RoomState } from '../types';

interface RoomStore {
  room: RoomState | null;
  nickname: string;
  mySocketId: string | null;
  myConnectionId: string | null;
  isOwner: boolean;
  showPlayer: boolean;
  exitReason: string | null;
  setRoom: (room: RoomState | null) => void;
  setNickname: (name: string) => void;
  setConnectionInfo: (socketId: string | null, isOwner: boolean, connectionId?: string | null) => void;
  setShowPlayer: (show: boolean) => void;
  setExitReason: (reason: string | null) => void;
  resetSession: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  nickname: localStorage.getItem('sjb_nickname') || '',
  mySocketId: null,
  myConnectionId: null,
  isOwner: false,
  showPlayer: false,
  exitReason: null,
  setRoom: (room) => set({ room }),
  setNickname: (nickname) => {
    localStorage.setItem('sjb_nickname', nickname);
    set({ nickname });
  },
  setConnectionInfo: (mySocketId, isOwner, myConnectionId = null) => set({ mySocketId, myConnectionId, isOwner }),
  setShowPlayer: (showPlayer) => set({ showPlayer }),
  setExitReason: (exitReason) => set({ exitReason }),
  resetSession: () => set({
    room: null,
    mySocketId: null,
    myConnectionId: null,
    isOwner: false,
    showPlayer: false,
    exitReason: null,
  }),
}));
