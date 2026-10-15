/** Regras de validação de arquivos enviados pelo usuário. */

export type FileCategory = 'image' | 'video' | 'audio' | 'document';

export const MB = 1024 * 1024;

export const LIMITS: Record<FileCategory, number> = {
  image: 25 * MB,
  video: 300 * MB,
  audio: 100 * MB,
  document: 100 * MB,
};

const DOC_EXT = [
  'pdf', 'txt', 'md', 'csv', 'tsv', 'json', 'xml', 'rtf',
  'doc', 'docx', 'odt', 'ppt', 'pptx', 'odp', 'key',
  'xls', 'xlsx', 'ods', 'numbers', 'pages', 'epub',
  'zip', '7z', 'rar', 'tex', 'bib', 'ris',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg',
  'mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm', 'mov', 'html', 'htm',
];

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/svg+xml'];
const VIDEO_EXT = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv'];
const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'weba'];

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  if (n < 1024 * MB) return `${(n / MB).toFixed(1).replace('.', ',')} MB`;
  return `${(n / (1024 * MB)).toFixed(2).replace('.', ',')} GB`;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFile(file: File, category: FileCategory): ValidationResult {
  const ext = extOf(file.name);
  const mime = file.type;
  if (file.size === 0) return { ok: false, error: `“${file.name}” está vazio.` };
  const limit = LIMITS[category];
  if (file.size > limit) {
    return {
      ok: false,
      error: `“${file.name}” tem ${formatBytes(file.size)}; o limite para este tipo é ${formatBytes(limit)}.`,
    };
  }
  switch (category) {
    case 'image':
      if (!IMAGE_MIME.includes(mime) && !['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'].includes(ext))
        return { ok: false, error: `“${file.name}” não é uma imagem suportada (PNG, JPEG, GIF, WebP, AVIF, BMP ou SVG).` };
      break;
    case 'video':
      if (!mime.startsWith('video/') && !VIDEO_EXT.includes(ext))
        return { ok: false, error: `“${file.name}” não parece ser um arquivo de vídeo.` };
      break;
    case 'audio':
      if (!mime.startsWith('audio/') && !AUDIO_EXT.includes(ext))
        return { ok: false, error: `“${file.name}” não parece ser um arquivo de áudio.` };
      break;
    case 'document':
      if (!DOC_EXT.includes(ext) && !mime)
        return { ok: false, error: `O formato de “${file.name}” não é suportado.` };
      break;
  }
  return { ok: true };
}

export function mediaKindOfFile(file: File): 'video' | 'audio' | null {
  const ext = extOf(file.name);
  if (file.type.startsWith('video/') || VIDEO_EXT.includes(ext)) return 'video';
  if (file.type.startsWith('audio/') || AUDIO_EXT.includes(ext)) return 'audio';
  return null;
}

/** Tipos que podem ser abertos com segurança diretamente no navegador (não executam scripts). */
export function isSafeInlineMime(mime: string): boolean {
  return (
    mime === 'application/pdf' ||
    mime === 'text/plain' ||
    (mime.startsWith('image/') && mime !== 'image/svg+xml') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/')
  );
}

export function isPdf(mime: string, name = ''): boolean {
  return mime === 'application/pdf' || extOf(name) === 'pdf';
}

export function isTextLike(mime: string, name = ''): boolean {
  return mime.startsWith('text/plain') || ['txt', 'md', 'csv', 'tsv', 'json', 'bib', 'ris', 'tex'].includes(extOf(name));
}

export function friendlyFormat(mime: string, name: string): string {
  const ext = extOf(name);
  if (ext) return ext.toUpperCase();
  if (mime) return mime.split('/').pop()!.toUpperCase();
  return 'ARQUIVO';
}

export async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return await blob.arrayBuffer();
  }
  if (typeof Response !== 'undefined') {
    try {
      return await new Response(blob).arrayBuffer();
    } catch {
      // fallback
    }
  }
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

