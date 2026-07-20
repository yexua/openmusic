import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  acquireQFaceDisplayImage,
  getQQFaceItem,
  isQFaceImageDecoded,
  markQFaceImageRendered,
  QFaceLoadPriority,
  releaseQFaceDisplayImage,
  requestQFaceImage,
  subscribeQFaceImageState,
  type QFaceLoadPriority as QFacePriority,
} from '../lib/qface';
import Tooltip from './Tooltip';

interface Props {
  id: string;
  className?: string;
  /** 悬停显示表情名；外层已有 Tooltip 时传 false */
  tooltip?: boolean;
  /** P0：当前可见区域 */
  priority?: QFacePriority;
  /** P1：即将进入视野（rootMargin 预取） */
  nearPriority?: QFacePriority;
  /** IntersectionObserver root，如聊天滚动区 / 表情面板 */
  observeRoot?: Element | null;
  placeholderClassName?: string;
}

const NEAR_ROOT_MARGIN = '96px';

export default function QFaceImage({
  id,
  className,
  tooltip = true,
  priority = QFaceLoadPriority.PANEL,
  nearPriority = QFaceLoadPriority.NEAR,
  observeRoot = null,
  placeholderClassName,
}: Props) {
  const face = getQQFaceItem(id);
  const hostRef = useRef<HTMLSpanElement>(null);
  const [decoded, setDecoded] = useState(() => isQFaceImageDecoded(id));

  useEffect(() => {
    return subscribeQFaceImageState(id, (state) => {
      setDecoded(state === 'decoded' || state === 'rendered');
    });
  }, [id]);

  useEffect(() => {
    if (isQFaceImageDecoded(id)) return;

    const anchor = hostRef.current;
    if (!anchor) return;

    const schedule = (loadPriority: QFacePriority) => {
      void requestQFaceImage(id, loadPriority);
    };

    const visibleObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) schedule(priority);
      },
      { root: observeRoot, threshold: 0.01 },
    );

    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) schedule(nearPriority);
      },
      { root: observeRoot, rootMargin: NEAR_ROOT_MARGIN, threshold: 0.01 },
    );

    visibleObserver.observe(anchor);
    nearObserver.observe(anchor);
    return () => {
      visibleObserver.disconnect();
      nearObserver.disconnect();
    };
  }, [id, nearPriority, observeRoot, priority]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !decoded) return;

    const img = acquireQFaceDisplayImage(id, {
      className,
      alt: face.text,
    });
    if (!img) return;

    host.replaceChildren(img);
    markQFaceImageRendered(id);

    return () => {
      releaseQFaceDisplayImage(id, img);
      host.replaceChildren();
    };
  }, [className, decoded, face.text, id]);

  const faceContent = (
    <span ref={hostRef} className="inline-flex align-middle">
      {!decoded && (
        <span
          className={placeholderClassName || className}
          aria-hidden="true"
        />
      )}
    </span>
  );

  if (!tooltip) return faceContent;

  return (
    <Tooltip content={face.text} side="bottom">
      {faceContent}
    </Tooltip>
  );
}
