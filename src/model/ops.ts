import { createConcept, createLink, newId } from './factory';
import { ancestorsOf, canBeHierarchy, descendantsOf, getHierarchy, getVisibility } from './hierarchy';
import {
  type Concept,
  type DrawingLayer,
  type DrawingStroke,
  type Link,
  type LinkKind,
  type MapDoc,
  type Point,
  NODES_LAYER_ID,
} from './types';

/**
 * Operações puras sobre o documento. Recebem um rascunho (immer draft) e o modificam.
 * Toda operação preserva os invariantes: sem ligações órfãs, hierarquia sem ciclos e
 * no máximo um pai hierárquico por conceito.
 */

export function touch(doc: MapDoc) {
  doc.updatedAt = Date.now();
}

export function addConcept(doc: MapDoc, concept: Concept) {
  doc.concepts[concept.id] = concept;
  touch(doc);
}

export function updateConcept(doc: MapDoc, id: string, patch: Partial<Omit<Concept, 'id'>>) {
  const c = doc.concepts[id];
  if (!c) return;
  Object.assign(c, patch);
  c.updatedAt = Date.now();
  touch(doc);
}

/**
 * Move conceitos. Quando um conceito recolhido é movido, seus descendentes ocultos
 * acompanham o mesmo deslocamento, preservando o arranjo relativo do ramo.
 */
export function moveConcepts(doc: MapDoc, positions: Record<string, Point>) {
  const vis = getVisibility(doc);
  const idx = getHierarchy(doc);
  const moved = new Set(Object.keys(positions));
  for (const [id, p] of Object.entries(positions)) {
    const c = doc.concepts[id];
    if (!c) continue;
    const dx = p.x - c.position.x;
    const dy = p.y - c.position.y;
    if (!dx && !dy) continue;
    c.position = { x: p.x, y: p.y };
    if (c.collapsed && vis.hiddenCount.get(id)) {
      for (const d of descendantsOf(idx, id)) {
        if (moved.has(d) || !vis.hidden.has(d)) continue;
        const dc = doc.concepts[d];
        if (dc) dc.position = { x: dc.position.x + dx, y: dc.position.y + dy };
      }
    }
  }
  touch(doc);
}

export function deleteElements(doc: MapDoc, conceptIds: Iterable<string>, linkIds: Iterable<string> = []) {
  const cset = new Set(conceptIds);
  for (const id of cset) delete doc.concepts[id];
  for (const id of linkIds) delete doc.links[id];
  for (const l of Object.values(doc.links)) {
    if (cset.has(l.source) || cset.has(l.target)) delete doc.links[l.id];
  }
  touch(doc);
}

/** Tipo padrão de uma nova ligação: hierárquica quando possível, cruzada caso contrário. */
export function defaultLinkKind(doc: MapDoc, source: string, target: string): LinkKind {
  return canBeHierarchy(doc, source, target).ok ? 'hierarchy' : 'cross';
}

export function addLink(
  doc: MapDoc,
  source: string,
  target: string,
  opts: { kind?: LinkKind; label?: string } = {},
): Link | null {
  if (!doc.concepts[source] || !doc.concepts[target] || source === target) return null;
  let kind = opts.kind ?? defaultLinkKind(doc, source, target);
  if (kind === 'hierarchy' && !canBeHierarchy(doc, source, target).ok) kind = 'cross';
  const link = createLink(source, target, kind, { label: opts.label ?? '' });
  doc.links[link.id] = link;
  if (kind === 'hierarchy') {
    const parentColor = doc.concepts[source].style.color;
    doc.concepts[target].style.color = parentColor;
    const idx = getHierarchy(doc);
    for (const d of descendantsOf(idx, target)) {
      if (doc.concepts[d]) doc.concepts[d].style.color = parentColor;
    }
  }
  touch(doc);
  return link;
}

export function updateLink(doc: MapDoc, id: string, patch: Partial<Pick<Link, 'label' | 'style'>>) {
  const l = doc.links[id];
  if (!l) return;
  if (patch.label !== undefined) l.label = patch.label;
  if (patch.style) l.style = { ...l.style, ...patch.style };
  touch(doc);
}

export function setLinkKind(doc: MapDoc, id: string, kind: LinkKind): { ok: boolean; reason?: string } {
  const l = doc.links[id];
  if (!l) return { ok: false, reason: 'Conexão não encontrada.' };
  if (l.kind === kind) return { ok: true };
  if (kind === 'hierarchy') {
    const check = canBeHierarchy(doc, l.source, l.target, l.id);
    if (!check.ok) return check;
    if (doc.concepts[l.source] && doc.concepts[l.target]) {
      const parentColor = doc.concepts[l.source].style.color;
      doc.concepts[l.target].style.color = parentColor;
      const idx = getHierarchy(doc);
      for (const d of descendantsOf(idx, l.target)) {
        if (doc.concepts[d]) doc.concepts[d].style.color = parentColor;
      }
    }
  }
  l.kind = kind;
  touch(doc);
  return { ok: true };
}

export function reverseLink(doc: MapDoc, id: string): { ok: boolean; reason?: string } {
  const l = doc.links[id];
  if (!l) return { ok: false, reason: 'Conexão não encontrada.' };
  let demoted = false;
  if (l.kind === 'hierarchy' && !canBeHierarchy(doc, l.target, l.source, l.id).ok) {
    l.kind = 'cross';
    demoted = true;
  }
  const s = l.source;
  l.source = l.target;
  l.target = s;
  touch(doc);
  return demoted
    ? { ok: true, reason: 'A conexão foi invertida e convertida em ligação cruzada para manter a hierarquia válida.' }
    : { ok: true };
}

export function setCollapsed(doc: MapDoc, id: string, collapsed: boolean) {
  const c = doc.concepts[id];
  if (!c || c.collapsed === collapsed) return;
  c.collapsed = collapsed;
  touch(doc);
}

/** Expande os ancestrais recolhidos para que o conceito fique visível. Retorna se algo mudou. */
export function revealConcept(doc: MapDoc, id: string): boolean {
  const idx = getHierarchy(doc);
  let changed = false;
  for (const a of ancestorsOf(idx, id)) {
    const c = doc.concepts[a];
    if (c?.collapsed) {
      c.collapsed = false;
      changed = true;
    }
  }
  if (changed) touch(doc);
  return changed;
}

export function setAllCollapsed(doc: MapDoc, collapsed: boolean) {
  const idx = getHierarchy(doc);
  for (const c of Object.values(doc.concepts)) {
    const hasChildren = (idx.childrenOf.get(c.id)?.length ?? 0) > 0;
    c.collapsed = collapsed && hasChildren;
  }
  touch(doc);
}

/**
 * Duplica conceitos (com seus materiais) e as conexões internas ao conjunto.
 * Arquivos anexados são compartilhados por referência (mesmo fileId).
 */
export function duplicateConcepts(doc: MapDoc, ids: string[], offset: Point = { x: 40, y: 40 }) {
  const map = new Map<string, string>();
  const now = Date.now();
  for (const id of ids) {
    const src = doc.concepts[id];
    if (!src) continue;
    const copy: Concept = JSON.parse(JSON.stringify(src));
    copy.id = newId('c');
    copy.position = { x: src.position.x + offset.x, y: src.position.y + offset.y };
    copy.createdAt = now;
    copy.updatedAt = now;
    const ct = copy.content;
    for (const arr of [ct.links, ct.images, ct.media, ct.documents, ct.references, ct.extra] as { id: string }[][]) {
      for (const item of arr) item.id = newId('m');
    }
    doc.concepts[copy.id] = copy;
    map.set(id, copy.id);
  }
  for (const l of Object.values(doc.links)) {
    const s = map.get(l.source);
    const t = map.get(l.target);
    if (s && t) {
      const nl = createLink(s, t, l.kind, { label: l.label, style: { ...l.style } });
      doc.links[nl.id] = nl;
    }
  }
  touch(doc);
  return map;
}

/** Cria um conceito filho ligado hierarquicamente ao pai, numa posição livre próxima. */
export function addChildConcept(
  doc: MapDoc,
  parentId: string,
  size: (id: string) => { width: number; height: number },
): { concept: Concept; link: Link | null } | null {
  const parent = doc.concepts[parentId];
  if (!parent) return null;
  const dir = doc.settings.layoutDirection;
  const ps = size(parentId);
  const idx = getHierarchy(doc);
  const siblings = (idx.childrenOf.get(parentId) ?? []).map((id) => doc.concepts[id]).filter(Boolean);
  const childW = 180;
  const childH = 52;
  let pos: Point;
  if (dir === 'TB') {
    const y = parent.position.y + ps.height + 120;
    const maxX = siblings.length
      ? Math.max(...siblings.map((s) => s.position.x + size(s.id).width)) + 40
      : parent.position.x + ps.width / 2 - childW / 2;
    pos = { x: maxX, y: siblings.length ? Math.min(...siblings.map((s) => s.position.y)) : y };
  } else {
    const x = parent.position.x + ps.width + 150;
    const maxY = siblings.length
      ? Math.max(...siblings.map((s) => s.position.y + size(s.id).height)) + 30
      : parent.position.y + ps.height / 2 - childH / 2;
    pos = { x: siblings.length ? Math.min(...siblings.map((s) => s.position.x)) : x, y: maxY };
  }
  if (parent.collapsed) parent.collapsed = false;
  const concept = createConcept(pos, { style: { ...parent.style, bold: false } });
  doc.concepts[concept.id] = concept;
  const link = addLink(doc, parentId, concept.id, { kind: 'hierarchy' });
  return { concept, link };
}

/** Verificação de integridade usada após importações e em testes. */
export function validateIntegrity(doc: MapDoc): string[] {
  const problems: string[] = [];
  const parents = new Map<string, string>();
  for (const l of Object.values(doc.links)) {
    if (!doc.concepts[l.source]) problems.push(`Conexão ${l.id} com origem inexistente.`);
    if (!doc.concepts[l.target]) problems.push(`Conexão ${l.id} com destino inexistente.`);
    if (l.kind === 'hierarchy') {
      if (parents.has(l.target)) problems.push(`Conceito ${l.target} com mais de um pai hierárquico.`);
      parents.set(l.target, l.source);
    }
  }
  for (const start of parents.keys()) {
    const seen = new Set<string>();
    let cur: string | undefined = start;
    while (cur) {
      if (seen.has(cur)) {
        problems.push(`Ciclo hierárquico envolvendo ${start}.`);
        break;
      }
      seen.add(cur);
      cur = parents.get(cur);
    }
  }
  return problems;
}

/** Corrige um documento: remove ligações órfãs e rebaixa hierarquias inválidas a cruzadas. */
export function repairIntegrity(doc: MapDoc) {
  for (const l of Object.values(doc.links)) {
    if (!doc.concepts[l.source] || !doc.concepts[l.target] || l.source === l.target) delete doc.links[l.id];
  }
  const hier = Object.values(doc.links)
    .filter((l) => l.kind === 'hierarchy')
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const l of hier) l.kind = 'cross';
  for (const l of hier) {
    if (canBeHierarchy(doc, l.source, l.target).ok) l.kind = 'hierarchy';
  }
}

/** Garante que o documento tenha drawingLayers, layerOrder e strokes inicializados. */
export function ensureDrawingDoc(doc: MapDoc): {
  layers: Record<string, DrawingLayer>;
  order: string[];
  strokes: Record<string, DrawingStroke>;
} {
  if (!doc.drawingLayers || Object.keys(doc.drawingLayers).length === 0) {
    const defaultLayer: DrawingLayer = {
      id: 'default-layer-1',
      name: 'Anotações',
      visible: true,
      locked: false,
      opacity: 1,
      createdAt: Date.now(),
    };
    doc.drawingLayers = { [defaultLayer.id]: defaultLayer };
  }
  if (!doc.layerOrder || doc.layerOrder.length === 0) {
    // Por padrão, 'default-layer-1' fica acima de 'nodes-layer'
    doc.layerOrder = [NODES_LAYER_ID, Object.keys(doc.drawingLayers)[0]];
  } else if (!doc.layerOrder.includes(NODES_LAYER_ID)) {
    doc.layerOrder.unshift(NODES_LAYER_ID);
  }
  if (!doc.strokes) {
    doc.strokes = {};
  }
  return {
    layers: doc.drawingLayers,
    order: doc.layerOrder,
    strokes: doc.strokes,
  };
}

export function addStroke(doc: MapDoc, stroke: DrawingStroke) {
  const d = ensureDrawingDoc(doc);
  d.strokes[stroke.id] = stroke;
  touch(doc);
}

export function deleteStroke(doc: MapDoc, strokeId: string) {
  const d = ensureDrawingDoc(doc);
  if (d.strokes[strokeId]) {
    delete d.strokes[strokeId];
    touch(doc);
  }
}

export function deleteStrokes(doc: MapDoc, strokeIds: string[]) {
  const d = ensureDrawingDoc(doc);
  let changed = false;
  for (const id of strokeIds) {
    if (d.strokes[id]) {
      delete d.strokes[id];
      changed = true;
    }
  }
  if (changed) touch(doc);
}

export function addDrawingLayer(doc: MapDoc, name?: string): DrawingLayer {
  const d = ensureDrawingDoc(doc);
  const layerNum = Object.keys(d.layers).length + 1;
  const layer: DrawingLayer = {
    id: newId('layer'),
    name: name?.trim() || `Camada ${layerNum}`,
    visible: true,
    locked: false,
    opacity: 1,
    createdAt: Date.now(),
  };
  d.layers[layer.id] = layer;
  // Insere no topo da pilha (final de layerOrder)
  d.order.push(layer.id);
  touch(doc);
  return layer;
}

export function updateDrawingLayer(doc: MapDoc, layerId: string, patch: Partial<DrawingLayer>) {
  const d = ensureDrawingDoc(doc);
  const layer = d.layers[layerId];
  if (!layer) return;
  Object.assign(layer, patch);
  touch(doc);
}

export function deleteDrawingLayer(doc: MapDoc, layerId: string) {
  const d = ensureDrawingDoc(doc);
  const drawingLayerCount = Object.keys(d.layers).length;
  // Preserva pelo menos 1 camada de desenho
  if (drawingLayerCount <= 1) return;

  delete d.layers[layerId];
  doc.layerOrder = (doc.layerOrder ?? []).filter((id) => id !== layerId);

  // Remove também todos os traços associados a essa camada
  for (const [sId, stroke] of Object.entries(d.strokes)) {
    if (stroke.layerId === layerId) {
      delete d.strokes[sId];
    }
  }
  touch(doc);
}

export function reorderLayers(doc: MapDoc, newOrder: string[]) {
  const d = ensureDrawingDoc(doc);
  const currentSet = new Set(d.order);
  const validNew = newOrder.filter((id) => currentSet.has(id));
  for (const id of d.order) {
    if (!validNew.includes(id)) validNew.push(id);
  }
  doc.layerOrder = validNew;
  touch(doc);
}

export function clearLayerStrokes(doc: MapDoc, layerId: string) {
  const d = ensureDrawingDoc(doc);
  let changed = false;
  for (const [sId, stroke] of Object.entries(d.strokes)) {
    if (stroke.layerId === layerId) {
      delete d.strokes[sId];
      changed = true;
    }
  }
  if (changed) touch(doc);
}
