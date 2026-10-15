import { referencedFileIds } from '../model/factory';
import type { MapDoc } from '../model/types';
import { deleteFiles, listFileInfo } from './fileRepo';
import { loadAllMaps } from './mapRepo';

/**
 * Remove arquivos que não são referenciados por nenhum mapa salvo nem pelos documentos
 * em memória (mapa aberto e seu histórico de desfazer). Assim, materiais removidos
 * podem ser restaurados com "Desfazer" durante a sessão, e arquivos usados por outros
 * conceitos ou mapas nunca são excluídos.
 */
export async function collectGarbage(inMemory: MapDoc[] = []): Promise<{ removed: number; freed: number }> {
  const maps = await loadAllMaps();
  const used = new Set<string>();
  for (const m of maps) referencedFileIds(m, used);
  for (const m of inMemory) referencedFileIds(m, used);
  const files = await listFileInfo();
  const orphan = files.filter((f) => !used.has(f.id));
  await deleteFiles(orphan.map((f) => f.id));
  return { removed: orphan.length, freed: orphan.reduce((s, f) => s + f.size, 0) };
}

export async function fileUsageSummary(inMemory: MapDoc[] = []) {
  const maps = await loadAllMaps();
  const used = new Set<string>();
  for (const m of maps) referencedFileIds(m, used);
  for (const m of inMemory) referencedFileIds(m, used);
  const files = await listFileInfo();
  let usedBytes = 0;
  let orphanBytes = 0;
  let orphanCount = 0;
  for (const f of files) {
    if (used.has(f.id)) usedBytes += f.size;
    else {
      orphanBytes += f.size;
      orphanCount++;
    }
  }
  return { fileCount: files.length, usedBytes, orphanBytes, orphanCount, mapCount: maps.length };
}

