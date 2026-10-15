import { toast } from 'sonner';
import { getFlow, prefersReducedMotion, viewportCenter } from '../canvas/flowApi';
import { createConcept } from '../model/factory';
import { descendantsOf, getHierarchy, getVisibility } from '../model/hierarchy';
import * as ops from '../model/ops';
import type { Concept, ConceptStyle, LinkKind, LinkStyle, MapDoc, Point } from '../model/types';
import { branchSet, computeHierarchicalLayout, DEFAULT_NODE_SIZE, type Size } from '../layout/hierarchicalLayout';
import { editor } from './editorStore';
import { ui } from './uiStore';

/**
 * Comandos de alto nível do editor. São usados pela barra de ferramentas, menus de
 * contexto, atalhos e canvas — garantindo que todos executem exatamente a mesma ação.
 */

export function sizeOf(id: string): Size {
  const s = editor();
  const m = s.measured[id];
  if (m) return m;
  const c = s.doc?.concepts[id];
  return { width: c?.width ?? DEFAULT_NODE_SIZE.width, height: c?.height ?? DEFAULT_NODE_SIZE.height };
}

const doc = () => editor().doc;

export function select(nodes: string[], edges: string[] = []) {
  editor().setSelection(nodes, edges);
}

export function addConceptAt(pos?: Point, opts: { edit?: boolean; title?: string } = {}): string | null {
  if (!doc()) return null;
  const center = pos ?? viewportCenter();
  const p = pos ? center : { x: center.x - DEFAULT_NODE_SIZE.width / 2, y: center.y - DEFAULT_NODE_SIZE.height / 2 };
  const c = createConcept(findFreeSpot(p), { title: opts.title ?? '' });
  editor().apply('Criar conceito', (d) => ops.addConcept(d, c));
  select([c.id]);
  if (opts.edit !== false) editor().setEditing({ type: 'node', id: c.id });
  return c.id;
}

/** Evita criar um conceito exatamente sobre outro. */
function findFreeSpot(p: Point): Point {
  const d = doc();
  if (!d) return p;
  const vis = getVisibility(d);
  const others = Object.values(d.concepts).filter((c) => !vis.hidden.has(c.id));
  let cur = { ...p };
  for (let i = 0; i < 30; i++) {
    const hit = others.some((o) => {
      const s = sizeOf(o.id);
      return cur.x < o.position.x + s.width && cur.x + 160 > o.position.x && cur.y < o.position.y + s.height && cur.y + 44 > o.position.y;
    });
    if (!hit) return cur;
    cur = { x: cur.x + 24, y: cur.y + 24 };
  }
  return cur;
}

export function addChild(parentId?: string) {
  const d = doc();
  const pid = parentId ?? editor().selectedNodes[0];
  if (!d || !pid || !d.concepts[pid]) {
    toast.info('Selecione um conceito para criar um conceito filho.');
    return;
  }
  const res = editor().apply('Criar conceito filho', (draft) => ops.addChildConcept(draft, pid, sizeOf));
  if (res) {
    select([res.concept.id]);
    editor().setEditing({ type: 'node', id: res.concept.id });
    ensureVisible(res.concept.id);
  }
}

export function addSibling() {
  const d = doc();
  const id = editor().selectedNodes[0];
  if (!d || !id) return;
  const parent = getHierarchy(d).parentOf.get(id);
  if (parent) addChild(parent);
  else {
    const c = d.concepts[id];
    const s = sizeOf(id);
    const pos = d.settings.layoutDirection === 'TB' ? { x: c.position.x + s.width + 40, y: c.position.y } : { x: c.position.x, y: c.position.y + s.height + 30 };
    addConceptAt(pos);
  }
}

export function updateConcept(id: string, patch: Partial<Omit<Concept, 'id'>>, coalesceKey?: string) {
  editor().apply('Editar conceito', (d) => ops.updateConcept(d, id, patch), coalesceKey ? { mode: 'coalesce', key: coalesceKey } : undefined);
}

export function setConceptStyle(ids: string[], patch: Partial<ConceptStyle>) {
  if (!ids.length) return;
  editor().apply('Alterar aparência', (d) => {
    const idx = getHierarchy(d);
    for (const id of ids) {
      const c = d.concepts[id];
      if (!c) continue;
      c.style = { ...c.style, ...patch };
      // Nós filhos têm sempre a mesma cor dos pais:
      // Se a cor for alterada, sincroniza toda a árvore hierárquica (raiz, nós pais e filhos)
      if (patch.color) {
        let rootId = id;
        let p = idx.parentOf.get(rootId);
        while (p) {
          rootId = p;
          p = idx.parentOf.get(rootId);
        }
        if (d.concepts[rootId]) d.concepts[rootId].style.color = patch.color;
        for (const childId of descendantsOf(idx, rootId)) {
          const child = d.concepts[childId];
          if (child) child.style.color = patch.color;
        }
      }
    }
    ops.touch(d);
  });
}

export function setLinkStyle(ids: string[], patch: Partial<LinkStyle>) {
  if (!ids.length) return;
  editor().apply('Alterar conexão', (d) => {
    for (const id of ids) ops.updateLink(d, id, { style: patch as LinkStyle });
  });
}

export function setLinkLabel(id: string, label: string, coalesceKey?: string) {
  editor().apply('Editar frase de ligação', (d) => ops.updateLink(d, id, { label }), coalesceKey ? { mode: 'coalesce', key: coalesceKey } : undefined);
}

export function setLinkKind(id: string, kind: LinkKind) {
  const r = editor().apply('Alterar tipo de conexão', (d) => ops.setLinkKind(d, id, kind));
  if (r && !r.ok) toast.error(r.reason ?? 'Não foi possível alterar o tipo da conexão.');
}

export function reverseLink(id: string) {
  const r = editor().apply('Inverter conexão', (d) => ops.reverseLink(d, id));
  if (r?.reason) toast.info(r.reason);
}

export function connect(source: string, target: string, opts: { edit?: boolean } = {}) {
  const d = doc();
  if (!d || source === target) return null;
  const dup = Object.values(d.links).find((l) => l.source === source && l.target === target);
  if (dup) {
    toast.info('Esses conceitos já estão conectados nessa direção.');
    select([], [dup.id]);
    return null;
  }
  const link = editor().apply('Criar conexão', (draft) => ops.addLink(draft, source, target));
  if (link) {
    select([], [link.id]);
    if (opts.edit !== false) editor().setEditing({ type: 'edge', id: link.id });
  }
  return link;
}

/** Conecta os conceitos selecionados, na ordem de seleção (o primeiro é a origem). */
export function connectSelected() {
  const sel = editor().selectedNodes;
  if (sel.length < 2) {
    toast.info('Selecione dois conceitos (o primeiro será a origem) ou use o modo Conectar.');
    return;
  }
  connect(sel[0], sel[1]);
}

export function startConnectMode() {
  const sel = editor().selectedNodes;
  ui().set({ connectMode: { sourceId: sel.length === 1 ? sel[0] : null } });
}

export function deleteSelection() {
  const s = editor();
  const d = s.doc;
  if (!d) return;
  const nodes = [...s.selectedNodes];
  const edges = [...s.selectedEdges];
  if (!nodes.length && !edges.length) return;
  // Conceitos recolhidos levam junto os descendentes ocultos (que estão "dentro" deles).
  const vis = getVisibility(d);
  const idx = getHierarchy(d);
  const all = new Set(nodes);
  let hiddenExtra = 0;
  for (const id of nodes) {
    if (d.concepts[id]?.collapsed && vis.hiddenCount.get(id)) {
      for (const x of descendantsOf(idx, id)) {
        if (vis.hidden.has(x) && !all.has(x)) {
          all.add(x);
          hiddenExtra++;
        }
      }
    }
  }
  const run = () => {
    editor().apply(nodes.length ? 'Excluir conceitos' : 'Excluir conexões', (draft) => ops.deleteElements(draft, all, edges));
    editor().setSelection([], []);
    const parts: string[] = [];
    if (all.size) parts.push(`${all.size} conceito${all.size > 1 ? 's' : ''}`);
    if (edges.length) parts.push(`${edges.length} conexão${edges.length > 1 ? 'ões' : ''}`);
    toast(`Excluído: ${parts.join(' e ')}`, { action: { label: 'Desfazer', onClick: () => undo() } });
  };
  if (hiddenExtra > 0) {
    void confirmAction({
      title: 'Excluir ramo recolhido?',
      message: `O conceito selecionado contém ${hiddenExtra} conceito${hiddenExtra > 1 ? 's' : ''} oculto${hiddenExtra > 1 ? 's' : ''} no ramo recolhido, que também ser${hiddenExtra > 1 ? 'ão' : 'á'} excluído${hiddenExtra > 1 ? 's' : ''}. Você pode desfazer esta ação.`,
      confirmLabel: 'Excluir ramo',
      danger: true,
    }).then((ok) => ok && run());
  } else run();
}

export function duplicateSelection() {
  const ids = editor().selectedNodes;
  if (!ids.length) return;
  const map = editor().apply('Duplicar', (d) => ops.duplicateConcepts(d, ids));
  if (map) select([...map.values()]);
}

export function selectAll() {
  const d = doc();
  if (!d) return;
  const vis = getVisibility(d);
  select(
    Object.keys(d.concepts).filter((id) => !vis.hidden.has(id)),
    Object.values(d.links)
      .filter((l) => !vis.hidden.has(l.source) && !vis.hidden.has(l.target))
      .map((l) => l.id),
  );
}

export function toggleCollapse(id: string) {
  const d = doc();
  const c = d?.concepts[id];
  if (!d || !c) return;
  const hasChildren = (getHierarchy(d).childrenOf.get(id)?.length ?? 0) > 0;
  if (!hasChildren && !c.collapsed) return;
  editor().apply(c.collapsed ? 'Expandir ramo' : 'Recolher ramo', (draft) => ops.setCollapsed(draft, id, !c.collapsed));
  // Remove da seleção nós que ficaram ocultos.
  const vis = getVisibility(editor().doc!);
  const s = editor();
  s.setSelection(
    s.selectedNodes.filter((n) => !vis.hidden.has(n)),
    s.selectedEdges.filter((e) => {
      const l = editor().doc!.links[e];
      return l && !vis.hidden.has(l.source) && !vis.hidden.has(l.target);
    }),
  );
}

export function setAllCollapsed(collapsed: boolean) {
  editor().apply(collapsed ? 'Recolher todos' : 'Expandir todos', (d) => ops.setAllCollapsed(d, collapsed));
  if (collapsed) {
    const vis = getVisibility(editor().doc!);
    editor().setSelection(editor().selectedNodes.filter((n) => !vis.hidden.has(n)), []);
  }
}

export function undo() {
  const label = editor().undo();
  if (label) toast(`Desfeito: ${label}`, { id: 'undo-redo', duration: 1600 });
}

export function redo() {
  const label = editor().redo();
  if (label) toast(`Refeito: ${label}`, { id: 'undo-redo', duration: 1600 });
}

/* ------------------------------------------------------------------ */
/* Organização automática                                              */
/* ------------------------------------------------------------------ */

let animating = false;

function animatePositions(target: Record<string, Point>, label: string, after?: () => void, skipCheckpoint = false) {
  const d = doc();
  if (!d) return;
  const ids = Object.keys(target).filter((id) => d.concepts[id]);
  const from: Record<string, Point> = {};
  for (const id of ids) from[id] = d.concepts[id].position;
  const changed = ids.some((id) => from[id].x !== target[id].x || from[id].y !== target[id].y);
  if (!changed) {
    toast.info('O mapa já está organizado.');
    after?.();
    return;
  }
  if (!skipCheckpoint) editor().checkpoint(label);
  const setAt = (t: number) =>
    editor().apply(
      label,
      (draft) => {
        for (const id of ids) {
          const c = draft.concepts[id];
          if (!c) continue;
          c.position = {
            x: Math.round(from[id].x + (target[id].x - from[id].x) * t),
            y: Math.round(from[id].y + (target[id].y - from[id].y) * t),
          };
        }
        ops.touch(draft);
      },
      { mode: 'none' },
    );
  if (prefersReducedMotion() || ids.length > 600) {
    setAt(1);
    after?.();
    return;
  }
  animating = true;
  ui().set({ busy: 'Organizando…' });
  const start = performance.now();
  const dur = 420;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    setAt(ease(t));
    if (t < 1) requestAnimationFrame(step);
    else {
      animating = false;
      ui().set({ busy: null });
      after?.();
    }
  };
  requestAnimationFrame(step);
}

export function autoLayout(scope: 'all' | 'branch' = 'all', direction?: MapDoc['settings']['layoutDirection']) {
  const d = doc();
  if (!d || animating) return;
  if (!Object.keys(d.concepts).length) {
    toast.info('Crie alguns conceitos antes de organizar o mapa.');
    return;
  }
  const dir = direction ?? d.settings.layoutDirection;
  const label = scope === 'branch' ? 'Organizar ramo' : 'Organizar hierarquicamente';
  let checkpointed = false;
  if (dir !== d.settings.layoutDirection) {
    // A direção é uma preferência do mapa; registrada no mesmo passo de desfazer da reorganização.
    editor().checkpoint(label);
    checkpointed = true;
    editor().apply(
      label,
      (draft) => {
        draft.settings.layoutDirection = dir;
      },
      { mode: 'none' },
    );
  }
  let target: Record<string, Point>;
  if (scope === 'branch') {
    const root = editor().selectedNodes[0];
    if (!root) {
      toast.info('Selecione o conceito raiz do ramo a organizar.');
      return;
    }
    target = computeHierarchicalLayout(editor().doc!, sizeOf, { direction: dir, subset: branchSet(editor().doc!, root), anchorId: root });
  } else {
    target = computeHierarchicalLayout(editor().doc!, sizeOf, { direction: dir });
  }
  animatePositions(
    target,
    label,
    () => {
      if (scope === 'all') setTimeout(() => fitView(), 30);
    },
    checkpointed,
  );
}

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */

export function fitView() {
  void getFlow()?.fitView({ padding: 0.15, duration: prefersReducedMotion() ? 0 : 400, maxZoom: 1.5 });
}

export function zoomBy(factor: number) {
  const f = getFlow();
  if (!f) return;
  const z = f.getZoom();
  void f.zoomTo(Math.min(2.5, Math.max(0.1, z * factor)), { duration: prefersReducedMotion() ? 0 : 160 });
}

export function zoomReset() {
  void getFlow()?.zoomTo(1, { duration: prefersReducedMotion() ? 0 : 200 });
}

/** Revela (expandindo ancestrais), seleciona e centraliza um conceito. */
export function focusConcept(id: string, opts: { select?: boolean; zoom?: number } = {}) {
  const d = doc();
  if (!d?.concepts[id]) return;
  if (getVisibility(d).hidden.has(id)) {
    editor().apply('Revelar conceito', (draft) => ops.revealConcept(draft, id));
  }
  if (opts.select !== false) select([id]);
  requestAnimationFrame(() => centerOn(id, opts.zoom));
}

export function centerOn(id: string, zoom?: number) {
  const f = getFlow();
  const c = doc()?.concepts[id];
  if (!f || !c) return;
  const s = sizeOf(id);
  const z = zoom ?? Math.max(f.getZoom(), 0.9);
  void f.setCenter(c.position.x + s.width / 2, c.position.y + s.height / 2, {
    zoom: z,
    duration: prefersReducedMotion() ? 0 : 450,
  });
}

/** Garante que o conceito esteja dentro da área visível (sem alterar o zoom). */
export function ensureVisible(id: string) {
  requestAnimationFrame(() => {
    const f = getFlow();
    const c = doc()?.concepts[id];
    if (!f || !c) return;
    const el = document.querySelector('.react-flow');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const s = sizeOf(id);
    const tl = f.flowToScreenPosition(c.position);
    const br = f.flowToScreenPosition({ x: c.position.x + s.width, y: c.position.y + s.height });
    const m = 40;
    if (tl.x < r.left + m || tl.y < r.top + m || br.x > r.right - m || br.y > r.bottom - m) centerOn(id, f.getZoom());
  });
}

/** Seleciona o conceito visível mais próximo na direção indicada (navegação por teclado). */
export function selectNeighbor(dir: 'left' | 'right' | 'up' | 'down') {
  const d = doc();
  if (!d) return;
  const vis = getVisibility(d);
  const visible = Object.values(d.concepts).filter((c) => !vis.hidden.has(c.id));
  if (!visible.length) return;
  const curId = editor().selectedNodes[0];
  const cur = curId ? d.concepts[curId] : null;
  if (!cur) {
    select([visible[0].id]);
    ensureVisible(visible[0].id);
    return;
  }
  const center = (c: Concept) => {
    const s = sizeOf(c.id);
    return { x: c.position.x + s.width / 2, y: c.position.y + s.height / 2 };
  };
  const o = center(cur);
  let best: { id: string; score: number } | null = null;
  for (const c of visible) {
    if (c.id === cur.id) continue;
    const p = center(c);
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    const primary = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const secondary = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (primary <= 4) continue;
    const score = primary + secondary * 2.2;
    if (!best || score < best.score) best = { id: c.id, score };
  }
  if (best) {
    select([best.id]);
    ensureVisible(best.id);
  }
}

/* ------------------------------------------------------------------ */
/* Confirmação (implementada pelo ConfirmHost)                         */
/* ------------------------------------------------------------------ */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmHandler = (o: ConfirmOptions) => Promise<boolean>;
let confirmHandler: ConfirmHandler = async (o) => window.confirm(`${o.title}\n\n${o.message}`);

export function registerConfirmHandler(h: ConfirmHandler) {
  confirmHandler = h;
}

export function confirmAction(o: ConfirmOptions) {
  return confirmHandler(o);
}
