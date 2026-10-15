import { metaOf } from '../model/factory';
import { parseMapDoc } from '../model/schema';
import type { MapDoc, MapMeta } from '../model/types';
import { getDB, StorageError, toStorageError } from './db';

/** Repositório de mapas no IndexedDB. Cada gravação só é considerada concluída após `tx.done`. */

export async function listMaps(): Promise<MapMeta[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('meta');
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function loadMap(id: string): Promise<MapDoc | null> {
  try {
    const db = await getDB();
    const raw = await db.get('maps', id);
    if (!raw) return null;
    const parsed = parseMapDoc(raw);
    if (!parsed.ok) throw new StorageError('invalid', `O mapa salvo está corrompido: ${parsed.errors.join('; ')}`);
    return parsed.doc;
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function saveMap(doc: MapDoc): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['maps', 'meta'], 'readwrite');
    await Promise.all([tx.objectStore('maps').put(doc), tx.objectStore('meta').put(metaOf(doc)), tx.done]);
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function deleteMap(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['maps', 'meta'], 'readwrite');
    await Promise.all([tx.objectStore('maps').delete(id), tx.objectStore('meta').delete(id), tx.done]);
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function loadAllMaps(): Promise<MapDoc[]> {
  try {
    const db = await getDB();
    const raws = await db.getAll('maps');
    const out: MapDoc[] = [];
    for (const r of raws) {
      const p = parseMapDoc(r);
      if (p.ok) out.push(p.doc);
    }
    return out;
  } catch (e) {
    throw toStorageError(e);
  }
}

export async function mapExists(id: string): Promise<boolean> {
  const db = await getDB();
  return (await db.getKey('maps', id)) !== undefined;
}

