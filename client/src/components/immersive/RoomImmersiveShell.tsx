import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ListMusic, MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react';

type PanelId = 'search' | 'queue' | 'chat';

const CLOSE_DELAY_MS = 320;
const EDGE_SIZE = 14;
const BOTTOM_BAR_CLOSE_DELAY_MS = 420;
const FX_FAB_PEEK_DELAY_MS = 1100;
const EDGE_CLOSE_DELAY_MS = 280;

interface Props {
  onExit: () => void;
  onPanelFocusChange?: (panel: 'search' | 'queue' | 'chat' | null) => void;
  searchBar: ReactNode;
  searchExtras?: ReactNode;
  searchResults?: ReactNode;
  showSearchResults?: boolean;
  queueContent: ReactNode;
  chatContent: ReactNode;
  settingsPanel: ReactNode;
  player: ReactNode;
}

function EdgeHint({
  label,
  icon: Icon,
  side,
  visible,
}: {
  label: string;
  icon: typeof Search;
  side: 'top' | 'left' | 'right';
  visible: boolean;
}) {
  const sideClass =
    side === 'top'
      ? 'left-1/2 top-0 -translate-x-1/2 rounded-b-xl border-t-0 px-4 py-1'
      : side === 'left'
        ? 'left-0 top-1/2 -translate-y-1/2 rounded-r-xl border-l-0 py-3 pl-1.5 pr-2'
        : 'right-0 top-1/2 -translate-y-1/2 rounded-l-xl border-r-0 py-3 pl-2 pr-1.5';

  return (
    <div
      className={`pointer-events-none absolute z-20 flex items-center gap-1 border border-white/10 bg-black/20 text-[10px] font-medium tracking-wide text-white/45 backdrop-blur-md transition-all duration-300 ${sideClass} ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" />
      <span className={side === 'left' || side === 'right' ? '[writing-mode:vertical-rl]' : ''}>{label}</span>
    </div>
  );
}

export default function RoomImmersiveShell({
  onExit,
  onPanelFocusChange,
  searchBar,
  searchExtras,
  searchResults,
  showSearchResults = false,
  queueContent,
  chatContent,
  settingsPanel,
  player,
}: Props) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fxFabAutoHide, setFxFabAutoHide] = useState(false);
  const [fxFabPeek, setFxFabPeek] = useState(true);
  const [bottomBarVisible, setBottomBarVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const bottomBarCloseTimerRef = useRef<number | null>(null);
  const fxFabPeekTimerRef = useRef<number | null>(null);
  const panelHoverRef = useRef(false);
  const edgeHoverRef = useRef(false);

  const cancelBottomBarClose = useCallback(() => {
    if (bottomBarCloseTimerRef.current !== null) {
      window.clearTimeout(bottomBarCloseTimerRef.current);
      bottomBarCloseTimerRef.current = null;
    }
  }, []);

  const cancelFxFabPeek = useCallback(() => {
    if (fxFabPeekTimerRef.current !== null) {
      window.clearTimeout(fxFabPeekTimerRef.current);
      fxFabPeekTimerRef.current = null;
    }
  }, []);

  const revealFxFab = useCallback(() => {
    cancelFxFabPeek();
    setFxFabPeek(true);
  }, [cancelFxFabPeek]);

  const scheduleFxFabHide = useCallback(() => {
    cancelFxFabPeek();
    if (!fxFabAutoHide || settingsOpen) return;
    fxFabPeekTimerRef.current = window.setTimeout(() => {
      setFxFabPeek(false);
      fxFabPeekTimerRef.current = null;
    }, FX_FAB_PEEK_DELAY_MS);
  }, [cancelFxFabPeek, fxFabAutoHide, settingsOpen]);

  const showBottomBar = useCallback(() => {
    cancelBottomBarClose();
    setBottomBarVisible(true);
  }, [cancelBottomBarClose]);

  const scheduleBottomBarClose = useCallback(() => {
    cancelBottomBarClose();
    bottomBarCloseTimerRef.current = window.setTimeout(() => {
      setBottomBarVisible(false);
      bottomBarCloseTimerRef.current = null;
    }, BOTTOM_BAR_CLOSE_DELAY_MS);
  }, [cancelBottomBarClose]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);


  const scheduleClose = useCallback(() => {
    if (panelHoverRef.current || edgeHoverRef.current) return;
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      if (panelHoverRef.current || edgeHoverRef.current) return;
      setOpenPanel(null);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const scheduleCloseFromEdge = useCallback(() => {
    edgeHoverRef.current = false;
    if (panelHoverRef.current) return;
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      if (panelHoverRef.current || edgeHoverRef.current) return;
      setOpenPanel(null);
      closeTimerRef.current = null;
    }, EDGE_CLOSE_DELAY_MS);
  }, [cancelClose]);

  const openFromEdge = useCallback(
    (panel: PanelId) => {
      edgeHoverRef.current = true;
      cancelClose();
      setOpenPanel(panel);
    },
    [cancelClose],
  );

  const handlePanelEnter = useCallback(() => {
    panelHoverRef.current = true;
    cancelClose();
  }, [cancelClose]);

  const handlePanelLeave = useCallback(() => {
    panelHoverRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  useEffect(
    () => () => {
      cancelClose();
      cancelBottomBarClose();
      cancelFxFabPeek();
    },
    [cancelBottomBarClose, cancelClose, cancelFxFabPeek],
  );

  useEffect(() => {
    onPanelFocusChange?.(openPanel);
  }, [onPanelFocusChange, openPanel]);

  useEffect(() => {
    if (!openPanel || settingsOpen) return;
    const onPointerMove = (e: PointerEvent) => {
      if (panelHoverRef.current || edgeHoverRef.current) return;
      const x = e.clientX;
      const y = e.clientY;
      const inTop = y <= EDGE_SIZE;
      const inLeft = x <= EDGE_SIZE;
      const inRight = x >= window.innerWidth - EDGE_SIZE && y <= window.innerHeight - 112;
      const inBottom = y >= window.innerHeight - 28;
      if (!inTop && !inLeft && !inRight && !inBottom) {
        scheduleClose();
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [openPanel, scheduleClose, settingsOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (openPanel) {
        setOpenPanel(null);
        return;
      }
      onExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit, openPanel, settingsOpen]);

  useEffect(() => {
    if (settingsOpen) {
      setFxFabPeek(true);
      cancelFxFabPeek();
      return;
    }
    scheduleFxFabHide();
  }, [cancelFxFabPeek, scheduleFxFabHide, settingsOpen]);

  const anyPanelOpen = openPanel !== null || settingsOpen;
  const chatDocked = openPanel === 'chat' && !settingsOpen;
  const openSettingsPanel = useCallback(() => {
    setOpenPanel(null);
    setFxFabPeek(true);
    setSettingsOpen(true);
  }, []);

  const closeSettingsPanel = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  return (
    <div className="room-immersive-mode fixed inset-0 z-40 pointer-events-none">
      <div
        className="absolute inset-x-0 bottom-0 h-[88px] bg-gradient-to-t from-black/14 to-transparent"
        aria-hidden
      />

      <div
        className="absolute top-0 left-0 right-0 pointer-events-auto z-30"
        style={{ height: EDGE_SIZE }}
        onMouseEnter={() => openFromEdge('search')}
        onMouseLeave={scheduleCloseFromEdge}
      />
      <div
        className="absolute top-0 left-0 bottom-0 pointer-events-auto z-30"
        style={{ width: EDGE_SIZE }}
        onMouseEnter={() => openFromEdge('queue')}
        onMouseLeave={scheduleCloseFromEdge}
      />
      <div
        className="absolute top-0 right-0 bottom-0 pointer-events-auto z-30"
        style={{ width: EDGE_SIZE, bottom: 112 }}
        onMouseEnter={() => openFromEdge('chat')}
        onMouseLeave={scheduleCloseFromEdge}
      />
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-auto z-30"
        style={{ height: 28 }}
        onMouseEnter={showBottomBar}
      />
      <EdgeHint label="搜索" icon={Search} side="top" visible={!anyPanelOpen} />
      <EdgeHint label="队列" icon={ListMusic} side="left" visible={!anyPanelOpen} />
      <EdgeHint label="聊天" icon={MessageCircle} side="right" visible={!anyPanelOpen} />

      <div className="pointer-events-auto absolute right-4 top-4 z-[72] flex items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl transition-colors hover:bg-black/40 hover:text-white"
        >
          退出沉浸
        </button>
      </div>

      <button
        type="button"
        id="fx-fab"
        onMouseEnter={revealFxFab}
        onMouseLeave={scheduleFxFabHide}
        onClick={openSettingsPanel}
        className={`immersive-fx-fab ${settingsOpen ? 'active' : ''} ${chatDocked ? 'chat-docked' : ''} ${fxFabAutoHide && !fxFabPeek && !settingsOpen ? 'auto-hidden' : ''}`}
        style={{ pointerEvents: 'auto' }}
        aria-label="视觉控制台"
        aria-expanded={settingsOpen}
      >
        <SlidersHorizontal className="h-[21px] w-[21px]" />
      </button>
      <button
        type="button"
        id="fx-fab-hide-btn"
        onMouseEnter={revealFxFab}
        onMouseLeave={scheduleFxFabHide}
        onClick={(e) => {
          e.stopPropagation();
          setFxFabAutoHide((prev) => {
            const next = !prev;
            if (!next) setFxFabPeek(true);
            return next;
          });
        }}
        className={`immersive-fx-fab-hide ${fxFabAutoHide ? 'on' : ''} ${chatDocked ? 'chat-docked' : ''} ${fxFabAutoHide && !fxFabPeek && !settingsOpen ? 'auto-hidden' : ''}`}
        style={{ pointerEvents: 'auto' }}
        title={fxFabAutoHide ? '取消自动隐藏视觉控制台' : '自动隐藏视觉控制台'}
        aria-label={fxFabAutoHide ? '取消自动隐藏视觉控制台' : '自动隐藏视觉控制台'}
      >
        <ChevronLeft className="h-3 w-3" />
      </button>

      <div
        className={`pointer-events-auto fixed left-1/2 top-4 z-[70] w-[min(620px,calc(100vw-56px))] -translate-x-1/2 transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          openPanel === 'search'
            ? 'translate-y-0'
            : '-translate-y-[calc(100%+1.5rem)]'
        }`}
        onMouseEnter={handlePanelEnter}
        onMouseLeave={handlePanelLeave}
      >
        <div
          className={`mineradio-glass-panel flex flex-col overflow-hidden rounded-[24px] p-3 ${
            showSearchResults ? 'h-[min(78vh,720px)]' : 'max-h-[min(78vh,720px)]'
          }`}
        >
          <div className="shrink-0">{searchBar}</div>
          {searchExtras ? <div className="mt-2 shrink-0 px-0.5">{searchExtras}</div> : null}
          {showSearchResults && searchResults ? (
            <div id="search-results" className="mineradio-glass-search-results mt-2 flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              {searchResults}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`pointer-events-auto fixed left-0 top-0 z-[68] h-full w-[min(380px,calc(100vw-48px))] transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          openPanel === 'queue' ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseEnter={handlePanelEnter}
        onMouseLeave={handlePanelLeave}
      >
        <div className="mineradio-glass-panel m-3 flex h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[22px]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-medium text-white/90">播放队列</h2>
            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="关闭队列"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-2">{queueContent}</div>
        </div>
      </div>

      <div
        className={`pointer-events-auto fixed right-0 top-0 z-[68] h-full w-[min(380px,calc(100vw-48px))] transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          openPanel === 'chat' && !settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onMouseEnter={handlePanelEnter}
        onMouseLeave={handlePanelLeave}
      >
        <div className="mineradio-glass-panel m-3 flex h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[22px]">
          <div className="min-h-0 flex-1 overflow-hidden">{chatContent}</div>
        </div>
      </div>

      {settingsOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[78] bg-black/18 backdrop-blur-[2px]"
          style={{ pointerEvents: 'auto' }}
          onClick={closeSettingsPanel}
          aria-label="关闭视觉控制台遮罩"
        />
      ) : null}

      <div
        id="fx-panel"
        className={`mineradio-fx-panel pointer-events-auto fixed z-[79] transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          settingsOpen ? 'show' : ''
        }`}
        style={{
          right: settingsOpen ? '24px' : '-460px',
          bottom: '88px',
          opacity: settingsOpen ? 1 : 0,
          pointerEvents: settingsOpen ? 'auto' : 'none',
          transform: settingsOpen ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.97)',
        }}
        onMouseEnter={revealFxFab}
        onMouseLeave={scheduleFxFabHide}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fx-head">
          <div className="fx-head-main">
            <div className="fx-title">视觉控制台</div>
            <div className="fx-sub">MINERADIO VISUALS · 鼠标移开自动隐藏</div>
          </div>
          <div className="fx-head-actions">
            <button
              type="button"
              onClick={closeSettingsPanel}
              className="fx-close"
              aria-label="关闭设置"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mineradio-fx-panel-body">{settingsPanel}</div>
      </div>

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-[71] flex justify-center px-3 pb-4 transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          bottomBarVisible ? 'translate-y-0' : 'translate-y-[calc(100%+24px)]'
        }`}
      >
        <div
          className="pointer-events-auto w-full max-w-[min(1120px,calc(100vw-clamp(20px,5vw,72px)))]"
          onMouseEnter={showBottomBar}
          onMouseLeave={scheduleBottomBarClose}
        >
          {player}
        </div>
      </div>
    </div>
  );
}
