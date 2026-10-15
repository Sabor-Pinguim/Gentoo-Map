import dagre from '@dagrejs/dagre';
import { descendantsOf, getHierarchy, getVisibility } from '../model/hierarchy';
import type { LayoutDirection, MapDoc, Point } from '../model/types';

export interface Size {
  width: number;
  height: number;
}

export const DEFAULT_NODE_SIZE: Size = { width: 180, height: 52 };

/** Estimativa do tamanho de uma frase de ligação renderizada (fonte 14.5px). */
export function estimateLabelSize(label: string): Size {
  if (!label.trim()) return { width: 0, height: 0 };
  const chars = Math.min(label.length, 30);
  const lines = Math.ceil(label.length / 30);
  return { width: chars * 7.5 + 28, height: lines * 19 + 10 };
}

export interface LayoutOptions {
  direction: LayoutDirection;
  /** Restringe o layout a este conjunto de conceitos (ex.: um ramo). */
  subset?: Set<string>;
  /** Mantém este conceito fixo na posição atual (usado ao organizar um ramo). */
  anchorId?: string;
  nodeSep?: number;
  rankSep?: number;
}

/**
 * Organização hierárquica automática (algoritmo em camadas de Sugiyama via dagre).
 *
 * - As ligações `hierarchy` definem as camadas; ligações cruzadas são preservadas,
 *   mas não interferem na hierarquia (evita que um ramo inteiro seja empurrado).
 * - As frases de ligação recebem espaço próprio (nós de rótulo do dagre), preservando
 *   sua legibilidade.
 * - A ordem inicial considera a disposição atual, para respeitar o arranjo do usuário.
 * - Somente conceitos visíveis participam; os descendentes ocultos de ramos recolhidos
 *   acompanham o deslocamento de seu ancestral recolhido.
 */
export function computeHierarchicalLayout(
  doc: MapDoc,
  sizeOf: (id: string) => Size,
  opts: LayoutOptions,
): Record<string, Point> {
  const vis = getVisibility(doc);
  const idx = getHierarchy(doc);
  const dir = opts.direction;
  const ids = Object.keys(doc.concepts).filter(
    (id) => !vis.hidden.has(id) && (!opts.subset || opts.subset.has(id)),
  );
  if (!ids.length) return {};
  const idSet = new Set(ids);

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: dir,
    nodesep: opts.nodeSep ?? (dir === 'TB' ? 48 : 28),
    ranksep: opts.rankSep ?? (dir === 'TB' ? 70 : 90),
    edgesep: 16,
    marginx: 0,
    marginy: 0,
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Ordem de inserção = ordem atual no eixo transversal, preservando a intenção do usuário.
  const cross = (id: string) => (dir === 'TB' ? doc.concepts[id].position.x : doc.concepts[id].position.y);
  const sorted = [...ids].sort((a, b) => cross(a) - cross(b));
  for (const id of sorted) {
    const s = sizeOf(id);
    g.setNode(id, { width: s.width, height: s.height });
  }

  const links = Object.values(doc.links)
    .filter((l) => l.kind === 'hierarchy' && idSet.has(l.source) && idSet.has(l.target))
    .sort((a, b) => cross(a.target) - cross(b.target));
  for (const l of links) {
    const ls = estimateLabelSize(l.label);
    g.setEdge(
      l.source,
      l.target,
      { width: ls.width, height: ls.height, labelpos: 'c', minlen: 1, weight: 2 },
      l.id,
    );
  }

  dagre.layout(g);

  const result: Record<string, Point> = {};
  for (const id of ids) {
    const n = g.node(id) as { x: number; y: number; width: number; height: number };
    result[id] = { x: Math.round(n.x - n.width / 2), y: Math.round(n.y - n.height / 2) };
  }

  // Ancoragem: mantém o conceito âncora (ou o centro do conjunto anterior) no lugar.
  let dx = 0;
  let dy = 0;
  if (opts.anchorId && result[opts.anchorId]) {
    const a = doc.concepts[opts.anchorId].position;
    dx = a.x - result[opts.anchorId].x;
    dy = a.y - result[opts.anchorId].y;
  } else {
    const before = bbox(ids.map((id) => doc.concepts[id].position));
    const after = bbox(ids.map((id) => result[id]));
    dx = Math.round(before.minX - after.minX);
    dy = Math.round(before.minY - after.minY);
  }
  for (const id of ids) result[id] = { x: result[id].x + dx, y: result[id].y + dy };

  // Descendentes ocultos acompanham o ancestral recolhido.
  for (const id of ids) {
    const c = doc.concepts[id];
    if (!c.collapsed || !vis.hiddenCount.get(id)) continue;
    const ddx = result[id].x - c.position.x;
    const ddy = result[id].y - c.position.y;
    for (const d of descendantsOf(idx, id)) {
      if (!vis.hidden.has(d) || !doc.concepts[d]) continue;
      const p = doc.concepts[d].position;
      result[d] = { x: p.x + ddx, y: p.y + ddy };
    }
  }
  return result;
}

function bbox(points: Point[]) {
  let minX = Infinity;
  let minY = Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  }
  return { minX, minY };
}

/** Conjunto do ramo (conceito + descendentes visíveis). */
export function branchSet(doc: MapDoc, rootId: string): Set<string> {
  const idx = getHierarchy(doc);
  return new Set([rootId, ...descendantsOf(idx, rootId)]);
}

/** Verifica sobreposição entre retângulos (usado em testes e diagnósticos). */
export function countOverlaps(positions: Record<string, Point>, sizeOf: (id: string) => Size): number {
  const ids = Object.keys(positions);
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    const a = positions[ids[i]];
    const as = sizeOf(ids[i]);
    for (let j = i + 1; j < ids.length; j++) {
      const b = positions[ids[j]];
      const bs = sizeOf(ids[j]);
      if (a.x < b.x + bs.width && a.x + as.width > b.x && a.y < b.y + bs.height && a.y + as.height > b.y) n++;
    }
  }
  return n;
}

