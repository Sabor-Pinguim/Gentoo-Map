import { create } from 'zustand';
import { createConcept, createMap, newId } from '../model/factory';
import type { MapDoc, MapMeta } from '../model/types';
import { toStorageError } from '../persistence/db';
import { collectGarbage } from '../persistence/gc';
import * as repo from '../persistence/mapRepo';
import { editor, useEditor } from './editorStore';
import { setLastMapId, useUI } from './uiStore';
import { toast } from 'sonner';

/** Gerenciamento de mapas (lista, abrir, criar, renomear, duplicar, excluir) e salvamento automático. */

interface MapsState {
  maps: MapMeta[];
  loaded: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
}

export const useMaps = create<MapsState>()((set) => ({
  maps: [],
  loaded: false,
  loadError: null,
  refresh: async () => {
    try {
      const maps = await repo.listMaps();
      set({ maps, loaded: true, loadError: null });
    } catch (e) {
      set({ loaded: true, loadError: toStorageError(e).message });
    }
  },
}));

/* ------------------------------------------------------------------ */
/* Salvamento automático                                               */
/* ------------------------------------------------------------------ */

const SAVE_DELAY = 500;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersisted: MapDoc | null = null;
let inflight: Promise<void> | null = null;
let started = false;

async function persistNow(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (inflight) await inflight;
  const { doc } = editor();
  if (!doc || doc === lastPersisted) return;
  editor().setSaveState({ saveStatus: 'saving' });
  const snapshot = doc;
  inflight = repo
    .saveMap(snapshot)
    .then(() => {
      lastPersisted = snapshot;
      const cur = editor().doc;
      // Só marca "salvo" se nada mudou enquanto gravava.
      if (cur === snapshot) editor().setSaveState({ saveStatus: 'saved', saveError: null, lastSavedAt: Date.now() });
      else {
        editor().setSaveState({ saveStatus: 'pending', saveError: null });
        schedule();
      }
      void useMaps.getState().refresh();
    })
    .catch((e) => {
      const err = toStorageError(e);
      editor().setSaveState({ saveStatus: 'error', saveError: err.message });
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        if (editor().saveStatus === 'error') void persistNow();
      }, 8000);
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function schedule() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persistNow(), SAVE_DELAY);
}

export function startAutosave() {
  if (started) return;
  started = true;
  useEditor.subscribe((s, prev) => {
    if (!s.doc || s.doc === prev.doc) return;
    if (prev.doc && s.doc.id !== prev.doc.id) return; // troca de mapa
    if (s.doc === lastPersisted) return;
    if (s.saveStatus !== 'error') editor().setSaveState({ saveStatus: 'pending' });
    schedule();
  });
  window.addEventListener('beforeunload', (e) => {
    const st = editor().saveStatus;
    if (st === 'pending' || st === 'saving' || st === 'error') {
      void persistNow();
      e.preventDefault();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persistNow();
  });
}

export const flushSave = persistNow;
export const retrySave = () => persistNow();

/* ------------------------------------------------------------------ */
/* Operações sobre mapas                                               */
/* ------------------------------------------------------------------ */

export async function openMap(id: string): Promise<boolean> {
  try {
    await flushSave();
    const doc = await repo.loadMap(id);
    if (!doc) {
      toast.error('Mapa não encontrado no armazenamento local.');
      return false;
    }
    useUI.getState().set({ connectMode: null });
    lastPersisted = doc;
    useEditor.getState().loadDoc(doc);
    setLastMapId(doc.id);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao carregar mapa.';
    toast.error(msg);
    return false;
  }
}

export async function openDoc(doc: MapDoc) {
  try {
    await flushSave();
    useUI.getState().set({ connectMode: null });
    lastPersisted = doc;
    useEditor.getState().loadDoc(doc);
    setLastMapId(doc.id);
  } catch (e) {
    console.error('Falha ao abrir documento:', e);
  }
}

export async function createNewMap(name = 'Novo mapa'): Promise<MapDoc> {
  const cleanName = name.trim() || 'Novo mapa';
  const doc = createMap(cleanName);
  // Cria automaticamente um conceito central com o título informado para não deixar o mapa vazio
  const rootConcept = createConcept(
    { x: 360, y: 180 },
    {
      title: cleanName,
      style: { shape: 'rounded', color: 'blue', fontSize: 'lg', bold: true },
    }
  );
  doc.concepts[rootConcept.id] = rootConcept;
  await repo.saveMap(doc);
  await useMaps.getState().refresh();
  await openDoc(doc);
  return doc;
}

export async function renameMap(id: string, name: string) {
  const clean = name.trim() || 'Mapa sem nome';
  const cur = editor().doc;
  if (cur?.id === id) {
    editor().apply('Renomear mapa', (d) => {
      d.name = clean;
      d.updatedAt = Date.now();
    });
    await flushSave();
  } else {
    const doc = await repo.loadMap(id);
    if (!doc) return;
    await repo.saveMap({ ...doc, name: clean, updatedAt: Date.now() });
  }
  await useMaps.getState().refresh();
}

export async function duplicateMap(id: string): Promise<MapDoc | null> {
  if (editor().doc?.id === id) await flushSave();
  const doc = await repo.loadMap(id);
  if (!doc) return null;
  const now = Date.now();
  const copy: MapDoc = { ...structuredClone(doc), id: newId('map'), name: `${doc.name} (cópia)`, createdAt: now, updatedAt: now };
  await repo.saveMap(copy);
  await useMaps.getState().refresh();
  return copy;
}

export async function deleteMapById(id: string) {
  const isCurrent = editor().doc?.id === id;
  if (isCurrent) {
    if (saveTimer) clearTimeout(saveTimer);
    if (inflight) await inflight;
    lastPersisted = null;
    editor().closeDoc();
    setLastMapId(null);
  }
  await repo.deleteMap(id);
  await useMaps.getState().refresh();
  await runGarbageCollection();
  if (isCurrent) {
    const next = useMaps.getState().maps[0];
    if (next) await openMap(next.id);
  }
}

/** Coleta de lixo de arquivos que considera o mapa aberto e seu histórico de desfazer. */
export async function runGarbageCollection() {
  const s = editor();
  const docs: MapDoc[] = [];
  if (s.doc) docs.push(s.doc);
  for (const e of s.past) docs.push(e.doc);
  for (const e of s.future) docs.push(e.doc);
  try {
    return await collectGarbage(docs);
  } catch {
    return { removed: 0, freed: 0 };
  }
}

