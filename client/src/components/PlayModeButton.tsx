import { useCallback, useState } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useSocket } from '../hooks/useSocket';
import {
  normalizePlayMode,
  nextPlayMode,
  PLAY_MODE_META,
} from '../lib/playMode';
import Tooltip from './Tooltip';

interface Props {
  className?: string;
  iconClassName?: string;
}

export default function PlayModeButton({
  className = '',
  iconClassName = 'h-4 w-4',
}: Props) {
  const playMode = useRoomStore((s) => normalizePlayMode(s.room?.playMode));
  const canControl = useRoomStore((s) => s.canControlPlayback);
  const { setRoomPlayMode } = useSocket();
  const [busy, setBusy] = useState(false);
  const meta = PLAY_MODE_META[playMode];
  const Icon = meta.Icon;

  const handleClick = useCallback(async () => {
    if (!canControl || busy) return;
    const next = nextPlayMode(playMode);
    setBusy(true);
    try {
      const res = await setRoomPlayMode(next);
      if (!res.success) {
        window.dispatchEvent(new CustomEvent('openmusic:visual-toast', {
          detail: { message: res.error || '切换失败', type: 'error' },
        }));
      } else {
        window.dispatchEvent(new CustomEvent('openmusic:visual-toast', {
          detail: { message: PLAY_MODE_META[next].label, type: 'success' },
        }));
      }
    } finally {
      setBusy(false);
    }
  }, [busy, canControl, playMode, setRoomPlayMode]);

  const tip = canControl
    ? meta.label
    : `${meta.label}（仅房主/管理员可切换）`;

  return (
    <Tooltip content={tip}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={!canControl || busy}
        className={`flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          playMode === 'order'
            ? 'text-netease-muted hover:bg-white/10 hover:text-white'
            : 'text-netease-red hover:bg-netease-red/15'
        } ${className}`}
        aria-label={tip}
      >
        <Icon className={iconClassName} />
      </button>
    </Tooltip>
  );
}
