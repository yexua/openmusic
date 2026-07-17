const APIHZ_BASE_URL = (process.env.APIHZ_BASE_URL || 'https://cn.apihz.cn/api').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 10000;

export function getApihzId() {
  return (process.env.APIHZ_ID || process.env.APIHZ_IMG_ID || process.env.APIHZ_MGC_ID || '').trim();
}

export function getApihzKey() {
  return (process.env.APIHZ_KEY || process.env.APIHZ_IMG_KEY || process.env.APIHZ_MGC_KEY || '').trim();
}

export function isApihzConfigured() {
  return Boolean(getApihzId() && getApihzKey());
}

export function buildApihzUrl(endpoint) {
  const path = String(endpoint || '').replace(/^\//, '');
  return `${APIHZ_BASE_URL}/${path}`;
}

export async function fetchApihz(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
