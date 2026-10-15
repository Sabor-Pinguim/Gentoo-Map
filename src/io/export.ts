import JSZip from 'jszip';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { MapDoc } from '../model/types';
import { getFile } from '../persistence/fileRepo';
import { referencedFileIds } from '../model/factory';
import { readBlobAsArrayBuffer } from '../utils/files';
import { getFlow } from '../canvas/flowApi';
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

/** Enquadra o mapa inteiro temporariamente para captura total em alta resolução */
async function prepareSnapshot(): Promise<{ restore: () => void; bg: string }> {
  const flow = getFlow();
  let prevVp: { x: number; y: number; zoom: number } | null = null;
  if (flow) {
    prevVp = flow.getViewport();
    await flow.fitView({ padding: 0.12, duration: 0 });
    // Aguarda atualização dos nós e vetores SVG na tela
    await new Promise((r) => setTimeout(r, 80));
  }
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';

  return {
    bg,
    restore: () => {
      if (flow && prevVp) {
        flow.setViewport(prevVp, { duration: 0 });
      }
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

/** Exporta a área completa do mapa para imagem PNG em alta resolução */
export async function exportMapPng(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando imagem PNG em alta resolução…');
    const { bg, restore } = await prepareSnapshot();

    try {
      const dataUrl = await toPng(container, {
        backgroundColor: bg,
        pixelRatio: 2,
        filter: exportFilter,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${slugify(filename)}.png`;
      a.click();
      toast.success('Imagem PNG gerada com sucesso!');
    } finally {
      restore();
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
    const { bg, restore } = await prepareSnapshot();

    try {
      const dataUrl = await toSvg(container, {
        backgroundColor: bg,
        filter: exportFilter,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${slugify(filename)}.svg`;
      a.click();
      toast.success('Vetor SVG gerado com sucesso!');
    } finally {
      restore();
    }
  } catch (err) {
    console.error('Falha ao exportar SVG:', err);
    toast.error('Falha ao exportar SVG.');
  }
}

/** Exporta para documento PDF */
export async function exportMapPdf(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando documento PDF…');
    const { bg, restore } = await prepareSnapshot();

    try {
      const dataUrl = await toPng(container, {
        backgroundColor: bg,
        pixelRatio: 2,
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
      restore();
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
