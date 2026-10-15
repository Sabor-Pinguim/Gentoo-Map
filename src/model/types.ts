/**
 * Modelo de dados explícito e versionado do mapa conceitual.
 *
 * A fonte de verdade é o `MapDoc`. O canvas (React Flow) é apenas uma
 * projeção derivada deste documento — nunca o contrário.
 */

export const SCHEMA_VERSION = 1;

export type NodeShape = 'rounded' | 'rectangle' | 'pill' | 'ellipse';

export const COLOR_KEYS = [
  'default',
  'slate',
  'blue',
  'teal',
  'green',
  'amber',
  'orange',
  'red',
  'pink',
  'violet',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ConceptStyle {
  shape: NodeShape;
  color: ColorKey;
  fontSize: FontSize;
  bold: boolean;
}

export interface Point {
  x: number;
  y: number;
}

/** Origem de uma mídia: URL externa ou arquivo armazenado no IndexedDB. */
export type MediaSource =
  | { type: 'url'; url: string }
  | { type: 'file'; fileId: string; name: string; mime: string; size: number };

export interface ExternalLink {
  id: string;
  url: string;
  title: string;
  description: string;
}

export interface ImageItem {
  id: string;
  source: MediaSource;
  alt: string;
  caption: string;
}

export interface MediaItem {
  id: string;
  kind: 'video' | 'audio';
  source: MediaSource;
  title: string;
}

export interface DocumentItem {
  id: string;
  fileId: string;
  name: string;
  mime: string;
  size: number;
  addedAt: number;
}

export interface ReferenceItem {
  id: string;
  title: string;
  author: string;
  year: string;
  /** URL, DOI, ISBN ou outra identificação bibliográfica. */
  source: string;
  notes: string;
}

export interface ExtraField {
  id: string;
  key: string;
  value: string;
}

export interface ConceptContent {
  /** Anotações gerais curtas (texto simples), exibidas na visão geral. */
  summary: string;
  /** Informações complementares opcionais em formato chave/valor. */
  extra: ExtraField[];
  /** Anotações extensas (HTML restrito produzido pelo editor e sanitizado). */
  notesHtml: string;
  links: ExternalLink[];
  images: ImageItem[];
  media: MediaItem[];
  documents: DocumentItem[];
  references: ReferenceItem[];
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  position: Point;
  /** Largura definida pelo usuário (px). Quando ausente, a largura é automática. */
  width?: number;
  /** Altura mínima definida pelo usuário (px). */
  height?: number;
  style: ConceptStyle;
  /** Estado de exibição: quando verdadeiro, os descendentes hierárquicos ficam ocultos. */
  collapsed: boolean;
  content: ConceptContent;
  createdAt: number;
  updatedAt: number;
}

/**
 * `hierarchy`: relação pai → filho (define a árvore usada para recolher/expandir e para o layout).
 * `cross`: ligação cruzada entre conceitos (não altera a hierarquia).
 */
export type LinkKind = 'hierarchy' | 'cross';
export type LineStyle = 'auto' | 'solid' | 'dashed' | 'dotted';
export type CurveStyle = 'straight' | 'curved';
export type ArrowStyle = 'end' | 'none' | 'both';

export interface LinkStyle {
  line: LineStyle;
  curve: CurveStyle;
  arrow: ArrowStyle;
  color: ColorKey;
}

export interface Link {
  id: string;
  source: string;
  target: string;
  /** Palavra ou frase de ligação. */
  label: string;
  kind: LinkKind;
  style: LinkStyle;
  createdAt: number;
}

export type LayoutDirection = 'TB' | 'LR';

export interface MapSettings {
  layoutDirection: LayoutDirection;
}

export const NODES_LAYER_ID = 'nodes-layer';

export type DrawingToolType = 'pen' | 'highlighter';

export interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  createdAt: number;
}

export interface DrawingStroke {
  id: string;
  layerId: string;
  tool: DrawingToolType;
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  createdAt: number;
}

export interface MapDoc {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  concepts: Record<string, Concept>;
  links: Record<string, Link>;
  settings: MapSettings;
  drawingLayers?: Record<string, DrawingLayer>;
  layerOrder?: string[];
  strokes?: Record<string, DrawingStroke>;
}

/** Resumo leve de um mapa usado na listagem. */
export interface MapMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  conceptCount: number;
  linkCount: number;
}

/** Registro de arquivo armazenado no IndexedDB. O id é o hash SHA-256 do conteúdo. */
export interface StoredFile {
  id: string;
  blob: Blob;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
}

