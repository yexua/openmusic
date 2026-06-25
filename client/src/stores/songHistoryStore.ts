import { create } from 'zustand';
import type { SongHistoryItem } from '../types';

interface SongHistoryStore {
  roomId: string | null;
  songs: SongHistoryItem[];
  loading: boolean;
  loaded: boolean;
  setSongs: (roomId: string, songs: SongHistoryItem[]) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useSongHistoryStore = create<SongHistoryStore>((set) => ({
  roomId: null,
  songs: [],
  loading: false,
  loaded: false,

  setSongs: (roomId, songs) => set({
    roomId,
    songs,
    loading: false,
    loaded: true,
  }),

  setLoading: (loading) => set({ loading }),

  clear: () => set({
    roomId: null,
    songs: [],
    loading: false,
    loaded: false,
  }),
}));

export function getSongHistoryKeys(songs: SongHistoryItem[]): Set<string> {
  return new Set(songs.map((item) => `${item.source || 'netease'}:${item.id}`));
}
