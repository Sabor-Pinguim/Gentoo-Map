import { z } from 'zod';
import { COLOR_KEYS, SCHEMA_VERSION, type MapDoc } from './types';

/**
 * Esquemas de validação (zod) usados na importação e ao carregar dados persistidos.
 * Campos opcionais recebem valores padrão para tolerar arquivos parciais ou antigos.
 */

const str = (max = 100_000) => z.string().max(max).catch('');
const color = z.enum(COLOR_KEYS).catch('default');
const finite = z.number().refine(Number.isFinite, 'número inválido');

const mediaSource = z.discriminatedUnion('type', [
  z.object({ type: z.literal('url'), url: z.string().max(4000) }),
  z.object({
    type: z.literal('file'),
    fileId: z.string().min(1).max(200),
    name: str(500),
    mime: str(200),
    size: z.number().nonnegative().catch(0),
  }),
]);

const id = z.string().min(1).max(200);

export const conceptSchema = z.object({
  id,
  title: str(2000),
  description: str(5000).default(''),
  position: z.object({ x: finite, y: finite }),
  width: finite.positive().max(4000).optional().catch(undefined),
  height: finite.positive().max(4000).optional().catch(undefined),
  style: z
    .object({
      shape: z.enum(['rounded', 'rectangle', 'pill', 'ellipse']).catch('rounded'),
      color,
      fontSize: z.enum(['sm', 'md', 'lg', 'xl']).catch('md'),
      bold: z.boolean().catch(false),
    })
    .default({ shape: 'rounded', color: 'default', fontSize: 'md', bold: false }),
  collapsed: z.boolean().catch(false),
  content: z
    .object({
      summary: str(20_000).default(''),
      extra: z.array(z.object({ id, key: str(500), value: str(5000) })).catch([]),
      notesHtml: str(2_000_000).default(''),
      links: z
        .array(z.object({ id, url: z.string().max(4000), title: str(1000), description: str(5000).default('') }))
        .catch([]),
      images: z.array(z.object({ id, source: mediaSource, alt: str(1000).default(''), caption: str(2000).default('') })).catch([]),
      media: z
        .array(z.object({ id, kind: z.enum(['video', 'audio']), source: mediaSource, title: str(1000).default('') }))
        .catch([]),
      documents: z
        .array(
          z.object({
            id,
            fileId: z.string().min(1).max(200),
            name: str(500),
            mime: str(200),
            size: z.number().nonnegative().catch(0),
            addedAt: z.number().catch(0),
          }),
        )
        .catch([]),
      references: z
        .array(
          z.object({
            id,
            title: str(2000),
            author: str(2000).default(''),
            year: str(50).default(''),
            source: str(4000).default(''),
            notes: str(10_000).default(''),
          }),
        )
        .catch([]),
    })
    .default({ summary: '', extra: [], notesHtml: '', links: [], images: [], media: [], documents: [], references: [] }),
  createdAt: z.number().catch(() => Date.now()),
  updatedAt: z.number().catch(() => Date.now()),
});

export const linkSchema = z.object({
  id,
  source: id,
  target: id,
  label: str(2000).default(''),
  kind: z.enum(['hierarchy', 'cross']).catch('cross'),
  style: z
    .object({
      line: z.enum(['auto', 'solid', 'dashed', 'dotted']).catch('auto'),
      curve: z.enum(['straight', 'curved']).catch('straight'),
      arrow: z.enum(['end', 'start', 'both', 'none']).catch('end'),
      color,
    })
    .default({ line: 'auto', curve: 'straight', arrow: 'end', color: 'default' }),
  createdAt: z.number().catch(0),
});

export const drawingLayerSchema = z.object({
  id,
  name: str(500).default('Camada'),
  visible: z.boolean().catch(true),
  locked: z.boolean().catch(false),
  opacity: z.number().min(0).max(1).catch(1),
  createdAt: z.number().catch(() => Date.now()),
});

export const drawingStrokeSchema = z.object({
  id,
  layerId: id,
  tool: z.enum(['pen', 'highlighter']).catch('pen'),
  color: z.string().max(100).catch('#3b82f6'),
  width: z.number().positive().max(100).catch(3),
  opacity: z.number().min(0).max(1).catch(1),
  points: z.array(z.object({ x: finite, y: finite })).catch([]),
  createdAt: z.number().catch(() => Date.now()),
});

export const drawingsSchema = z.object({
  layers: z.record(z.string(), drawingLayerSchema).catch({}),
  layerOrder: z.array(z.string()).catch([]),
  strokes: z.record(z.string(), drawingStrokeSchema).catch({}),
});

export const mapDocSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id,
  name: z.string().max(500).catch('Mapa sem nome'),
  createdAt: z.number().catch(() => Date.now()),
  updatedAt: z.number().catch(() => Date.now()),
  concepts: z.record(z.string(), conceptSchema),
  links: z.record(z.string(), linkSchema),
  settings: z
    .object({
      layoutDirection: z.enum(['TB', 'LR']).catch('TB'),
      backgroundColor: z.string().max(100).optional().catch(undefined),
    })
    .default({ layoutDirection: 'TB' }),
  drawings: drawingsSchema.optional(),
  // Campos legados mantidos para tolerar e migrar documentos antigos
  drawingLayers: z.record(z.string(), drawingLayerSchema).optional(),
  layerOrder: z.array(z.string()).optional(),
  strokes: z.record(z.string(), drawingStrokeSchema).optional(),
});

/** Migra documentos de versões anteriores para o esquema atual garantindo retrocompatibilidade total. */
export function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const doc = raw as Record<string, unknown>;

  // Retrocompatibilidade: se o arquivo tem drawingLayers na raiz mas não tem o bloco 'drawings',
  // empacota automaticamente na nova estrutura 'drawings'
  if (!doc.drawings && (doc.drawingLayers || doc.layerOrder || doc.strokes)) {
    doc.drawings = {
      layers: doc.drawingLayers ?? {},
      layerOrder: doc.layerOrder ?? [],
      strokes: doc.strokes ?? {},
    };
  }

  return doc;
}

export type ParseResult = { ok: true; doc: MapDoc } | { ok: false; errors: string[] };

export function parseMapDoc(raw: unknown): ParseResult {
  const migrated = migrate(raw) as { schemaVersion?: number } | undefined;
  if (migrated && typeof migrated === 'object' && typeof migrated.schemaVersion === 'number' && migrated.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `Este mapa usa a versão de formato ${migrated.schemaVersion}, mais recente que a suportada (${SCHEMA_VERSION}). Atualize a aplicação.`,
      ],
    };
  }
  const r = mapDocSchema.safeParse(migrated);
  if (!r.success) {
    return {
      ok: false,
      errors: r.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`),
    };
  }
  const doc = r.data as MapDoc;
  // Garante consistência entre chaves e ids.
  for (const [k, c] of Object.entries(doc.concepts)) if (c.id !== k) return { ok: false, errors: [`Conceito com id inconsistente: ${k}`] };
  for (const [k, l] of Object.entries(doc.links)) if (l.id !== k) return { ok: false, errors: [`Conexão com id inconsistente: ${k}`] };

  // Se drawings não existia no JSON (ex.: mapas criados em versões anteriores da aplicação),
  // inicializa com estrutura padrão válida garantindo retrocompatibilidade transparente!
  if (!doc.drawings || !doc.drawings.layers || Object.keys(doc.drawings.layers).length === 0) {
    const bgLayer = {
      id: 'bg-layer-1',
      name: 'Fundo',
      visible: true,
      locked: false,
      opacity: 1,
      createdAt: Date.now() - 1000,
    };
    const defaultLayer = {
      id: 'default-layer-1',
      name: 'Anotações',
      visible: true,
      locked: false,
      opacity: 1,
      createdAt: Date.now(),
    };
    doc.drawings = {
      layers: {
        [bgLayer.id]: bgLayer,
        [defaultLayer.id]: defaultLayer,
      },
      layerOrder: ['bg-layer-1', 'nodes-layer', 'default-layer-1'],
      strokes: doc.drawings?.strokes ?? {},
    };
  } else if (!doc.drawings.layerOrder.includes('nodes-layer')) {
    doc.drawings.layerOrder.unshift('nodes-layer');
  }

  // Preenche aliases em tempo de execução para manter compatibilidade
  doc.drawingLayers = doc.drawings.layers;
  doc.layerOrder = doc.drawings.layerOrder;
  doc.strokes = doc.drawings.strokes;

  doc.schemaVersion = SCHEMA_VERSION;
  return { ok: true, doc };
}

