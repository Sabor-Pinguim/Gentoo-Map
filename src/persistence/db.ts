import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { MapDoc, MapMeta, StoredFile } from '../model/types';

export const DB_NAME = 'mapas-conceituais';
export const DB_VERSION = 1;

interface AppDB extends DBSchema {
  maps: { key: string; value: MapDoc };
  meta: { key: string; value: MapMeta; indexes: { updatedAt: number } };
  files: { key: string; value: StoredFile };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new StorageError('unavailable', 'Este navegador não oferece IndexedDB; não é possível salvar localmente.'));
    }
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('maps')) db.createObjectStore('maps', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) {
          const s = db.createObjectStore('meta', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      },
      blocked() {
        console.warn('Banco de dados bloqueado por outra aba com versão antiga.');
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((e) => {
      dbPromise = null;
      throw toStorageError(e);
    });
  }
  return dbPromise;
}

/** Para testes: fecha e descarta a conexão atual. */
export async function resetDBConnection() {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      /* ignora */
    }
  }
  dbPromise = null;
}

export type StorageErrorKind = 'quota' | 'unavailable' | 'too-large' | 'invalid' | 'unknown';

export class StorageError extends Error {
  kind: StorageErrorKind;
  constructor(kind: StorageErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'StorageError';
  }
}

export function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { name?: string; code?: number; message?: string; inner?: unknown };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    /quota/i.test(err.message ?? '')
  );
}

export function toStorageError(e: unknown): StorageError {
  if (e instanceof StorageError) return e;
  if (isQuotaError(e)) {
    return new StorageError(
      'quota',
      'O espaço de armazenamento do navegador está cheio. Libere espaço removendo arquivos grandes ou mapas antigos, ou exporte um backup.',
    );
  }
  const err = e as { name?: string; message?: string } | undefined;
  if (err?.name === 'InvalidStateError' || err?.name === 'SecurityError') {
    return new StorageError(
      'unavailable',
      'O armazenamento local está indisponível (por exemplo, em navegação privada ou com cookies bloqueados).',
    );
  }
  return new StorageError('unknown', `Falha ao acessar o armazenamento local: ${err?.message ?? String(e)}`);
}

