import type { StoredFile } from '../model/types';
import { formatBytes, readBlobAsArrayBuffer } from '../utils/files';
import { getDB, StorageError, toStorageError } from './db';

/**
 * Repositório de arquivos binários (IndexedDB).
 * O id de cada arquivo é o hash SHA-256 do conteúdo, o que elimina duplicatas:
 * o mesmo arquivo anexado a vários conceitos é armazenado uma única vez.
 */

async function hashBlob(blob: Blob): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buf = await readBlobAsArrayBuffer(blob);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return (
      'sha256-' +
      Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }
  // Contexto não seguro: sem deduplicação, id aleatório.
  return 'rnd-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export async function isStoragePersisted(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Verifica previamente se há espaço disponível (com margem de segurança). */
export async function ensureSpaceFor(bytes: number): Promise<void> {
  const est = await estimateStorage();
  if (!est || !est.quota) return;
  const free = est.quota - est.usage;
  if (bytes * 1.1 > free) {
    throw new StorageError(
      'quota',
      `Espaço insuficiente: o arquivo tem ${formatBytes(bytes)} e restam cerca de ${formatBytes(Math.max(0, free))} disponíveis para esta aplicação.`,
    );
  }
}

export async function putFile(blob: Blob, name: string, mime?: string): Promise<StoredFile> {
  const id = await hashBlob(blob);
  try {
    const db = await getDB();
    const existing = await db.get('files', id);
    if (existing) return existing;
    await ensureSpaceFor(blob.size);
    const record: StoredFile = {
      id,
      blob,
      name,
      mime: mime || blob.type || 'application/octet-stream',
      size: blob.size,
      createdAt: Date.now(),
    };
    const tx = db.transaction('files', 'readwrite');
    await Promise.all([tx.store.put(record), tx.done]);
    return record;
  } catch (e) {
    throw toStorageError(e);
  }
}

/** Grava um arquivo com id conhecido (usado na importação de backups). */
export async function putFileWithId(id: string, blob: Blob, name: string, mime: string): Promise<void> {
  try {
    const db = await getDB();
    if (await db.getKey('files', id)) return;
    const tx = db.transaction('files', 'readwrite');
    await Promise.all([
      tx.store.put({ id, blob, name, mime, size: blob.size, createdAt: Date.now() }),
      tx.done,
    ]);
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  try {
    const db = await getDB();
    return await db.get('files', id);
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function hasFile(id: string): Promise<boolean> {
  const db = await getDB();
  return (await db.getKey('files', id)) !== undefined;
}

export async function listFileInfo(): Promise<{ id: string; name: string; size: number; mime: string }[]> {
  const db = await getDB();
  const out: { id: string; name: string; size: number; mime: string }[] = [];
  let cursor = await db.transaction('files').store.openCursor();
  while (cursor) {
    const v = cursor.value;
    out.push({ id: v.id, name: v.name, size: v.size, mime: v.mime });
    cursor = await cursor.continue();
  }
  return out;
}

export async function deleteFiles(ids: Iterable<string>): Promise<number> {
  const list = [...ids];
  if (!list.length) return 0;
  try {
    const db = await getDB();
    const tx = db.transaction('files', 'readwrite');
    await Promise.all([...list.map((id) => tx.store.delete(id)), tx.done]);
    return list.length;
  } catch (e) {
    throw toStorageError(e);
  }
}

/* ------------------------------------------------------------------ */
/* Cache de object URLs com contagem de referências                    */
/* ------------------------------------------------------------------ */

interface UrlEntry {
  url: string | null;
  refs: number;
  promise: Promise<string | null>;
  mime: string;
}
const urlCache = new Map<string, UrlEntry>();

/** Obtém (e mantém) uma object URL para um arquivo armazenado. Retorna null se o arquivo não existir. */
export function acquireFileUrl(fileId: string): Promise<string | null> {
  let entry = urlCache.get(fileId);
  if (!entry) {
    const e: UrlEntry = { url: null, refs: 0, mime: '', promise: Promise.resolve(null) };
    e.promise = getFile(fileId)
      .then((f) => {
        if (!f) return null;
        e.mime = f.mime;
        e.url = URL.createObjectURL(f.blob);
        return e.url;
      })
      .catch(() => null);
    urlCache.set(fileId, e);
    entry = e;
  }
  entry.refs++;
  return entry.promise;
}

export function releaseFileUrl(fileId: string) {
  const entry = urlCache.get(fileId);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    // Pequeno atraso evita recriar a URL em remontagens imediatas.
    setTimeout(() => {
      const cur = urlCache.get(fileId);
      if (cur && cur.refs <= 0) {
        if (cur.url) URL.revokeObjectURL(cur.url);
        urlCache.delete(fileId);
      }
    }, 5000);
  }
}

