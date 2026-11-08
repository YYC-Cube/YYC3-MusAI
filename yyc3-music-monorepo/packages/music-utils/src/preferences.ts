/**
 * §13.x — User Preferences Persistence
 *
 * Pure utility module (NOT a hook) — no React dependency.
 * Stores preferences in localStorage for instant local restoration,
 * with optional KV sync for logged-in users (cross-device).
 *
 * Design: Read is synchronous (localStorage), write is sync + async KV.
 * This avoids adding any hooks to App.tsx.
 */

const STORAGE_KEY = 'dmusic-prefs';

export interface UserPreferences {
  lang: 'zh' | 'en';
  volume: number;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  mode: 'audio' | 'video';
  theme: 'deep-space' | 'aurora' | 'ocean' | 'light' | 'midnight' | 'custom'; // §1.4
}

const DEFAULTS: UserPreferences = {
  lang: 'zh',
  volume: 0.7,
  shuffleEnabled: false,
  repeatMode: 'all',
  mode: 'audio',
  theme: 'deep-space', // §16.x
};

/**
 * Load preferences from localStorage (synchronous).
 * Returns merged defaults + stored values.
 */
export function loadPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Load a single preference value.
 */
export function loadPref<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
  return loadPrefs()[key];
}

/**
 * Save a single preference. Writes to localStorage immediately.
 * If `kvSync` is provided (apiFetch + userId), also persists to backend KV.
 */
export function savePref<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K],
  kvSync?: { apiFetch: Function; userId: string }
): void {
  try {
    const current = loadPrefs();
    current[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }

  // Debounced KV sync (fire-and-forget)
  if (kvSync) {
    _debouncedKVSync(kvSync.apiFetch, kvSync.userId);
  }
}

/**
 * Save multiple preferences at once.
 */
export function savePrefs(
  partial: Partial<UserPreferences>,
  kvSync?: { apiFetch: Function; userId: string }
): void {
  try {
    const current = loadPrefs();
    Object.assign(current, partial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
  if (kvSync) {
    _debouncedKVSync(kvSync.apiFetch, kvSync.userId);
  }
}

// ---- Debounced KV sync (2s debounce) ----
let _kvTimer: ReturnType<typeof setTimeout> | null = null;

function _debouncedKVSync(apiFetch: Function, userId: string): void {
  if (_kvTimer) clearTimeout(_kvTimer);
  _kvTimer = setTimeout(() => {
    const prefs = loadPrefs();
    apiFetch(`/preferences/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    }).catch((err: any) => {
      console.warn('[Prefs] KV sync failed:', err);
    });
  }, 2000);
}

/**
 * Pull preferences from KV (for logged-in user session start).
 * Merges remote prefs on top of local, then writes to localStorage.
 */
export async function pullPrefsFromKV(
  apiFetch: Function,
  userId: string
): Promise<UserPreferences> {
  try {
    const data = await apiFetch(`/preferences/${userId}`);
    if (data?.preferences) {
      const merged = { ...loadPrefs(), ...data.preferences };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('[Prefs] KV pull failed:', err);
  }
  return loadPrefs();
}