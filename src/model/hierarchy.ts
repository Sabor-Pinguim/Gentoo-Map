import type { MapDoc } from './types';

/**
 * Índice hierárquico derivado das ligações do tipo `hierarchy`.
 * Invariantes garantidas pelas operações do modelo:
 *  - cada conceito tem no máximo um pai hierárquico;
 *  - não há ciclos hierárquicos.
 */
export interface HierarchyIndex {
  parentOf: Map<string, string>;
  parentLinkOf: Map<string, string>;
  childrenOf: Map<string, string[]>;
}

export function getHierarchy(doc: Pick<MapDoc, 'links'>): HierarchyIndex {
  const parentOf = new Map<string, string>();
  const parentLinkOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  const links = Object.values(doc.links).sort((a, b) => a.createdAt - b.createdAt);
  for (const l of links) {
    if (l.kind !== 'hierarchy') continue;
    if (parentOf.has(l.target)) continue; // defensivo: ignora pais duplicados
    parentOf.set(l.target, l.source);
    parentLinkOf.set(l.target, l.id);
    const arr = childrenOf.get(l.source);
    if (arr) arr.push(l.target);
    else childrenOf.set(l.source, [l.target]);
  }
  return { parentOf, parentLinkOf, childrenOf };
}

/** Todos os descendentes hierárquicos (sem incluir o próprio nó). Seguro contra ciclos. */
export function descendantsOf(idx: HierarchyIndex, id: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([id]);
  const stack = [...(idx.childrenOf.get(id) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    const ch = idx.childrenOf.get(n);
    if (ch) stack.push(...ch);
  }
  return out;
}

export function ancestorsOf(idx: HierarchyIndex, id: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([id]);
  let cur = idx.parentOf.get(id);
  while (cur && !seen.has(cur)) {
    out.push(cur);
    seen.add(cur);
    cur = idx.parentOf.get(cur);
  }
  return out;
}

/** Verifica se `ancestor` é ancestral de `node` na hierarquia. */
export function isAncestor(idx: HierarchyIndex, ancestor: string, node: string): boolean {
  return ancestorsOf(idx, node).includes(ancestor);
}

/**
 * Indica se uma ligação source → target pode ser hierárquica sem violar os invariantes.
 * `ignoreLinkId` permite validar a alteração de uma ligação existente.
 */
export function canBeHierarchy(
  doc: Pick<MapDoc, 'links'>,
  source: string,
  target: string,
  ignoreLinkId?: string,
): { ok: true } | { ok: false; reason: string } {
  if (source === target) return { ok: false, reason: 'Um conceito não pode ser pai de si mesmo.' };
  const links = ignoreLinkId
    ? Object.fromEntries(Object.entries(doc.links).filter(([id]) => id !== ignoreLinkId))
    : doc.links;
  const idx = getHierarchy({ links });
  const existingParent = idx.parentOf.get(target);
  if (existingParent !== undefined)
    return { ok: false, reason: 'O conceito de destino já possui um pai hierárquico.' };
  if (isAncestor(idx, target, source) )
    return { ok: false, reason: 'Isso criaria um ciclo na hierarquia.' };
  return { ok: true };
}

export interface VisibilityInfo {
  hidden: Set<string>;
  /** Para cada nó recolhido: quantidade de descendentes ocultos. */
  hiddenCount: Map<string, number>;
  /** Para cada nó recolhido: ligações cruzadas que envolvem descendentes ocultos. */
  hiddenCrossCount: Map<string, number>;
  /** Para cada nó oculto: o ancestral recolhido visível mais próximo. */
  hiddenUnder: Map<string, string>;
}

export function getVisibility(doc: Pick<MapDoc, 'concepts' | 'links'>): VisibilityInfo {
  const idx = getHierarchy(doc);
  const hidden = new Set<string>();
  const hiddenCount = new Map<string, number>();
  const hiddenCrossCount = new Map<string, number>();
  const hiddenUnder = new Map<string, string>();

  for (const c of Object.values(doc.concepts)) {
    if (!c.collapsed) continue;
    // Somente o ancestral recolhido mais alto define o que está oculto.
    const ancestors = ancestorsOf(idx, c.id);
    if (ancestors.some((a) => doc.concepts[a]?.collapsed)) continue;
    const desc = descendantsOf(idx, c.id).filter((d) => doc.concepts[d]);
    for (const d of desc) {
      hidden.add(d);
      hiddenUnder.set(d, c.id);
    }
    hiddenCount.set(c.id, desc.length);
  }
  if (hidden.size) {
    for (const l of Object.values(doc.links)) {
      if (l.kind !== 'cross') continue;
      const owners = new Set<string>();
      if (hidden.has(l.source)) owners.add(hiddenUnder.get(l.source)!);
      if (hidden.has(l.target)) owners.add(hiddenUnder.get(l.target)!);
      for (const o of owners) hiddenCrossCount.set(o, (hiddenCrossCount.get(o) ?? 0) + 1);
    }
  }
  return { hidden, hiddenCount, hiddenCrossCount, hiddenUnder };
}

/** Raízes hierárquicas (conceitos sem pai). */
export function rootsOf(doc: Pick<MapDoc, 'concepts' | 'links'>): string[] {
  const idx = getHierarchy(doc);
  return Object.keys(doc.concepts).filter((id) => !idx.parentOf.has(id));
}

