import { create } from 'zustand';
import type { RoomState } from '../types';

interface RoomStore {
  room: RoomState | null;
  nickname: string;
  mySocketId: string | null;
  isOwner: boolean;
  showPlayer: boolean;
  setRoom: (room: RoomState | null) => void;
  setNickname: (name: string) => void;
  setConnectionInfo: (socketId: string | null, isOwner: boolean) => void;
  setShowPlayer: (show: boolean) => void;
  resetSession: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  nickname: localStorage.getItem('sjb_nickname') || '',
  mySocketId: null,
  isOwner: false,
  showPlayer: false,
  setRoom: (room) => set({ room }),
  setNickname: (nickname) => {
    localStorage.setItem('sjb_nickname', nickname);
    set({ nickname });
  },
  setConnectionInfo: (mySocketId, isOwner) => set({ mySocketId, isOwner }),
  setShowPlayer: (showPlayer) => set({ showPlayer }),
  resetSession: () => set({ room: null, mySocketId: null, isOwner: false, showPlayer: false }),
}));
