import { useEffect, useState } from 'react';
import { getLyrics, parseLrc, getLrcFallbackDurationMs, getTrackKey } from '../api/music';
import { useAudioStore } from '../stores/audioStore';
import { reportTrackDurationToServer } from '../lib/reportTrackDuration';
import type { LyricLine, Song } from '../types';

export function useTrackLyrics(song: Pick<Song, 'id' | 'source' | 'name' | 'lrc' | 'duration'> | null | undefined) {
  const setLrcDuration = useAudioStore((s) => s.setLrcDuration);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);

  useEffect(() => {
    if (!song) {
      setLyrics([]);
      return;
    }

    setLyrics([]);
    getLyrics({
      id: song.id,
      source: song.source || 'netease',
      name: song.name,
      lrc: song.lrc,
    })
      .then((lrc) => {
        const lines = parseLrc(lrc);
        setLyrics(lines);
        if (!song.duration) {
          const ms = getLrcFallbackDurationMs(lrc);
          if (ms) {
            setLrcDuration(getTrackKey(song), ms);
            const queueId = 'queueId' in song && typeof (song as { queueId?: string }).queueId === 'string'
              ? (song as { queueId: string }).queueId
              : undefined;
            if (queueId) reportTrackDurationToServer(queueId, ms);
          }
        }
      })
      .catch(() => setLyrics([]));
  }, [song?.id, song?.source, song?.name, song?.lrc, song?.duration, setLrcDuration]);

  return lyrics;
}
