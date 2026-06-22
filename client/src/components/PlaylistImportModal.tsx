import { useEffect, useState } from 'react';
import { X, Loader2, ChevronLeft } from 'lucide-react';
import type { PlaylistPlatform } from '../api/music/playlist';

const HINTS: Record<PlaylistPlatform, string> = {
  netease: '复制网易云歌单分享文案或链接粘贴到下方。',
  qq: '点击 QQ 音乐歌单「分享」→ 打开 QQ → 选择「我的电脑」发送，将链接粘贴到下方。',
};

const PLATFORM_LABELS: Record<PlaylistPlatform, string> = {
  netease: '网易云音乐',
  qq: 'QQ音乐',
};

const TITLES: Record<PlaylistPlatform, string> = {
  netease: '导入网易云歌单',
  qq: '导入 QQ 音乐歌单',
};

interface Props {
  open: boolean;
  loading?: boolean;
  qqImportEnabled?: boolean;
  onClose: () => void;
  onImport: (platform: PlaylistPlatform, input: string) => void;
}

export default function PlaylistImportModal({
  open,
  loading = false,
  qqImportEnabled = true,
  onClose,
  onImport,
}: Props) {
  const [platform, setPlatform] = useState<PlaylistPlatform | null>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!open) {
      setPlatform(null);
      setInput('');
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = input.trim().length > 0 && !loading;

  if (!platform) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          aria-label="关闭"
        />
        <div className="relative w-full max-w-md glass rounded-2xl border border-white/10 shadow-2xl p-5 sm:p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">导入歌单</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-white/60 mb-4">选择歌单来源平台</p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPlatform('netease')}
              className="w-full rounded-xl border border-white/10 bg-netease-card/80 px-4 py-3 text-sm text-white text-left hover:border-netease-red/40 hover:bg-white/5 transition-colors"
            >
              {PLATFORM_LABELS.netease}
            </button>
            <button
              type="button"
              onClick={() => setPlatform('qq')}
              disabled={!qqImportEnabled}
              title={qqImportEnabled ? undefined : '请配置 CYAPI_KEY 后使用'}
              className="w-full rounded-xl border border-white/10 bg-netease-card/80 px-4 py-3 text-sm text-white text-left hover:border-netease-red/40 hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {PLATFORM_LABELS.qq}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="关闭"
      />
      <div className="relative w-full max-w-md glass rounded-2xl border border-white/10 shadow-2xl p-5 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setPlatform(null)}
              disabled={loading}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
              aria-label="返回选择平台"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">{TITLES[platform]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-white/60 leading-relaxed mb-4">
          {HINTS[platform]}
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={platform === 'netease'
            ? '粘贴分享链接或完整分享文案…'
            : '粘贴 QQ 音乐歌单分享链接…'}
          rows={4}
          disabled={loading}
          className="w-full resize-none rounded-xl border border-netease-border bg-netease-card/80 px-3 py-2.5 text-sm text-white placeholder:text-netease-muted/50 focus:outline-none focus:border-netease-red/50 transition-colors disabled:opacity-50"
        />

        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onImport(platform, input.trim())}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-xl text-sm bg-netease-red text-white hover:bg-red-500 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            解析歌单
          </button>
        </div>
      </div>
    </div>
  );
}
