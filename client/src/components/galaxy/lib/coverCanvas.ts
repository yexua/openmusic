import { normalizeCoverResolution } from '../../../lib/roomVisualPreset';

/** Mineradio coverTextureSizeForResolution */
export function coverTextureSizeForResolution(value: number): number {
  const v = normalizeCoverResolution(value);
  if (v >= 1.32) return 512;
  if (v >= 1.1) return 384;
  return 256;
}

/** Mineradio makeSquareCoverCanvas — 居中裁切为正方形 */
export function makeSquareCoverCanvas(
  img: CanvasImageSource,
  size = 512,
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const cx = cv.getContext('2d');
  if (!cx) return cv;

  if (img instanceof HTMLImageElement) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.min(iw, ih);
    cx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, size, size);
  } else if (img instanceof HTMLCanvasElement) {
    const iw = img.width;
    const ih = img.height;
    const s = Math.min(iw, ih);
    cx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, size, size);
  } else {
    cx.drawImage(img, 0, 0, size, size);
  }
  return cv;
}

export function visualEase(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** 切歌时把当前封面写入 prevCoverTex（对齐 Mineradio applyCoverCanvas） */
export function snapshotCoverToPrevTexture(
  currentImage: CanvasImageSource | null | undefined,
  prevTex: { image: unknown; needsUpdate: boolean },
): void {
  if (!currentImage) return;
  const prevW =
    currentImage instanceof HTMLImageElement
      ? currentImage.naturalWidth || currentImage.width
      : currentImage instanceof HTMLCanvasElement
        ? currentImage.width
        : 256;
  const prevH =
    currentImage instanceof HTMLImageElement
      ? currentImage.naturalHeight || currentImage.height
      : currentImage instanceof HTMLCanvasElement
        ? currentImage.height
        : 256;
  const prevScale = Math.min(1, 256 / Math.max(prevW, prevH, 1));
  const prevCv = document.createElement('canvas');
  prevCv.width = Math.max(1, Math.round(prevW * prevScale));
  prevCv.height = Math.max(1, Math.round(prevH * prevScale));
  const pctx = prevCv.getContext('2d');
  if (!pctx) return;
  try {
    pctx.drawImage(currentImage, 0, 0, prevCv.width, prevCv.height);
    prevTex.image = prevCv;
    prevTex.needsUpdate = true;
  } catch {
    // ignore tainted canvas
  }
}
