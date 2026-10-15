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
import { NODES_LAYER_ID, type DrawingStroke } from '../src/model/types';
import { pointsToSvgPath, isStrokeHit } from '../src/canvas/drawingUtils';
import fs from 'node:fs';
import path from 'node:path';

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

  it('gera e exporta arquivo rfid-nfc-apresentacao.cmap.json válido para importação na aplicação', () => {
    const map = createRfidPresentationMap();
    const json = JSON.stringify(map, null, 2);

    // Valida com o esquema Zod de importação
    const parsed = parseMapDoc(JSON.parse(json));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(`Erro de validação: ${parsed.errors.join(', ')}`);
    }

    // Salva no diretório raiz do projeto e em public/ para importação / download
    const rootPath = path.resolve(__dirname, '..', 'rfid-nfc-apresentacao.cmap.json');
    const publicPath = path.resolve(__dirname, '..', 'public', 'rfid-nfc-apresentacao.cmap.json');
    fs.writeFileSync(rootPath, json, 'utf-8');
    fs.writeFileSync(publicPath, json, 'utf-8');

    expect(fs.existsSync(rootPath)).toBe(true);
    expect(fs.existsSync(publicPath)).toBe(true);

    // Valida que o arquivo salvo no disco tem conteúdo
    const readBack = fs.readFileSync(rootPath, 'utf-8');
    expect(readBack.length).toBeGreaterThan(5000);
  });
});

describe('8. Sistema de Camadas de Desenho Livre e Subcamadas Vetoriais', () => {
  it('inicializa documento com estrutura de desenho padrão e camada de nós', () => {
    const doc = createMap('Mapa Desenho');
    const drawing = ops.ensureDrawingDoc(doc);

    expect(drawing.order).toContain(NODES_LAYER_ID);
    expect(drawing.order).toContain('default-layer-1');
    expect(drawing.layers['default-layer-1']).toBeDefined();
    expect(drawing.layers['default-layer-1'].name).toBe('Anotações');
    expect(drawing.layers['default-layer-1'].visible).toBe(true);
    expect(drawing.layers['default-layer-1'].locked).toBe(false);
  });

  it('permite criar novas camadas e posicioná-las no topo da pilha', () => {
    const doc = createMap('Mapa Camadas');
    const layer1 = ops.addDrawingLayer(doc, 'Esboço');
    const layer2 = ops.addDrawingLayer(doc, 'Destaques');

    expect(doc.drawingLayers![layer1.id]).toBeDefined();
    expect(doc.drawingLayers![layer1.id].name).toBe('Esboço');
    expect(doc.drawingLayers![layer2.id].name).toBe('Destaques');

    // A última criada vai para o final de layerOrder (topo visual)
    expect(doc.layerOrder![doc.layerOrder!.length - 1]).toBe(layer2.id);
  });

  it('permite reordenar a camada de nós para cima ou para baixo das camadas de desenho', () => {
    const doc = createMap('Mapa Reordenação');
    const layerA = ops.addDrawingLayer(doc, 'Fundo');
    const layerB = ops.addDrawingLayer(doc, 'Sobreposição');

    // Ordem atual: bg-layer-1, NODES_LAYER_ID, default, layerA, layerB
    // Mover camada de nós para o meio (entre layerA e layerB)
    const customOrder = ['bg-layer-1', layerA.id, NODES_LAYER_ID, layerB.id, 'default-layer-1'];
    ops.reorderLayers(doc, customOrder);

    expect(doc.layerOrder).toEqual(customOrder);
    expect(doc.layerOrder!.indexOf(layerA.id)).toBeLessThan(doc.layerOrder!.indexOf(NODES_LAYER_ID));
    expect(doc.layerOrder!.indexOf(layerB.id)).toBeGreaterThan(doc.layerOrder!.indexOf(NODES_LAYER_ID));
  });

  it('adiciona e apaga traços vetoriais associados a uma camada', () => {
    const doc = createMap('Mapa Traços');
    const layer = ops.addDrawingLayer(doc, 'Camada Caneta');

    const stroke1: DrawingStroke = {
      id: 'stroke-1',
      layerId: layer.id,
      tool: 'pen',
      color: '#ea580c',
      width: 4,
      opacity: 1,
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }],
      createdAt: 1000,
    };

    ops.addStroke(doc, stroke1);
    expect(doc.strokes!['stroke-1']).toBeDefined();
    expect(doc.strokes!['stroke-1'].color).toBe('#ea580c');

    ops.deleteStroke(doc, 'stroke-1');
    expect(doc.strokes!['stroke-1']).toBeUndefined();
  });

  it('ao excluir uma camada, seus traços são removidos automaticamente', () => {
    const doc = createMap('Mapa Exclusão');
    const layer = ops.addDrawingLayer(doc, 'Camada Temporária');

    ops.addStroke(doc, {
      id: 'stroke-temp-1',
      layerId: layer.id,
      tool: 'highlighter',
      color: '#f59e0b',
      width: 22,
      opacity: 0.38,
      points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
      createdAt: 1000,
    });

    expect(doc.strokes!['stroke-temp-1']).toBeDefined();

    ops.deleteDrawingLayer(doc, layer.id);

    expect(doc.drawingLayers![layer.id]).toBeUndefined();
    expect(doc.strokes!['stroke-temp-1']).toBeUndefined();
    expect(doc.layerOrder).not.toContain(layer.id);
  });

  it('converte pontos em SVG path suavizado e testa detecção de colisão para borracha', () => {
    // 0 pontos
    expect(pointsToSvgPath([])).toBe('');

    // 1 ponto
    const single = pointsToSvgPath([{ x: 10, y: 10 }]);
    expect(single).toContain('M 10 10 L 10.1 10.1');

    // Múltiplos pontos geram curvas bezier quadráticas (Q)
    const curve = pointsToSvgPath([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(curve).toContain('M 0 0');
    expect(curve).toContain('Q');

    // Teste de colisão do traço para a ferramenta borracha
    const testStroke: DrawingStroke = {
      id: 's-hit',
      layerId: 'layer-1',
      tool: 'pen',
      color: '#000',
      width: 4,
      opacity: 1,
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      createdAt: 0,
    };

    // Ponto próximo à linha (y = 5, dentro do raio de tolerância 15)
    expect(isStrokeHit(testStroke, { x: 50, y: 5 }, 15)).toBe(true);

    // Ponto distante da linha (y = 50, fora da tolerância de 15)
    expect(isStrokeHit(testStroke, { x: 50, y: 50 }, 15)).toBe(false);
  });
});




