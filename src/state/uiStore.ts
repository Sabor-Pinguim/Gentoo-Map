import { create } from 'zustand';

/** Estado de interface (não faz parte do documento nem do histórico). */

export type Theme = 'light' | 'dark' | 'system';
export type Tool = 'select' | 'hand' | 'pen' | 'highlighter' | 'eraser';
export type PanelTab = 'overview' | 'notes' | 'links' | 'images' | 'media' | 'files' | 'refs';
export type DialogName = 'maps' | 'storage' | 'shortcuts' | 'export' | null;

interface Prefs {
  theme: Theme;
  panelWidth: number;
  showMinimap: boolean;
  autoOpenPanel: boolean;
}

const PREFS_KEY = 'mc:prefs';

function loadPrefs(): Prefs {
  const def: Prefs = { theme: 'system', panelWidth: 480, showMinimap: true, autoOpenPanel: true };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return def;
    const p = JSON.parse(raw);
    const parsedWidth = Number(p.panelWidth);
    const panelWidth = Math.min(880, Math.max(440, parsedWidth >= 440 ? parsedWidth : def.panelWidth));
    return {
      theme: ['light', 'dark', 'system'].includes(p.theme) ? p.theme : def.theme,
      panelWidth,
      showMinimap: typeof p.showMinimap === 'boolean' ? p.showMinimap : def.showMinimap,
      autoOpenPanel: typeof p.autoOpenPanel === 'boolean' ? p.autoOpenPanel : def.autoOpenPanel,
    };
  } catch {
    return def;
  }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* preferências são opcionais */
  }
}

export interface UIState extends Prefs {
  panelOpen: boolean;
  panelTab: PanelTab;
  tool: Tool;
  spacePan: boolean;
  /** Modo "conectar": aguardando clique na origem (null) ou no destino (id). */
  connectMode: { sourceId: string | null } | null;
  searchOpen: boolean;
  searchQuery: string;
  dialog: DialogName;
  busy: string | null;

  // Estado de desenho
  activeLayerId: string | null;
  drawingColor: string;
  penWidth: number;
  highlighterWidth: number;
  layersMenuOpen: boolean;

  set: (patch: Partial<UIState>) => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  openDialog: (d: DialogName) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  ...loadPrefs(),
  panelOpen: false,
  panelTab: 'overview',
  tool: 'select',
  spacePan: false,
  connectMode: null,
  searchOpen: false,
  searchQuery: '',
  dialog: null,
  busy: null,

  activeLayerId: null,
  drawingColor: '#ea580c',
  penWidth: 3,
  highlighterWidth: 22,
  layersMenuOpen: false,

  set: (patch) => set(patch),
  setPref: (key, value) => {
    set({ [key]: value } as Partial<UIState>);
    const s = get();
    savePrefs({ theme: s.theme, panelWidth: s.panelWidth, showMinimap: s.showMinimap, autoOpenPanel: s.autoOpenPanel });
  },
  openDialog: (dialog) => set({ dialog }),
}));

export const ui = () => useUI.getState();

/* Viewport por mapa (localStorage; não marca o mapa como alterado). */
export function loadViewport(mapId: string): { x: number; y: number; zoom: number } | null {
  try {
    const raw = localStorage.getItem(`mc:vp:${mapId}`);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if ([v.x, v.y, v.zoom].every((n) => typeof n === 'number' && Number.isFinite(n))) return v;
  } catch {
    /* ignora */
  }
  return null;
}

export function saveViewport(mapId: string, vp: { x: number; y: number; zoom: number }) {
  try {
    localStorage.setItem(`mc:vp:${mapId}`, JSON.stringify(vp));
  } catch {
    /* ignora */
  }
}

export function getLastMapId(): string | null {
  try {
    return localStorage.getItem('mc:lastMap');
  } catch {
    return null;
  }
}

export function setLastMapId(id: string | null) {
  try {
    if (id) localStorage.setItem('mc:lastMap', id);
    else localStorage.removeItem('mc:lastMap');
  } catch {
    /* ignora */
  }
}

