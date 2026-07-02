import {
  ROOM_VISUAL_DISPLAY_ORDER,
  ROOM_VISUAL_MODE_META,
  type RoomVisualMode,
} from '../lib/roomVisualPreset';

const PRESET_DESC: Record<RoomVisualMode, string> = {
  off: '关闭粒子背景',
  'cover-bg': '封面铺满背景',
  emily: '专辑封面粒子',
  galaxy: '星河漫游',
  vinyl: '旋转唱片',
  tunnel: '滚筒隧道',
};

interface Props {
  value: RoomVisualMode;
  onChange: (mode: RoomVisualMode) => void;
}

export default function RoomVisualPresetGrid({ value, onChange }: Props) {
  return (
    <div className="preset-grid" role="listbox" aria-label="视觉预设">
      {ROOM_VISUAL_DISPLAY_ORDER.filter((mode) => ROOM_VISUAL_MODE_META[mode].hasSettings).map((mode) => {
        const meta = ROOM_VISUAL_MODE_META[mode];
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="option"
            aria-selected={active}
            className={`preset-card ${active ? 'active' : ''}`}
            onClick={() => onChange(mode)}
          >
            <div className="pc-name">{meta.name}</div>
            <div className="pc-desc">{PRESET_DESC[mode]}</div>
          </button>
        );
      })}
    </div>
  );
}
