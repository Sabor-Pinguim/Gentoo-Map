import { nanoid } from 'nanoid';
import {
  SCHEMA_VERSION,
  type Concept,
  type ConceptContent,
  type ConceptStyle,
  type Link,
  type LinkKind,
  type LinkStyle,
  type MapDoc,
  type MapMeta,
  type Point,
} from './types';

export const newId = (prefix: string) => `${prefix}_${nanoid(12)}`;

export const DEFAULT_CONCEPT_STYLE: ConceptStyle = {
  shape: 'rounded',
  color: 'default',
  fontSize: 'md',
  bold: false,
};

export const DEFAULT_LINK_STYLE: LinkStyle = {
  line: 'auto',
  curve: 'straight',
  arrow: 'end',
  color: 'default',
};

export function emptyContent(): ConceptContent {
  return {
    summary: '',
    extra: [],
    notesHtml: '',
    links: [],
    images: [],
    media: [],
    documents: [],
    references: [],
  };
}

export function createConcept(
  position: Point,
  partial: Partial<Omit<Concept, 'id'>> = {},
): Concept {
  const now = Date.now();
  return {
    id: newId('c'),
    title: '',
    description: '',
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    style: { ...DEFAULT_CONCEPT_STYLE },
    collapsed: false,
    content: emptyContent(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createLink(
  source: string,
  target: string,
  kind: LinkKind,
  partial: Partial<Omit<Link, 'id' | 'source' | 'target' | 'kind'>> = {},
): Link {
  return {
    id: newId('l'),
    source,
    target,
    label: '',
    kind,
    style: { ...DEFAULT_LINK_STYLE },
    createdAt: Date.now(),
    ...partial,
  };
}

export function createMap(name = 'Novo mapa'): MapDoc {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId('map'),
    name,
    createdAt: now,
    updatedAt: now,
    concepts: {},
    links: {},
    settings: { layoutDirection: 'TB' },
  };
}

export function metaOf(doc: MapDoc): MapMeta {
  return {
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    conceptCount: Object.keys(doc.concepts).length,
    linkCount: Object.keys(doc.links).length,
  };
}

/** Conta os materiais complementares de um conceito (exceto título/descrição). */
export function materialCount(c: Concept): number {
  const ct = c.content;
  return (
    (ct.notesHtml && stripHtml(ct.notesHtml).trim() ? 1 : 0) +
    (ct.summary.trim() ? 1 : 0) +
    ct.links.length +
    ct.images.length +
    ct.media.length +
    ct.documents.length +
    ct.references.length
  );
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Todos os ids de arquivos (IndexedDB) referenciados por um mapa. */
export function referencedFileIds(doc: MapDoc, into = new Set<string>()): Set<string> {
  for (const c of Object.values(doc.concepts)) {
    for (const d of c.content.documents) into.add(d.fileId);
    for (const i of c.content.images) if (i.source.type === 'file') into.add(i.source.fileId);
    for (const m of c.content.media) if (m.source.type === 'file') into.add(m.source.fileId);
  }
  return into;
}

