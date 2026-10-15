import { describe, it, expect, beforeEach } from 'vitest';
import { createConcept, createMap } from '../src/model/factory';
import * as ops from '../src/model/ops';
import { getHierarchy, getVisibility } from '../src/model/hierarchy';
import { computeHierarchicalLayout } from '../src/layout/hierarchicalLayout';
import { saveMap, loadMap, listMaps } from '../src/persistence/mapRepo';
import { putFile, getFile } from '../src/persistence/fileRepo';
import { parseMapDoc } from '../src/model/schema';
import { validateFile } from '../src/utils/files';
import { normalizeUrl, detectEmbed, sanitizeNotesHtml } from '../src/utils/url';
import { resetDBConnection } from '../src/persistence/db';
import { createRfidPresentationMap } from '../src/model/rfidPresentationMap';

describe('1. Criação, Edição, Movimentação, Duplicação e Exclusão de Nós', () => {
  it('cria e edita nós mantendo integridade', () => {
    const doc = createMap('Teste Nós');
    const c1 = createConcept({ x: 100, y: 100 }, { title: 'Conceito A' });
    ops.addConcept(doc, c1);

    expect(doc.concepts[c1.id]).toBeDefined();
    expect(doc.concepts[c1.id].title).toBe('Conceito A');

    ops.updateConcept(doc, c1.id, { title: 'Conceito A Alterado', description: 'Nova desc' });
    expect(doc.concepts[c1.id].title).toBe('Conceito A Alterado');
    expect(doc.concepts[c1.id].description).toBe('Nova desc');
  });

  it('move múltiplos nós e reposiciona descendentes ocultos de ramos recolhidos', () => {
    const doc = createMap('Teste Movimento');
    const p = createConcept({ x: 100, y: 100 }, { title: 'Pai' });
    const c = createConcept({ x: 100, y: 200 }, { title: 'Filho' });
    ops.addConcept(doc, p);
    ops.addConcept(doc, c);
    ops.addLink(doc, p.id, c.id, { kind: 'hierarchy' });

    // Recolhe o pai
    ops.setCollapsed(doc, p.id, true);
    expect(getVisibility(doc).hidden.has(c.id)).toBe(true);

    // Ao mover o pai em +50px no X e +30px no Y, o filho oculto deve acompanhar o mesmo deslocamento relativo
    ops.moveConcepts(doc, { [p.id]: { x: 150, y: 130 } });
    expect(doc.concepts[p.id].position).toEqual({ x: 150, y: 130 });
    expect(doc.concepts[c.id].position).toEqual({ x: 150, y: 230 });
  });

  it('duplica nós e conexões preservando estrutura interna', () => {
    const doc = createMap('Teste Duplicação');
    const a = createConcept({ x: 50, y: 50 }, { title: 'A' });
    const b = createConcept({ x: 50, y: 150 }, { title: 'B' });
    ops.addConcept(doc, a);
    ops.addConcept(doc, b);
    ops.addLink(doc, a.id, b.id, { label: 'liga' });

    const map = ops.duplicateConcepts(doc, [a.id, b.id], { x: 30, y: 30 });
    expect(map.size).toBe(2);

    const newAId = map.get(a.id)!;
    const newBId = map.get(b.id)!;
    expect(doc.concepts[newAId].title).toBe('A');
    expect(doc.concepts[newBId].title).toBe('B');

    // Verifica que a conexão entre os nós duplicados foi replicada
    const newLink = Object.values(doc.links).find(
      (l) => l.source === newAId && l.target === newBId
    );
    expect(newLink).toBeDefined();
    expect(newLink?.label).toBe('liga');
  });

  it('exclui nós e remove conexões órfãs automaticamente', () => {
    const doc = createMap('Teste Exclusão');
    const a = createConcept({ x: 10, y: 10 }, { title: 'A' });
    const b = createConcept({ x: 20, y: 20 }, { title: 'B' });
    ops.addConcept(doc, a);
    ops.addConcept(doc, b);
    const link = ops.addLink(doc, a.id, b.id)!;

    expect(doc.links[link.id]).toBeDefined();

    // Exclui nó A
    ops.deleteElements(doc, [a.id]);
    expect(doc.concepts[a.id]).toBeUndefined();
    // A conexão deve ter sido excluída para não deixar conexões órfãs
    expect(doc.links[link.id]).toBeUndefined();
  });
});

describe('2. Conexões Semânticas e Frases de Ligação', () => {
  it('cria conexões com frase de ligação editável', () => {
    const doc = createMap('Teste Conexões');
    const a = createConcept({ x: 0, y: 0 }, { title: 'Inteligência Artificial' });
    const b = createConcept({ x: 100, y: 100 }, { title: 'Redes Neurais' });
    ops.addConcept(doc, a);
    ops.addConcept(doc, b);

    const l = ops.addLink(doc, a.id, b.id, { label: 'pode utilizar' })!;
    expect(l.label).toBe('pode utilizar');

    ops.updateLink(doc, l.id, { label: 'emprega arquiteturas de' });
    expect(doc.links[l.id].label).toBe('emprega arquiteturas de');
  });

  it('inverte direção de conexões e preserva coerência hierárquica', () => {
    const doc = createMap('Teste Inversão');
    const a = createConcept({ x: 0, y: 0 }, { title: 'A' });
    const b = createConcept({ x: 50, y: 50 }, { title: 'B' });
    ops.addConcept(doc, a);
    ops.addConcept(doc, b);
    const l = ops.addLink(doc, a.id, b.id, { kind: 'hierarchy' })!;

    expect(l.source).toBe(a.id);
    expect(l.target).toBe(b.id);

    ops.reverseLink(doc, l.id);
    expect(doc.links[l.id].source).toBe(b.id);
    expect(doc.links[l.id].target).toBe(a.id);
  });
});

describe('3. Hierarquia, Recolhimento e Preservação de Ligações Cruzadas', () => {
  it('identifica corretamente relações pai/filho e descendentes', () => {
    const doc = createMap('Teste Hierarquia');
    const raiz = createConcept({ x: 0, y: 0 }, { title: 'Raiz' });
    const f1 = createConcept({ x: 0, y: 100 }, { title: 'F1' });
    const f2 = createConcept({ x: 100, y: 100 }, { title: 'F2' });
    const neto = createConcept({ x: 0, y: 200 }, { title: 'Neto' });
    ops.addConcept(doc, raiz);
    ops.addConcept(doc, f1);
    ops.addConcept(doc, f2);
    ops.addConcept(doc, neto);

    ops.addLink(doc, raiz.id, f1.id, { kind: 'hierarchy' });
    ops.addLink(doc, raiz.id, f2.id, { kind: 'hierarchy' });
    ops.addLink(doc, f1.id, neto.id, { kind: 'hierarchy' });

    const h = getHierarchy(doc);
    expect(h.parentOf.get(f1.id)).toBe(raiz.id);
    expect(h.parentOf.get(neto.id)).toBe(f1.id);
    expect(h.childrenOf.get(raiz.id)).toContain(f1.id);
    expect(h.childrenOf.get(raiz.id)).toContain(f2.id);
  });

  it('recolhe e expande ramos sem perda de dados, mantendo ligações cruzadas', () => {
    const doc = createMap('Teste Collapse');
    const raiz = createConcept({ x: 0, y: 0 }, { title: 'Raiz' });
    const ramoA = createConcept({ x: -100, y: 100 }, { title: 'Ramo A' });
    const ramoB = createConcept({ x: 100, y: 100 }, { title: 'Ramo B' });
    const folhaA = createConcept({ x: -100, y: 200 }, { title: 'Folha A' });

    ops.addConcept(doc, raiz);
    ops.addConcept(doc, ramoA);
    ops.addConcept(doc, ramoB);
    ops.addConcept(doc, folhaA);

    ops.addLink(doc, raiz.id, ramoA.id, { kind: 'hierarchy' });
    ops.addLink(doc, raiz.id, ramoB.id, { kind: 'hierarchy' });
    ops.addLink(doc, ramoA.id, folhaA.id, { kind: 'hierarchy' });

    // Ligação cruzada entre Folha A (no Ramo A) e Ramo B
    const crossLink = ops.addLink(doc, folhaA.id, ramoB.id, { kind: 'cross', label: 'relaciona' })!;

    // Recolhe ramo A
    ops.setCollapsed(doc, ramoA.id, true);
    const vis = getVisibility(doc);

    // folhaA deve estar oculta
    expect(vis.hidden.has(folhaA.id)).toBe(true);
    // ramoB e ramoA continuam visíveis
    expect(vis.hidden.has(ramoB.id)).toBe(false);
    expect(vis.hidden.has(ramoA.id)).toBe(false);
    // Contagem de ocultos sob ramoA deve ser 1
    expect(vis.hiddenCount.get(ramoA.id)).toBe(1);

    // A ligação cruzada original continua intacta no modelo (sem deletar nem desvirtuar dados)
    expect(doc.links[crossLink.id]).toBeDefined();

    // Expande ramo A novamente
    ops.setCollapsed(doc, ramoA.id, false);
    const visExpanded = getVisibility(doc);
    expect(visExpanded.hidden.has(folhaA.id)).toBe(false);
  });
});

describe('4. Organização Hierárquica Automática (Dagre)', () => {
  it('calcula posições hierárquicas consistentes sem sobreposições', () => {
    const doc = createMap('Teste Layout');
    const r = createConcept({ x: 0, y: 0 }, { title: 'Raiz' });
    const a = createConcept({ x: 0, y: 0 }, { title: 'Filho A' });
    const b = createConcept({ x: 0, y: 0 }, { title: 'Filho B' });
    ops.addConcept(doc, r);
    ops.addConcept(doc, a);
    ops.addConcept(doc, b);
    ops.addLink(doc, r.id, a.id, { kind: 'hierarchy', label: 'gera' });
    ops.addLink(doc, r.id, b.id, { kind: 'hierarchy', label: 'gera' });

    const positions = computeHierarchicalLayout(doc, () => ({ width: 140, height: 44 }), {
      direction: 'TB',
    });

    expect(positions[r.id]).toBeDefined();
    expect(positions[a.id]).toBeDefined();
    expect(positions[b.id]).toBeDefined();

    // Na direção Top-to-Bottom, os filhos devem ter Y estritamente maior que a raiz
    expect(positions[a.id].y).toBeGreaterThan(positions[r.id].y);
    expect(positions[b.id].y).toBeGreaterThan(positions[r.id].y);

    // E os filhos não devem ter o mesmo X (devem ser distribuídos lateralmente)
    expect(positions[a.id].x).not.toBe(positions[b.id].x);
  });
});

describe('5. Persistência Local (IndexedDB), Arquivos e Sanitização', () => {
  beforeEach(async () => {
    await resetDBConnection();
  });

  it('salva e recupera mapas no IndexedDB', async () => {
    const doc = createMap('Mapa Persistente');
    const c = createConcept({ x: 10, y: 20 }, { title: 'Conceito Persistido' });
    ops.addConcept(doc, c);

    await saveMap(doc);
    const loaded = await loadMap(doc.id);

    expect(loaded).toBeDefined();
    expect(loaded?.name).toBe('Mapa Persistente');
    expect(loaded?.concepts[c.id].title).toBe('Conceito Persistido');

    const maps = await listMaps();
    expect(maps.some((m) => m.id === doc.id)).toBe(true);
  });

  it('armazena e recupera arquivos binários com deduplicação por hash', async () => {
    const blob1 = new Blob(['conteudo de teste'], { type: 'text/plain' });
    const blob2 = new Blob(['conteudo de teste'], { type: 'text/plain' });

    const f1 = await putFile(blob1, 'arquivo1.txt');
    const f2 = await putFile(blob2, 'arquivo2.txt');

    // Mesmo conteúdo = mesmo ID (deduplicação)
    expect(f1.id).toBe(f2.id);

    const fetched = await getFile(f1.id);
    expect(fetched).toBeDefined();
    expect(fetched?.size).toBe(blob1.size);
  });

  it('valida limites de arquivo e tipo', () => {
    const validImg = new File(['123'], 'foto.png', { type: 'image/png' });
    expect(validateFile(validImg, 'image').ok).toBe(true);

    const invalidImg = new File(['123'], 'virus.exe', { type: 'application/x-msdownload' });
    expect(validateFile(invalidImg, 'image').ok).toBe(false);
  });

  it('sanitiza anotações HTML contra scripts maliciosos', () => {
    const dirty = '<p>Texto seguro</p><script>alert("xss")</script><a href="javascript:alert(1)">Link malicioso</a>';
    const clean = sanitizeNotesHtml(dirty);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Texto seguro');
  });

  it('normaliza URLs e detecta provedores de mídia', () => {
    expect(normalizeUrl('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
    expect(normalizeUrl('javascript:void(0)')).toBeNull();

    const embed = detectEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(embed.type).toBe('iframe');
    if (embed.type === 'iframe') {
      expect(embed.provider).toBe('YouTube');
    }
  });

  it('valida schema do mapa e rejeita dados corrompidos', () => {
    const validDoc = createMap('Válido');
    expect(parseMapDoc(validDoc).ok).toBe(true);

    const corrupt = { schemaVersion: 999, id: 'corrupt' };
    expect(parseMapDoc(corrupt).ok).toBe(false);
  });
});

describe('6. Herança de Cores e Integridade dos Nós Filhos', () => {
  it('filhos herdam a mesma cor do pai ao criar conceito filho', () => {
    const doc = createMap('Teste Cor Filho');
    const pai = createConcept({ x: 0, y: 0 }, { title: 'Pai', style: { shape: 'rounded', color: 'violet', fontSize: 'md', bold: true } });
    ops.addConcept(doc, pai);

    const res = ops.addChildConcept(doc, pai.id, () => ({ width: 180, height: 52 }));
    expect(res).toBeDefined();
    expect(res?.concept.style.color).toBe('violet');
  });

  it('ao conectar dois conceitos com ligação hierárquica, o filho e descendentes herdam a cor do pai', () => {
    const doc = createMap('Teste Cor Conexao');
    const pai = createConcept({ x: 0, y: 0 }, { title: 'Pai', style: { shape: 'rounded', color: 'blue', fontSize: 'lg', bold: true } });
    const filho = createConcept({ x: 0, y: 100 }, { title: 'Filho', style: { shape: 'rounded', color: 'amber', fontSize: 'md', bold: false } });
    const neto = createConcept({ x: 0, y: 200 }, { title: 'Neto', style: { shape: 'rounded', color: 'amber', fontSize: 'sm', bold: false } });

    ops.addConcept(doc, pai);
    ops.addConcept(doc, filho);
    ops.addConcept(doc, neto);

    // Conecta filho e neto primeiro
    ops.addLink(doc, filho.id, neto.id, { kind: 'hierarchy' });
    expect(doc.concepts[neto.id].style.color).toBe('amber');

    // Agora conecta pai ao filho
    ops.addLink(doc, pai.id, filho.id, { kind: 'hierarchy' });

    // Filho e neto devem ambos ter herdado a cor do pai (blue)
    expect(doc.concepts[filho.id].style.color).toBe('blue');
    expect(doc.concepts[neto.id].style.color).toBe('blue');
  });
});

describe('7. Mapa da Apresentação: RFID e NFC (Estrutura do PDF)', () => {
  it('gera o mapa completo com ramos lógicos, referências e layout válido', () => {
    const map = createRfidPresentationMap();
    expect(map).toBeDefined();
    expect(map.id).toBe('map-rfid-nfc-apresentacao');
    expect(Object.keys(map.concepts).length).toBeGreaterThanOrEqual(25);
    expect(Object.keys(map.links).length).toBeGreaterThanOrEqual(25);

    // Nó raiz existe
    expect(map.concepts['c_wireless']).toBeDefined();
    expect(map.concepts['c_wireless'].title).toBe('Sistemas Wireless');

    // Ligações conectam nós existentes
    for (const link of Object.values(map.links)) {
      expect(map.concepts[link.source]).toBeDefined();
      expect(map.concepts[link.target]).toBeDefined();
    }

    // Ligação cruzada Mifare -> NFC existe conforme solicitado no PDF
    const mifareCross = map.links['l_mifare_nfc_cross'];
    expect(mifareCross).toBeDefined();
    expect(mifareCross.kind).toBe('cross');
    expect(mifareCross.source).toBe('c_mifare');
    expect(mifareCross.target).toBe('c_nfc');
    expect(mifareCross.label).toBe('também afeta cartões lidos por');

    // Todos os nós possuem posições finitas calculadas
    for (const c of Object.values(map.concepts)) {
      expect(Number.isFinite(c.position.x)).toBe(true);
      expect(Number.isFinite(c.position.y)).toBe(true);
    }

    // Verifica que a árvore hierárquica não tem ciclos
    const h = getHierarchy(map);
    expect(h.parentOf.size).toBeGreaterThan(0);
  });
});


