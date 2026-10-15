import JSZip from 'jszip';
import { parseMapDoc } from '../model/schema';
import { repairIntegrity } from '../model/ops';
import { putFileWithId } from '../persistence/fileRepo';
import { saveMap } from '../persistence/mapRepo';
import { openDoc } from '../state/session';
import { toast } from 'sonner';

/** Importa mapa a partir de arquivo JSON ou pacote compactado ZIP/CMAPZIP */
export async function importMapFile(file: File): Promise<boolean> {
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.zip') || name.endsWith('.cmapzip')) {
      return await importZipPackage(file);
    } else {
      const text = await file.text();
      return await importJsonString(text, file.name);
    }
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Falha ao importar o arquivo.');
    return false;
  }
}

export async function importJsonString(jsonText: string, filename?: string): Promise<boolean> {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    toast.error('O arquivo selecionado não contém um formato JSON válido.');
    return false;
  }

  const parsed = parseMapDoc(raw);
  if (!parsed.ok) {
    toast.error(`Arquivo incompatível: ${parsed.errors.join('; ')}`);
    return false;
  }

  const doc = parsed.doc;
  repairIntegrity(doc);

  if (filename) {
    doc.name = filename.replace(/\.(cmap\.json|json)$/i, '');
  }

  await saveMap(doc);
  await openDoc(doc);
  toast.success(`Mapa “${doc.name}” importado com sucesso!`);
  return true;
}

export async function importZipPackage(file: File): Promise<boolean> {
  toast.info('Lendo pacote compactado e restaurando mídias…');
  const zip = await JSZip.loadAsync(file);

  // 1. Procura o descritor map.json
  const mapJsonEntry = zip.file('map.json');
  if (!mapJsonEntry) {
    toast.error('Pacote inválido: arquivo “map.json” não encontrado no zip.');
    return false;
  }

  const mapJsonText = await mapJsonEntry.async('string');
  let raw: unknown;
  try {
    raw = JSON.parse(mapJsonText);
  } catch {
    toast.error('O descritor map.json dentro do pacote está corrompido.');
    return false;
  }

  const parsed = parseMapDoc(raw);
  if (!parsed.ok) {
    toast.error(`Estrutura do mapa incompatível: ${parsed.errors.join('; ')}`);
    return false;
  }

  const doc = parsed.doc;
  repairIntegrity(doc);

  // 2. Extrai arquivos binários da pasta files/
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    const entries: { fileId: string; entry: JSZip.JSZipObject }[] = [];
    filesFolder.forEach((relativePath, entry) => {
      if (!entry.dir) {
        entries.push({ fileId: relativePath, entry });
      }
    });

    for (const { fileId, entry } of entries) {
      const blob = await entry.async('blob');
      // Procura nome e mime originais no mapa
      let originalName = fileId;
      let originalMime = blob.type || 'application/octet-stream';

      for (const c of Object.values(doc.concepts)) {
        for (const d of c.content.documents) {
          if (d.fileId === fileId) {
            originalName = d.name;
            originalMime = d.mime;
          }
        }
        for (const img of c.content.images) {
          if (img.source.type === 'file' && img.source.fileId === fileId) {
            originalName = img.source.name;
            originalMime = img.source.mime;
          }
        }
      }

      await putFileWithId(fileId, blob, originalName, originalMime);
    }
  }

  await saveMap(doc);
  await openDoc(doc);
  toast.success(`Backup completo “${doc.name}” importado com sucesso!`);
  return true;
}

