import JSZip from 'jszip';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { MapDoc } from '../model/types';
import { getFile } from '../persistence/fileRepo';
import { referencedFileIds } from '../model/factory';
import { readBlobAsArrayBuffer } from '../utils/files';
import { getFlow } from '../canvas/flowApi';
import { useEditor } from '../state/editorStore';
import { toast } from 'sonner';

/** Exporta o documento como JSON versionado para backup leve ou intercâmbio */
export function exportMapJson(doc: MapDoc) {
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(doc.name)}.cmap.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Mapa exportado em JSON!');
}

/**
 * Exporta pacote ZIP completo (.cmapzip) contendo a estrutura JSON do mapa
 * e todos os arquivos binários anexados (imagens, PDFs, mídias)
 */
export async function exportBackupZip(doc: MapDoc) {
  toast.info('Preparando pacote de backup com arquivos anexos…');
  const zip = new JSZip();

  // 1. Inclui o arquivo descritor JSON
  zip.file('map.json', JSON.stringify(doc, null, 2));

  // 2. Coleta e inclui todos os arquivos binários referenciados
  const fileIds = referencedFileIds(doc);
  const filesFolder = zip.folder('files');

  for (const fileId of fileIds) {
    const stored = await getFile(fileId);
    if (stored && filesFolder) {
      const buf = await readBlobAsArrayBuffer(stored.blob);
      filesFolder.file(fileId, buf);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(doc.name)}.cmapzip`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Backup compactado (.cmapzip) exportado com sucesso!');
}

interface ExportParameters {
  targetElement: HTMLElement;
  width: number;
  height: number;
  pixelRatio: number;
  bg: string;
  style: Record<string, string>;
}

/** Calcula os limites visuais e parâmetros de exportação em escala 100% natural com supersampling */
function calculateExportParameters(container: HTMLElement): ExportParameters {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDark ? '#15171d' : '#ffffff';

  const flow = getFlow();
  const nodes = flow?.getNodes() ?? [];
  const doc = useEditor.getState().doc;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (nodes.length > 0) {
    for (const n of nodes) {
      const x = n.position.x;
      const y = n.position.y;
      const w = n.measured?.width ?? (n.width as number) ?? 220;
      const h = n.measured?.height ?? (n.height as number) ?? 80;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
  } else if (doc) {
    for (const c of Object.values(doc.concepts)) {
      minX = Math.min(minX, c.position.x);
      minY = Math.min(minY, c.position.y);
      maxX = Math.max(maxX, c.position.x + (c.width ?? 220));
      maxY = Math.max(maxY, c.position.y + (c.height ?? 80));
    }
  }

  // Considera também os limites dos traços de desenho
  const strokes = doc?.drawings?.strokes ?? doc?.strokes ?? {};
  for (const stroke of Object.values(strokes)) {
    const pad = (stroke.width || 4) + 6;
    for (const pt of stroke.points) {
      minX = Math.min(minX, pt.x - pad);
      minY = Math.min(minY, pt.y - pad);
      maxX = Math.max(maxX, pt.x + pad);
      maxY = Math.max(maxY, pt.y + pad);
    }
  }

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1200;
    maxY = 800;
  }

  // Margem de respiro ao redor de todo o mapa
  const padding = 72;
  const contentWidth = Math.max(300, maxX - minX);
  const contentHeight = Math.max(200, maxY - minY);
  const exportWidth = Math.ceil(contentWidth + padding * 2);
  const exportHeight = Math.ceil(contentHeight + padding * 2);

  // Calcula pixelRatio para resolução cristalina (renderizando até ~12.000px sem estourar limites de memória Canvas)
  const maxDim = Math.max(exportWidth, exportHeight);
  const TARGET_MAX_CANVAS_DIM = 12000;
  let pixelRatio = 2;
  if (maxDim * 2 > TARGET_MAX_CANVAS_DIM) {
    pixelRatio = Math.max(1, TARGET_MAX_CANVAS_DIM / maxDim);
  }

  const viewportEl = container.querySelector<HTMLElement>('.react-flow__viewport');
  const targetElement = viewportEl || container;

  const translateX = -minX + padding;
  const translateY = -minY + padding;

  return {
    targetElement,
    width: exportWidth,
    height: exportHeight,
    pixelRatio,
    bg,
    style: {
      width: `${exportWidth}px`,
      height: `${exportHeight}px`,
      transform: `translate(${translateX}px, ${translateY}px) scale(1)`,
    },
  };
}

const exportFilter = (node: unknown): boolean => {
  if (node instanceof HTMLElement) {
    if (
      node.classList.contains('react-flow__minimap') ||
      node.classList.contains('react-flow__controls') ||
      node.classList.contains('react-flow__panel') ||
      node.classList.contains('quick-add-handle') ||
      node.classList.contains('react-flow__handle') ||
      node.classList.contains('drawing-interaction-overlay') ||
      node.classList.contains('canvas-empty-overlay')
    ) {
      return false;
    }
  }
  return true;
};

/** Exporta a área completa do mapa para imagem PNG em altíssima resolução e nitidez */
export async function exportMapPng(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando imagem PNG em alta resolução…');
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.ready;
    }

    const prevNodes = useEditor.getState().selectedNodes;
    const prevEdges = useEditor.getState().selectedEdges;
    if (prevNodes.length > 0 || prevEdges.length > 0) {
      useEditor.getState().setSelection([], []);
      await new Promise((r) => setTimeout(r, 40));
    }

    try {
      const params = calculateExportParameters(container);
      const dataUrl = await toPng(params.targetElement, {
        backgroundColor: params.bg,
        width: params.width,
        height: params.height,
        style: params.style,
        pixelRatio: params.pixelRatio,
        filter: exportFilter,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${slugify(filename)}.png`;
      a.click();
      toast.success('Imagem PNG gerada com sucesso em alta resolução!');
    } finally {
      if (prevNodes.length > 0 || prevEdges.length > 0) {
        useEditor.getState().setSelection(prevNodes, prevEdges);
      }
    }
  } catch (err) {
    console.error('Falha ao exportar PNG:', err);
    toast.error('Falha ao exportar imagem PNG.');
  }
}

/** Exporta para vetor SVG */
export async function exportMapSvg(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando vetor SVG…');
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.ready;
    }

    const prevNodes = useEditor.getState().selectedNodes;
    const prevEdges = useEditor.getState().selectedEdges;
    if (prevNodes.length > 0 || prevEdges.length > 0) {
      useEditor.getState().setSelection([], []);
      await new Promise((r) => setTimeout(r, 40));
    }

    try {
      const params = calculateExportParameters(container);
      const dataUrl = await toSvg(params.targetElement, {
        backgroundColor: params.bg,
        width: params.width,
        height: params.height,
        style: params.style,
        filter: exportFilter,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${slugify(filename)}.svg`;
      a.click();
      toast.success('Vetor SVG gerado com sucesso!');
    } finally {
      if (prevNodes.length > 0 || prevEdges.length > 0) {
        useEditor.getState().setSelection(prevNodes, prevEdges);
      }
    }
  } catch (err) {
    console.error('Falha ao exportar SVG:', err);
    toast.error('Falha ao exportar SVG.');
  }
}

/** Exporta para documento PDF em alta definição */
export async function exportMapPdf(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando documento PDF em alta resolução…');
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.ready;
    }

    const prevNodes = useEditor.getState().selectedNodes;
    const prevEdges = useEditor.getState().selectedEdges;
    if (prevNodes.length > 0 || prevEdges.length > 0) {
      useEditor.getState().setSelection([], []);
      await new Promise((r) => setTimeout(r, 40));
    }

    try {
      const params = calculateExportParameters(container);
      const dataUrl = await toPng(params.targetElement, {
        backgroundColor: params.bg,
        width: params.width,
        height: params.height,
        style: params.style,
        pixelRatio: params.pixelRatio,
        filter: exportFilter,
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const orientation = img.width > img.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [img.width, img.height],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save(`${slugify(filename)}.pdf`);
      toast.success('Documento PDF gerado com sucesso!');
    } finally {
      if (prevNodes.length > 0 || prevEdges.length > 0) {
        useEditor.getState().setSelection(prevNodes, prevEdges);
      }
    }
  } catch (err) {
    console.error('Falha ao exportar PDF:', err);
    toast.error('Falha ao exportar PDF.');
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .substring(0, 50) || 'mapa-conceitual';
}
