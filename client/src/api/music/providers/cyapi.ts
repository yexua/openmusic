import type { MusicProvider, SearchResult } from '../types';
import { fetchWithTimeout } from '../../http';

const API_BASE = '/api/music/cyapi';

interface CyapiArtist {
  name?: string;
  title?: string;
}

interface CyapiAlbum {
  name?: string;
}

interface CyapiCover {
  medium?: string;
  large?: string;
  small?: string;
}

interface CyapiSong {
  name?: string;
  songname?: string;
  song_name?: string;
  title?: string;
  id?: string;
  mid?: string;
  songmid?: string;
  song_mid?: string;
  /** 搜索列表为字符串，单曲详情为对象数组 */
  artists?: CyapiArtist[] | string;
  singer?: CyapiArtist[] | CyapiArtist | string;
  singername?: string;
  artist?: string;
  album?: CyapiAlbum | string;
  albumname?: string;
  album_name?: string;
  duration?: number;
  interval?: number;
  song_time?: number;
  /** 搜索列表为 URL 字符串，单曲详情为尺寸对象 */
  cover?: CyapiCover | string;
  pic?: string;
  album_pic?: string;
  albumimg?: string;
  url?: string;
  music_url?: string;
  play_url?: string;
  lyric?: { text?: string };
  lrc?: string;
}

function extractCyapiArtistLabel(raw: CyapiSong): string {
  if (typeof raw.artists === 'string' && raw.artists.trim()) {
    return raw.artists.trim();
  }
  if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    const label = raw.artists
      .map((entry) => (typeof entry === 'string' ? entry : entry?.name || entry?.title))
      .filter(Boolean)
      .join(' / ');
    if (label) return label;
  }
  if (raw.singer && typeof raw.singer === 'object' && !Array.isArray(raw.singer)) {
    const name = raw.singer.name || raw.singer.title;
    if (name) return name;
  }
  if (Array.isArray(raw.singer) && raw.singer.length > 0) {
    const label = raw.singer
      .map((entry) => (typeof entry === 'string' ? entry : entry?.name || entry?.title))
      .filter(Boolean)
      .join(' / ');
    if (label) return label;
  }
  if (typeof raw.singer === 'string' && raw.singer.trim()) return raw.singer.trim();
  if (typeof raw.singername === 'string' && raw.singername.trim()) return raw.singername.trim();
  if (typeof raw.artist === 'string' && raw.artist.trim()) return raw.artist.trim();
  return '未知歌手';
}

function extractCyapiPic(raw: CyapiSong): string | undefined {
  const { cover } = raw;
  if (typeof cover === 'string' && cover.trim()) return cover.trim();
  if (cover && typeof cover === 'object') {
    return cover.medium || cover.large || cover.small;
  }
  return raw.pic || raw.album_pic || raw.albumimg;
}

function normalizeCyapi(raw: CyapiSong): SearchResult {
  const id = String(raw.id || raw.mid || raw.songmid || raw.song_mid || '').trim();
  const album = typeof raw.album === 'string'
    ? raw.album
    : raw.album?.name || raw.albumname || raw.album_name;

  const durationRaw = Number(raw.duration ?? raw.interval ?? raw.song_time ?? 0);
  const durationMs = Number.isFinite(durationRaw) && durationRaw > 0
    ? (durationRaw < 10000 ? durationRaw * 1000 : durationRaw)
    : undefined;

  return {
    id,
    source: 'tencent',
    name: String(raw.name || raw.songname || raw.song_name || raw.title || '未知歌曲'),
    artist: extractCyapiArtistLabel(raw),
    album,
    pic: extractCyapiPic(raw),
    duration: durationMs,
    url: raw.url || raw.music_url || raw.play_url,
    lrc: raw.lyric?.text || raw.lrc,
  };
}

export const tencentCyapiProvider: Pick<MusicProvider, 'search' | 'getSongById' | 'getSongUrl' | 'getLyrics' | 'getCoverUrl'> = {
  async search(keyword) {
    if (!keyword.trim()) return [];
    const params = new URLSearchParams({ q: keyword.trim(), num: '30' });
    const res = await fetchWithTimeout(`${API_BASE}/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json() as CyapiSong[];
    if (!Array.isArray(data)) return [];
    return data.map(normalizeCyapi).filter((s) => s.id);
  },

  async getSongById() {
    return null;
  },

  async getSongUrl(song) {
    if (song.url?.startsWith('http')) return song.url;
    const query = new URLSearchParams({ server: 'tencent', type: 'url', id: song.id });
    const res = await fetchWithTimeout(`/api/meting?${query}`, { redirect: 'follow' });
    const text = await res.text();
    if (text.startsWith('@')) return text.slice(1);
    if (text.startsWith('http')) return text;
    return res.url;
  },

  async getLyrics(song) {
    if (song.lrc?.startsWith('[')) return song.lrc;
    const query = new URLSearchParams({ server: 'tencent', type: 'lrc', id: song.id });
    const res = await fetchWithTimeout(`/api/meting?${query}`);
    return res.text();
  },

  getCoverUrl(song) {
    if (song.pic) return song.pic;
    return `/api/meting?server=tencent&type=pic&id=${song.id}`;
  },
};
