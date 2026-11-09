/**
 * 本地导入音频的持久化存储
 *
 * `URL.createObjectURL` 生成的地址只在当前页面会话内有效，刷新后失效。
 * 因此把原始文件与曲目元数据写入 IndexedDB，恢复时用新生成的 blob URL 重建曲目。
 * 无 IndexedDB 的环境（SSR / 旧浏览器）返回空结果，不抛异常。
 */

const DB_NAME = 'yyc3-music-audio';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

export interface StoredAudio {
  id: string;
  blob: Blob;
  /** Track 的可序列化元数据，不含 blob URL */
  meta: Record<string, unknown>;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return getDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        const tx = db.transaction(STORE_NAME, mode);
        const req = run(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => resolve(null);
      })
  );
}

/** 保存导入的音频文件与曲目元数据；同 id 覆盖 */
export async function saveLocalAudio(
  id: string,
  blob: Blob,
  meta: Record<string, unknown>
): Promise<boolean> {
  const result = await request<IDBValidKey>('readwrite', (store) =>
    store.put({ id, blob, meta, updatedAt: Date.now() } satisfies StoredAudio)
  );
  if (result === null) {
    console.warn('[localAudio] 保存失败：浏览器不支持 IndexedDB 或存储配额不足，该曲目将无法跨刷新恢复');
  }
  return result !== null;
}

/** 读取已保存的音频；不存在或环境不支持时返回 null */
export async function getLocalAudio(id: string): Promise<StoredAudio | null> {
  const result = await request<StoredAudio>('readonly', (store) => store.get(id));
  return result && result.blob ? result : null;
}

/** 删除已保存的音频 */
export async function deleteLocalAudio(id: string): Promise<boolean> {
  const result = await request<undefined>('readwrite', (store) => store.delete(id));
  return result !== null;
}

/** 列出全部已保存音频的 id */
export async function listLocalAudioIds(): Promise<string[]> {
  const result = await request<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
  return (result ?? []).map(String);
}

/**
 * 清理不再被引用的音频文件，返回删除数量。
 * 队列与歌单都只保存 trackId，因此回收时必须传入两者的并集。
 */
export async function pruneLocalAudio(keepIds: Iterable<string>): Promise<number> {
  const keep = new Set(keepIds);
  const ids = await listLocalAudioIds();
  const orphans = ids.filter((id) => !keep.has(id));
  let removed = 0;
  for (const id of orphans) {
    if (await deleteLocalAudio(id)) removed += 1;
  }
  return removed;
}

/** 查询当前源的存储占用与配额；浏览器不支持时返回 null */
export async function getAudioStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
