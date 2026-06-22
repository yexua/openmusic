import type { MusicSource, SearchResult } from '../../types';
import { fetchWithTimeout } from '../http';

export type PlaylistPlatform = 'netease' | 'qq';

export interface PlaylistImportResult {
  name: string;
  source: MusicSource;
  songs: SearchResult[];
  total: number;
  failed?: number;
}

export async function importPlaylist(
  platform: PlaylistPlatform,
  input: string,
): Promise<PlaylistImportResult> {
  const res = await fetchWithTimeout(
    '/api/music/playlist/import',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, input: input.trim() }),
    },
    120000,
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : '歌单导入失败');
  }
  return data as PlaylistImportResult;
}
