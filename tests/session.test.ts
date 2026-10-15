import { describe, it, expect, beforeEach } from 'vitest';
import { createConcept, createMap, materialCount } from '../src/model/factory';
import * as ops from '../src/model/ops';
import { exportBackupZip } from '../src/io/export';
import { importZipPackage } from '../src/io/import';
import { putFile, getFile } from '../src/persistence/fileRepo';
import { resetDBConnection } from '../src/persistence/db';
import { loadMap } from '../src/persistence/mapRepo';

describe('6. Testes Adicionais de Portabilidade (Backup ZIP) e Regras Semânticas', () => {
  beforeEach(async () => {
    await resetDBConnection();
  });

  it('exporta e importa pacote .cmapzip com arquivos binários anexados', async () => {
    const doc = createMap('Mapa com Anexo');
    const c1 = createConcept({ x: 0, y: 0 }, { title: 'Conceito com PDF' });
    ops.addConcept(doc, c1);

    // Cria um arquivo binário e anexa ao conceito
    const blob = new Blob(['%PDF-1.4 simulacao de pdf'], { type: 'application/pdf' });
    const stored = await putFile(blob, 'artigo.pdf', 'application/pdf');

    c1.content.documents.push({
      id: 'doc_1',
      fileId: stored.id,
      name: 'artigo.pdf',
      mime: 'application/pdf',
      size: stored.size,
      addedAt: Date.now(),
    });

    expect(materialCount(c1)).toBe(1);

    // Gera o ZIP em memória capturando o download
    let exportedBlob: Blob | null = null;
    const origCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = (b: Blob) => {
      exportedBlob = b;
      return 'blob:mock-zip';
    };

    await exportBackupZip(doc);
    window.URL.createObjectURL = origCreateObjectURL;

    expect(exportedBlob).not.toBeNull();

    // Simula a importação do arquivo ZIP em uma nova sessão
    const fakeZipFile = new File([exportedBlob!], 'backup.cmapzip', { type: 'application/zip' });
    const importedOk = await importZipPackage(fakeZipFile);
    expect(importedOk).toBe(true);

    // Verifica que o mapa e o arquivo binário foram restaurados no IndexedDB
    const restoredMap = await loadMap(doc.id);
    expect(restoredMap).toBeDefined();
    expect(restoredMap?.concepts[c1.id].content.documents[0].name).toBe('artigo.pdf');

    const restoredFile = await getFile(stored.id);
    expect(restoredFile).toBeDefined();
    expect(restoredFile?.name).toBe('artigo.pdf');
  });

  it('evita ciclos na hierarquia degradando automaticamente ligações cíclicas para ligações cruzadas', () => {
    const doc = createMap('Teste Ciclo');
    const a = createConcept({ x: 0, y: 0 }, { title: 'A' });
    const b = createConcept({ x: 0, y: 100 }, { title: 'B' });
    const c = createConcept({ x: 0, y: 200 }, { title: 'C' });

    ops.addConcept(doc, a);
    ops.addConcept(doc, b);
    ops.addConcept(doc, c);

    // A -> B -> C (hierárquicas)
    ops.addLink(doc, a.id, b.id, { kind: 'hierarchy' });
    ops.addLink(doc, b.id, c.id, { kind: 'hierarchy' });

    // Tentativa de ligar C -> A como hierarquia (o que formaria ciclo A -> B -> C -> A)
    const cycleLink = ops.addLink(doc, c.id, a.id, { kind: 'hierarchy' })!;

    // O sistema deve automaticamente degradar para 'cross' para preservar a árvore
    expect(cycleLink.kind).toBe('cross');
  });
});

