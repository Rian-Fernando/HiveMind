/**
 * Anonymous per-browser identity for votes and reactions — a random key
 * in localStorage, never tied to a name. (Browser-only; call in effects.)
 */
export function getDeviceKey(): string {
  const KEY = "hm-device";
  let key = localStorage.getItem(KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(KEY, key);
  }
  return key;
}

export interface HistoryEntry {
  code: string;
  eventName: string;
  ts: number;
}

const HISTORY_KEY = "hm-history";
const HISTORY_MAX = 8;

/** Remember a visited room so the landing page can list it. */
export function recordRoomVisit(code: string, eventName: string) {
  try {
    const list = readRoomHistory().filter((e) => e.code !== code);
    list.unshift({ code, eventName, ts: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    // storage full/blocked — history is a nicety, never an error
  }
}

export function readRoomHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
