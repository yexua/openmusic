import { getCoverUrl } from '../api/music';
import type { Song } from '../types';
import AmbientCoverLayers from './AmbientCoverLayers';

interface Props {
  song: Pick<Song, 'id' | 'source' | 'pic'> | null | undefined;
}

export default function RoomAmbientBackground({ song }: Props) {
  const coverUrl = song ? getCoverUrl(song, 'medium') : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {coverUrl ? (
        <AmbientCoverLayers coverUrl={coverUrl} />
      ) : (
        <div className="absolute inset-0 bg-[#0d0d0d]" />
      )}
    </div>
  );
}
