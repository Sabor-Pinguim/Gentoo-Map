import { createConcept, createLink } from './factory';
import type { MapDoc } from './types';
import { SCHEMA_VERSION } from './types';

export function createSampleMap(): MapDoc {
  const now = Date.now();

  const cAI = createConcept(
    { x: 380, y: 40 },
    {
      title: 'Inteligência Artificial',
      description: 'Campo da ciência da computação dedicado a criar agentes racionais.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'lg', bold: true },
      content: {
        summary: 'Área multidisciplinar que busca desenvolver sistemas capazes de simular o raciocínio humano e resolver problemas complexos.',
        extra: [
          { id: 'ext1', key: 'Área', value: 'Ciência da Computação' },
          { id: 'ext2', key: 'Nível', value: 'Conceito Fundamental' },
        ],
        notesHtml: `
          <h1>Inteligência Artificial: Fundamentos</h1>
          <p>A <strong>Inteligência Artificial (IA)</strong> busca sintetizar e automatizar tarefas intelectuais. Suas raízes remontam à lógica matemática, cibernética e filosofia da mente.</p>
          <h2>Aplicações Práticas</h2>
          <ul>
            <li>Visão computacional e diagnósticos médicos</li>
            <li>Processamento de linguagem natural e tradução</li>
            <li>Sistemas autônomos e robótica inteligente</li>
          </ul>
          <blockquote>“A questão se as máquinas podem pensar é tão relevante quanto se os submarinos podem nadar.” — Edsger W. Dijkstra</blockquote>
        `,
        links: [
          {
            id: 'l1',
            url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
            title: 'Artigo da Wikipedia: Artificial Intelligence',
            description: 'Visão histórica e teórica abrangente da disciplina.',
          },
          {
            id: 'l2',
            url: 'https://plato.stanford.edu/entries/artificial-intelligence/',
            title: 'Stanford Encyclopedia of Philosophy - AI',
            description: 'Abordagem filosófica e conceitual dos fundamentos da inteligência artificial.',
          },
        ],
        images: [
          {
            id: 'img1',
            source: {
              type: 'url',
              url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
            },
            caption: 'Visualização de sinapses e nós de uma rede neural artificial',
            alt: 'Visualização conceitual de inteligência artificial',
          },
        ],
        media: [
          {
            id: 'med1',
            kind: 'video',
            title: 'O que é uma Rede Neural? — 3Blue1Brown',
            source: {
              type: 'url',
              url: 'https://www.youtube.com/watch?v=aircAruvnKk',
            },
          },
        ],
        documents: [],
        references: [
          {
            id: 'ref1',
            title: 'Artificial Intelligence: A Modern Approach',
            author: 'Stuart Russell, Peter Norvig',
            year: '2020',
            source: 'Pearson (4th Edition)',
            notes: 'O principal manual didático de IA utilizado em universidades de todo o mundo.',
          },
          {
            id: 'ref2',
            title: 'Computing Machinery and Intelligence',
            author: 'Alan M. Turing',
            year: '1950',
            source: 'Mind, 59(236), 433-460',
            notes: 'Artigo histórico que propôs o famoso Teste de Turing.',
          },
        ],
      },
    }
  );

  const cML = createConcept(
    { x: 180, y: 220 },
    {
      title: 'Aprendizado de Máquina',
      description: 'Algoritmos que aprendem padrões a partir de dados sem programação explícita.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'md', bold: true },
      content: {
        summary: 'Subcampo da IA focado no desenvolvimento de sistemas que aprendem e melhoram de maneira autônoma com a experiência.',
        extra: [{ id: 'ext3', key: 'Paradigma', value: 'Baseado em dados' }],
        notesHtml: '<p>O <em>Machine Learning</em> substitui regras fixas por <strong>inferência estatística</strong> a partir de dados históricos.</p>',
        links: [
          {
            id: 'l3',
            url: 'https://scikit-learn.org/stable/',
            title: 'Scikit-Learn: Machine Learning em Python',
            description: 'Biblioteca open-source de referência para aprendizado supervisionado e não-supervisionado.',
          },
        ],
        images: [
          {
            id: 'img2',
            source: {
              type: 'url',
              url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80',
            },
            caption: 'Modelos e treinamento de algoritmos de aprendizado de máquina',
            alt: 'Código e matrizes de aprendizado de máquina',
          },
        ],
        media: [],
        documents: [],
        references: [],
      },
    }
  );

  const cNLP = createConcept(
    { x: 580, y: 220 },
    {
      title: 'Processamento de Linguagem Natural',
      description: 'Interação entre computadores e linguagem humana falada ou escrita.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'md', bold: true },
    }
  );

  const cSup = createConcept(
    { x: 60, y: 400 },
    {
      title: 'Aprendizado Supervisionado',
      description: 'Treinamento utilizando pares de entrada e rótulos conhecidos.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'sm', bold: false },
    }
  );

  const cUnsup = createConcept(
    { x: 300, y: 400 },
    {
      title: 'Aprendizado Não Supervisionado',
      description: 'Descoberta de padrões e estruturas intrínsecas em dados não rotulados.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'sm', bold: false },
    }
  );

  const cNN = createConcept(
    { x: 60, y: 560 },
    {
      title: 'Redes Neurais Artificiais',
      description: 'Modelos computacionais inspirados no funcionamento dos neurônios biológicos.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'md', bold: true },
      content: {
        summary: 'Arquiteturas compostas por camadas de nós interconectados com pesos ajustáveis.',
        extra: [],
        notesHtml: '<p>Redes neurais utilizam <strong>backpropagation</strong> e descida do gradiente para minimizar erros.</p>',
        links: [],
        images: [],
        media: [],
        documents: [],
        references: [
          {
            id: 'ref3',
            title: 'Deep Learning',
            author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
            year: '2016',
            source: 'MIT Press',
            notes: 'Referência definitiva sobre teoria e arquiteturas de redes neurais profundas.',
          },
        ],
      },
    }
  );

  const cClust = createConcept(
    { x: 300, y: 560 },
    {
      title: 'Clusterização (Agrupamento)',
      description: 'Divisão de instâncias em grupos coesos por similaridade métrica.',
      style: { shape: 'pill', color: 'blue', fontSize: 'sm', bold: false },
    }
  );

  const cDL = createConcept(
    { x: 260, y: 720 },
    {
      title: 'Deep Learning (Aprendizado Profundo)',
      description: 'Redes neurais com múltiplas camadas ocultas capazes de extrair representações hierárquicas.',
      style: { shape: 'rounded', color: 'blue', fontSize: 'md', bold: true },
      content: {
        summary: 'Redes profundas que extraem representações hierárquicas de dados brutos.',
        extra: [],
        notesHtml: '',
        links: [
          {
            id: 'l4',
            url: 'https://www.deeplearningbook.org/',
            title: 'Deep Learning Book — MIT Press',
            description: 'Livro de referência gratuito para leitura online.',
          },
        ],
        images: [],
        media: [
          {
            id: 'med2',
            kind: 'video',
            title: 'Redes Convolucionais e Deep Learning',
            source: {
              type: 'url',
              url: 'https://www.youtube.com/watch?v=JMUxmLyrhSk',
            },
          },
        ],
        documents: [],
        references: [],
      },
    }
  );

  // Conexões hierárquicas
  const l1 = createLink(cAI.id, cML.id, 'hierarchy', { label: 'engloba métodos de' });
  const l2 = createLink(cAI.id, cNLP.id, 'hierarchy', { label: 'aplica-se em' });
  const l3 = createLink(cML.id, cSup.id, 'hierarchy', { label: 'subdivide-se em' });
  const l4 = createLink(cML.id, cUnsup.id, 'hierarchy', { label: 'subdivide-se em' });
  const l5 = createLink(cSup.id, cNN.id, 'hierarchy', { label: 'utiliza' });
  const l6 = createLink(cUnsup.id, cClust.id, 'hierarchy', { label: 'realiza tarefas de' });
  const l7 = createLink(cNN.id, cDL.id, 'hierarchy', { label: 'evolui para' });

  // Conexão cruzada semântica entre ramos distintos (Cross-links)
  const lCross1 = createLink(cDL.id, cNLP.id, 'cross', {
    label: 'revolucionou através de Transformers',
    style: { line: 'dashed', curve: 'curved', arrow: 'end', color: 'default' },
  });

  const concepts = {
    [cAI.id]: cAI,
    [cML.id]: cML,
    [cNLP.id]: cNLP,
    [cSup.id]: cSup,
    [cUnsup.id]: cUnsup,
    [cNN.id]: cNN,
    [cClust.id]: cClust,
    [cDL.id]: cDL,
  };

  const links = {
    [l1.id]: l1,
    [l2.id]: l2,
    [l3.id]: l3,
    [l4.id]: l4,
    [l5.id]: l5,
    [l6.id]: l6,
    [l7.id]: l7,
    [lCross1.id]: lCross1,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'map_sample_ia',
    name: 'Inteligência Artificial e Aprendizado de Máquina',
    createdAt: now,
    updatedAt: now,
    concepts,
    links,
    settings: { layoutDirection: 'TB' },
  };
}

