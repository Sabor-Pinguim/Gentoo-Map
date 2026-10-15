import JSZip from 'jszip';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { MapDoc } from '../model/types';
import { getFile } from '../persistence/fileRepo';
import { referencedFileIds } from '../model/factory';
import { readBlobAsArrayBuffer } from '../utils/files';
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

/** Exporta a área do mapa para imagem PNG */
export async function exportMapPng(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando imagem PNG em alta resolução…');
    const dataUrl = await toPng(container, {
      backgroundColor: '#fbfbfc',
      pixelRatio: 2,
      filter: (node) => {
        // Ignora controles de interface, minimapa e botões rápidos
        if (node instanceof HTMLElement) {
          if (
            node.classList.contains('react-flow__minimap') ||
            node.classList.contains('quick-add-handle') ||
            node.classList.contains('react-flow__handle')
          ) {
            return false;
          }
        }
        return true;
      },
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${slugify(filename)}.png`;
    a.click();
    toast.success('Imagem PNG gerada!');
  } catch {
    toast.error('Falha ao exportar imagem PNG.');
  }
}

/** Exporta para vetor SVG */
export async function exportMapSvg(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando vetor SVG…');
    const dataUrl = await toSvg(container, {
      backgroundColor: '#fbfbfc',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (
            node.classList.contains('react-flow__minimap') ||
            node.classList.contains('quick-add-handle') ||
            node.classList.contains('react-flow__handle')
          ) {
            return false;
          }
        }
        return true;
      },
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${slugify(filename)}.svg`;
    a.click();
    toast.success('Vetor SVG gerado!');
  } catch {
    toast.error('Falha ao exportar SVG.');
  }
}

/** Exporta para documento PDF */
export async function exportMapPdf(container: HTMLElement, filename = 'mapa') {
  try {
    toast.info('Gerando documento PDF…');
    const dataUrl = await toPng(container, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (
            node.classList.contains('react-flow__minimap') ||
            node.classList.contains('quick-add-handle') ||
            node.classList.contains('react-flow__handle')
          ) {
            return false;
          }
        }
        return true;
      },
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
  } catch {
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
