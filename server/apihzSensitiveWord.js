import {
  buildApihzUrl,
  fetchApihz,
  getApihzId,
  getApihzKey,
  isApihzConfigured,
} from './apihz.js';

const MGC_ENDPOINT = 'zici/mgc.php';
const CHECK_TIMEOUT_MS = 8000;
const MAX_WORDS_LEN = 10000;

export function isApihzSensitiveWordConfigured() {
  return isApihzConfigured();
}

/**
 * 检测文本是否包含敏感词。
 * 未配置 APIHZ 凭证时跳过检测（放行）。
 */
export async function checkApihzSensitiveWords(text) {
  if (!isApihzSensitiveWordConfigured()) {
    return { ok: true };
  }

  const words = String(text || '').trim();
  if (!words) return { ok: true };
  if (words.length > MAX_WORDS_LEN) {
    return { ok: false, error: '消息过长' };
  }

  const params = new URLSearchParams({
    id: getApihzId(),
    key: getApihzKey(),
    words,
    replacetype: '0',
    mgctype: '1',
  });

  try {
    const res = await fetchApihz(`${buildApihzUrl(MGC_ENDPOINT)}?${params.toString()}`, {}, CHECK_TIMEOUT_MS);
    if (!res.ok) {
      return { ok: false, error: '消息安全检测暂时不可用，请稍后重试' };
    }

    const data = await res.json();
    if (Number(data?.code) !== 200) {
      return { ok: false, error: data?.msg || data?.message || '消息安全检测失败，请稍后重试' };
    }

    if (Number(data?.jcstatus) === 1) {
      return { ok: false, error: '消息包含敏感词，请修改后发送' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: '消息安全检测暂时不可用，请稍后重试' };
  }
}
