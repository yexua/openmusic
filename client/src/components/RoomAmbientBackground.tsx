import { Suspense, lazy } from 'react';
import { getCoverUrl } from '../api/music';
import type { QueueItem } from '../types';
import { ROOM_VISUAL_MODE_META, type RoomVisualMode } from '../lib/roomVisualPreset';
import AmbientCoverLayers from './AmbientCoverLayers';

const GalaxyBackground = lazy(() => import('./galaxy/GalaxyBackground3D'));

interface Props {
  song: Pick<QueueItem, 'queueId' | 'id' | 'source' | 'pic' | 'url'> | null | undefined;
  visualMode: RoomVisualMode;
  isPlaying: boolean;
  immersivePanelFocus?: 'search' | 'queue' | 'chat' | null;
}

export default function RoomAmbientBackground({
  song,
  visualMode,
  isPlaying,
  immersivePanelFocus = null,
}: Props) {
  const coverUrl = song ? getCoverUrl(song, 'medium') : null;
  const meta = ROOM_VISUAL_MODE_META[visualMode];
  const shaderPreset = meta.shaderPreset;
  const showGalaxy = shaderPreset !== undefined;
  const showCoverUnderlay = visualMode === 'cover-bg' && Boolean(coverUrl);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {visualMode === 'off' ? <div className="absolute inset-0 bg-[#08090b]" /> : null}
      {showCoverUnderlay ? (
        <div className="absolute inset-0">
          <AmbientCoverLayers coverUrl={coverUrl!} />
        </div>
      ) : null}
      {showGalaxy ? (
        <Suspense fallback={null}>
          <GalaxyBackground
            coverUrl={coverUrl}
            preset={shaderPreset}
            isPlaying={isPlaying}
            song={song}
            immersivePanelFocus={immersivePanelFocus}
          />
        </Suspense>
      ) : null}
      {visualMode === 'cover-bg' && !coverUrl ? (
        <div className="absolute inset-0 bg-[#08090b]" />
      ) : null}
    </div>
  );
}
