import { produce, enableMapSet } from 'immer';
import { create } from 'zustand';
import type { MapDoc } from '../model/types';

enableMapSet();

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
export type HistoryMode = 'push' | 'coalesce' | 'none';

interface HistoryEntry {
  doc: MapDoc;
  label: string;
}

export interface Size {
  width: number;
  height: number;
}

const HISTORY_LIMIT = 150;
const COALESCE_MS = 1500;

export interface EditorState {
  doc: MapDoc | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  coalesce: { key: string; at: number } | null;

  /** Seleção, em ordem de seleção (importante para "conectar selecionados"). */
  selectedNodes: string[];
  selectedEdges: string[];
  editing: { type: 'node' | 'edge'; id: string } | null;
  /** Dimensões medidas pelo canvas (não persistidas, fora do histórico). */
  measured: Record<string, Size>;

  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: number | null;

  loadDoc: (doc: MapDoc) => void;
  closeDoc: () => void;
  apply: <T>(label: string, recipe: (draft: MapDoc) => T, opts?: { mode?: HistoryMode; key?: string }) => T | undefined;
  checkpoint: (label: string) => void;
  dropCheckpointIfUnchanged: () => void;
  undo: () => string | null;
  redo: () => string | null;
  setSelection: (nodes: string[], edges: string[]) => void;
  setEditing: (e: EditorState['editing']) => void;
  setMeasured: (updates: Record<string, Size>) => void;
  setSaveState: (s: Partial<Pick<EditorState, 'saveStatus' | 'saveError' | 'lastSavedAt'>>) => void;
}

function pruneSelection(doc: MapDoc, nodes: string[], edges: string[]) {
  return {
    selectedNodes: nodes.filter((id) => doc.concepts[id]),
    selectedEdges: edges.filter((id) => doc.links[id]),
  };
}

export const useEditor = create<EditorState>()((set, get) => ({
  doc: null,
  past: [],
  future: [],
  coalesce: null,
  selectedNodes: [],
  selectedEdges: [],
  editing: null,
  measured: {},
  saveStatus: 'idle',
  saveError: null,
  lastSavedAt: null,

  loadDoc: (doc) =>
    set({
      doc,
      past: [],
      future: [],
      coalesce: null,
      selectedNodes: [],
      selectedEdges: [],
      editing: null,
      saveStatus: 'saved',
      saveError: null,
      lastSavedAt: doc.updatedAt,
    }),

  closeDoc: () =>
    set({ doc: null, past: [], future: [], selectedNodes: [], selectedEdges: [], editing: null, saveStatus: 'idle' }),

  apply: (label, recipe, opts = {}) => {
    const { doc, past, coalesce } = get();
    if (!doc) return undefined;
    const mode = opts.mode ?? 'push';
    let result: unknown;
    const next = produce(doc, (draft) => {
      result = recipe(draft as MapDoc);
    });
    if (next === doc) return result as never;
    const now = Date.now();
    let pushed = false;
    let nextCoalesce = coalesce;
    if (mode === 'push') {
      pushed = true;
      nextCoalesce = null;
    } else if (mode === 'coalesce') {
      const key = opts.key ?? label;
      pushed = !(coalesce && coalesce.key === key && now - coalesce.at < COALESCE_MS);
      nextCoalesce = { key, at: now };
    }
    const nextPast = pushed ? [...past, { doc, label }].slice(-HISTORY_LIMIT) : past;
    set({
      doc: next,
      past: nextPast,
      future: mode === 'none' ? get().future : [],
      coalesce: nextCoalesce,
      ...pruneSelection(next, get().selectedNodes, get().selectedEdges),
    });
    return result as never;
  },

  checkpoint: (label) => {
    const { doc, past } = get();
    if (!doc) return;
    set({ past: [...past, { doc, label }].slice(-HISTORY_LIMIT), future: [], coalesce: null });
  },

  dropCheckpointIfUnchanged: () => {
    const { doc, past } = get();
    if (past.length && past[past.length - 1].doc === doc) set({ past: past.slice(0, -1) });
  },

  undo: () => {
    const { doc, past, future } = get();
    if (!doc || !past.length) return null;
    const entry = past[past.length - 1];
    set({
      doc: entry.doc,
      past: past.slice(0, -1),
      future: [...future, { doc, label: entry.label }],
      coalesce: null,
      editing: null,
      ...pruneSelection(entry.doc, get().selectedNodes, get().selectedEdges),
    });
    return entry.label;
  },

  redo: () => {
    const { doc, past, future } = get();
    if (!doc || !future.length) return null;
    const entry = future[future.length - 1];
    set({
      doc: entry.doc,
      future: future.slice(0, -1),
      past: [...past, { doc, label: entry.label }],
      coalesce: null,
      editing: null,
      ...pruneSelection(entry.doc, get().selectedNodes, get().selectedEdges),
    });
    return entry.label;
  },

  setSelection: (nodes, edges) => {
    const s = get();
    if (sameArr(s.selectedNodes, nodes) && sameArr(s.selectedEdges, edges)) return;
    set({ selectedNodes: nodes, selectedEdges: edges });
  },

  setEditing: (editing) => set({ editing }),

  setMeasured: (updates) => {
    const cur = get().measured;
    let changed = false;
    for (const [id, s] of Object.entries(updates)) {
      const c = cur[id];
      if (!c || c.width !== s.width || c.height !== s.height) {
        changed = true;
        break;
      }
    }
    if (changed) set({ measured: { ...cur, ...updates } });
  },

  setSaveState: (s) => set(s),
}));

function sameArr(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (let i = 0; i < b.length; i++) {
    if (!setA.has(b[i])) return false;
  }
  return true;
}

/** Acesso imperativo fora de componentes React. */
export const editor = () => useEditor.getState();

