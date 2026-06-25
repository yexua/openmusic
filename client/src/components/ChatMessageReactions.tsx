import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ChatReactionGroup } from '../types';
import QFaceImage from './QFaceImage';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  ensureQQFacesLoaded,
  getInitialQQFaces,
  hasFullQQFaces,
  parseQQFaceToken,
  QFaceLoadPriority,
  qqFaceToken,
  subscribeQQFaces,
  type QFaceItem,
} from '../lib/qface';

const MAX_VISIBLE_GROUPS = 3;

function ReactionEmoji({ emoji, className = 'h-4 w-4' }: { emoji: string; className?: string }) {
  const faceId = parseQQFaceToken(emoji);
  if (faceId) {
    return (
      <QFaceImage
        id={faceId}
        priority={QFaceLoadPriority.MESSAGE}
        className={`${className} object-contain`}
        placeholderClassName={className}
      />
    );
  }
  return <span className="text-sm leading-none">{emoji}</span>;
}

interface ChatOverlayPortalProps {
  isMobileLayout: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  ariaLabel: string;
  panelRef: RefObject<HTMLDivElement | null>;
  desktopPanelClassName: string;
  mobilePanelClassName: string;
  children: ReactNode;
}

function ChatOverlayPortal({
  isMobileLayout,
  containerRef,
  onClose,
  ariaLabel,
  panelRef,
  desktopPanelClassName,
  mobilePanelClassName,
  children,
}: ChatOverlayPortalProps) {
  const container = containerRef.current;
  if (!isMobileLayout && !container) return null;

  const overlay = isMobileLayout ? (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label={ariaLabel}
      />
      <div ref={panelRef as Ref<HTMLDivElement>} className={mobilePanelClassName}>
        {children}
      </div>
    </div>
  ) : (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-label={ariaLabel}
      />
      <div ref={panelRef as Ref<HTMLDivElement>} className={desktopPanelClassName}>
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, isMobileLayout ? document.body : container!);
}

function useOverlayDismiss(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLDivElement | null>,
  scrollRoot?: HTMLElement | null,
) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !scrollRoot) return;
    const onScroll = () => onClose();
    scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollRoot.removeEventListener('scroll', onScroll);
  }, [open, scrollRoot, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose]);
}

interface ReactionDetailModalProps {
  title: string;
  groups: ChatReactionGroup[];
  myUserId: string;
  onClose: () => void;
  onToggle: (emoji: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  scrollRoot?: HTMLElement | null;
  isMobileLayout: boolean;
}

function ReactionDetailModal({
  title,
  groups,
  myUserId,
  onClose,
  onToggle,
  containerRef,
  scrollRoot = null,
  isMobileLayout,
}: ReactionDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useOverlayDismiss(true, onClose, panelRef, scrollRoot);

  return (
    <ChatOverlayPortal
      isMobileLayout={isMobileLayout}
      containerRef={containerRef}
      onClose={onClose}
      ariaLabel="关闭点评详情"
      panelRef={panelRef}
      desktopPanelClassName="relative z-10 flex w-[min(280px,92%)] max-h-[min(72%,320px)] flex-col rounded-2xl border border-netease-border/70 bg-netease-dark/98 p-3 shadow-2xl backdrop-blur"
      mobilePanelClassName="absolute inset-x-0 bottom-0 z-10 flex max-h-[min(75vh,420px)] flex-col rounded-t-2xl border-t border-netease-border/70 bg-netease-dark/98 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur"
    >
      <div className="mb-2 flex flex-shrink-0 items-center justify-between">
        <span className="text-sm text-white">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-netease-muted hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {groups.map((group) => {
          const reacted = group.users.some((user) => user.userId === myUserId);
          return (
            <button
              key={group.emoji}
              type="button"
              onClick={() => {
                onToggle(group.emoji);
                onClose();
              }}
              className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/10 active:bg-white/15"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
                <ReactionEmoji emoji={group.emoji} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-xs leading-5 text-white/90">
                {group.users.map((user) => user.nickname).join('、')}
              </span>
              <span className="flex-shrink-0 text-[10px] text-netease-muted tabular-nums">
                {reacted ? '已点评' : group.users.length}
              </span>
            </button>
          );
        })}
      </div>
    </ChatOverlayPortal>
  );
}

interface ReactionChipProps {
  group: ChatReactionGroup;
  reacted: boolean;
  myUserId: string;
  overflowGroups?: ChatReactionGroup[];
  displayCount?: number;
  onToggle: (emoji: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  scrollRoot?: HTMLElement | null;
  isMobileLayout: boolean;
}

function ReactionChip({
  group,
  reacted,
  myUserId,
  overflowGroups,
  displayCount,
  onToggle,
  containerRef,
  scrollRoot,
  isMobileLayout,
}: ReactionChipProps) {
  const isOverflow = Boolean(overflowGroups?.length);
  const [open, setOpen] = useState(false);
  const count = displayCount ?? group.users.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${
          reacted
            ? 'border-netease-red/40 bg-netease-red/15 text-white'
            : 'border-white/10 bg-black/20 text-white/80 hover:bg-white/10'
        }`}
      >
        {isOverflow ? (
          <span className="px-0.5 text-xs leading-none">…</span>
        ) : (
          <ReactionEmoji emoji={group.emoji} className="h-3.5 w-3.5" />
        )}
        <span className="tabular-nums">{count}</span>
      </button>
      {open && (
        <ReactionDetailModal
          title={isOverflow ? '全部点评' : '点评详情'}
          groups={isOverflow ? overflowGroups! : [group]}
          myUserId={myUserId}
          onClose={() => setOpen(false)}
          onToggle={onToggle}
          containerRef={containerRef}
          scrollRoot={scrollRoot}
          isMobileLayout={isMobileLayout}
        />
      )}
    </>
  );
}

interface ChatMessageReactionsProps {
  reactions?: ChatReactionGroup[];
  myUserId: string;
  alignEnd?: boolean;
  onToggle: (emoji: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  scrollRoot?: HTMLElement | null;
}

export function ChatMessageReactions({
  reactions = [],
  myUserId,
  alignEnd = false,
  onToggle,
  containerRef,
  scrollRoot = null,
}: ChatMessageReactionsProps) {
  const isMobileLayout = useMediaQuery('(max-width: 1023px)');
  const groups = reactions.filter((group) => group.users.length > 0);
  if (groups.length === 0) return null;

  const visible = groups.slice(0, MAX_VISIBLE_GROUPS);
  const hidden = groups.slice(MAX_VISIBLE_GROUPS);

  return (
    <div className={`mt-1 flex flex-wrap items-center gap-1 ${alignEnd ? 'justify-end' : 'justify-start'}`}>
      {visible.map((group) => (
        <ReactionChip
          key={group.emoji}
          group={group}
          reacted={group.users.some((user) => user.userId === myUserId)}
          myUserId={myUserId}
          onToggle={onToggle}
          containerRef={containerRef}
          scrollRoot={scrollRoot}
          isMobileLayout={isMobileLayout}
        />
      ))}
      {hidden.length > 0 && (
        <ReactionChip
          group={{
            emoji: '…',
            users: hidden.flatMap((item) => item.users),
          }}
          reacted={groups.some((group) => group.users.some((user) => user.userId === myUserId))}
          myUserId={myUserId}
          overflowGroups={groups}
          displayCount={groups.length}
          onToggle={onToggle}
          containerRef={containerRef}
          scrollRoot={scrollRoot}
          isMobileLayout={isMobileLayout}
        />
      )}
    </div>
  );
}

interface ChatReactionPickerProps {
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  scrollRoot?: HTMLElement | null;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function ChatReactionPicker({
  open,
  disabled = false,
  onClose,
  onPick,
  scrollRoot = null,
  containerRef,
}: ChatReactionPickerProps) {
  const isMobileLayout = useMediaQuery('(max-width: 1023px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const [faces, setFaces] = useState<QFaceItem[]>(() => getInitialQQFaces());
  const [loadingFaces, setLoadingFaces] = useState(() => !hasFullQQFaces());

  useEffect(() => subscribeQQFaces((nextFaces) => {
    setFaces(nextFaces);
    setLoadingFaces(!hasFullQQFaces());
  }), []);

  useEffect(() => {
    if (!open) return;
    ensureQQFacesLoaded();
  }, [open]);

  useOverlayDismiss(open, onClose, panelRef, scrollRoot);

  if (!open || disabled) return null;
  if (!isMobileLayout && !containerRef.current) return null;

  return (
    <ChatOverlayPortal
      isMobileLayout={isMobileLayout}
      containerRef={containerRef}
      onClose={onClose}
      ariaLabel="关闭点评表情"
      panelRef={panelRef}
      desktopPanelClassName="relative z-10 flex w-[min(240px,90%)] max-h-[min(72%,320px)] flex-col rounded-2xl border border-netease-border/70 bg-netease-dark/98 p-2 shadow-2xl backdrop-blur"
      mobilePanelClassName="absolute inset-x-0 bottom-0 z-10 flex max-h-[min(55vh,360px)] flex-col rounded-t-2xl border-t border-netease-border/70 bg-netease-dark/98 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur"
    >
      <div className="mb-1.5 flex flex-shrink-0 items-center justify-between px-1">
        <span className="text-[11px] text-netease-muted">点评表情</span>
        <span className="text-[10px] text-netease-muted/60">
          {loadingFaces ? '正在加载…' : '点击选择'}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-1 overflow-y-auto pr-0.5">
        {faces.map((face) => (
          <button
            key={face.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onPick(qqFaceToken(face.id));
              onClose();
            }}
            className="flex h-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 active:bg-white/15"
            title={face.text}
          >
            <QFaceImage
              id={face.id}
              priority={QFaceLoadPriority.PANEL}
              className="h-7 w-auto max-w-8 object-contain"
              placeholderClassName="h-7 w-7"
            />
          </button>
        ))}
      </div>
    </ChatOverlayPortal>
  );
}
