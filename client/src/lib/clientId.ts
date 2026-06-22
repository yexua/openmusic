const CLIENT_ID_KEY = 'openmusic_client_id';

function createClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

let cachedClientId: string | null = null;
let legacyClientIdCleared = false;

/** 获取或创建本浏览器标签页内的稳定用户 ID（与 socket join 一致） */
export function getClientId(): string {
  if (cachedClientId) return cachedClientId;

  try {
    if (!legacyClientIdCleared) {
      legacyClientIdCleared = true;
      localStorage.removeItem(CLIENT_ID_KEY);
    }

    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) {
      cachedClientId = existing;
      return cachedClientId;
    }

    cachedClientId = createClientId();
    sessionStorage.setItem(CLIENT_ID_KEY, cachedClientId);
    return cachedClientId;
  } catch {
    cachedClientId = createClientId();
    return cachedClientId;
  }
}

export function rememberClientId(clientId: string): void {
  cachedClientId = clientId;
  try {
    sessionStorage.setItem(CLIENT_ID_KEY, clientId);
  } catch {
    // sessionStorage may be unavailable.
  }
}
