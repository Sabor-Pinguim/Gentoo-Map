import { SCHEMA_VERSION, type Concept, type ConceptStyle, type ColorKey, type Link, type MapDoc } from './types';
import { computeHierarchicalLayout } from '../layout/hierarchicalLayout';

/**
 * Mapa Conceitual Completo: RFID e NFC
 * Estruturado a partir de:
 * 1. Documento de trabalho de referências (00_referencias_mapa_conceitual_Bru.pdf)
 * 2. Documento conceitual de NFC (Conceito de NFC.docx_20261015_083533_0000.pdf)
 *
 * Divisão entre os 6 apresentadores do seminário (30 minutos).
 */

interface NodeOpts {
  description?: string;
  summary?: string;
  notesHtml?: string;
  speaker?: string;
  minutes?: string;
  links?: { id: string; title: string; url: string; description?: string }[];
  references?: { id: string; title: string; author?: string; year?: string; source?: string; notes?: string }[];
  extra?: { key: string; value: string }[];
}

function makeConcept(
  id: string,
  title: string,
  pos: { x: number; y: number },
  style: ConceptStyle,
  opts: NodeOpts = {}
): Concept {
  const now = Date.now();
  const extraFields = (opts.extra ?? []).map((e, idx) => ({
    id: `ext_${id}_${idx}`,
    key: e.key,
    value: e.value,
  }));

  if (opts.speaker) {
    extraFields.unshift({ id: `ext_spk_${id}`, key: 'Apresentador(a)', value: opts.speaker });
  }
  if (opts.minutes) {
    extraFields.push({ id: `ext_min_${id}`, key: 'Tempo de Fala', value: opts.minutes });
  }

  return {
    id,
    title,
    description: opts.description ?? '',
    position: pos,
    style,
    collapsed: false,
    content: {
      summary: opts.summary ?? '',
      extra: extraFields,
      notesHtml: opts.notesHtml ?? '',
      links: (opts.links ?? []).map((l) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        description: l.description ?? '',
      })),
      images: [],
      media: [],
      documents: [],
      references: (opts.references ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        author: r.author ?? '',
        year: r.year ?? '',
        source: r.source ?? '',
        notes: r.notes ?? '',
      })),
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeLink(
  id: string,
  source: string,
  target: string,
  label: string,
  kind: 'hierarchy' | 'cross' = 'hierarchy',
  color: ColorKey = 'default'
): Link {
  return {
    id,
    source,
    target,
    label,
    kind,
    style: {
      line: kind === 'cross' ? 'dashed' : 'solid',
      curve: 'straight',
      arrow: 'end',
      color,
    },
    createdAt: Date.now(),
  };
}

export function createRfidPresentationMap(): MapDoc {
  const now = Date.now();
  const concepts: Record<string, Concept> = {};
  const links: Record<string, Link> = {};

  const add = (c: Concept) => {
    concepts[c.id] = c;
  };
  const connect = (
    id: string,
    source: string,
    target: string,
    label: string,
    kind: 'hierarchy' | 'cross' = 'hierarchy',
    color: ColorKey = 'default'
  ) => {
    links[id] = makeLink(id, source, target, label, kind, color);
  };

  /* ========================================================================
   * 0. NÓ CENTRAL / RAIZ: Sistemas Wireless (Todos)
   * ======================================================================== */
  add(
    makeConcept(
      'c_wireless',
      'Sistemas Wireless',
      { x: 1200, y: 50 },
      { shape: 'rounded', color: 'violet', fontSize: 'xl', bold: true },
      {
        description: 'Fundamento comum de RFID e NFC baseado na propagação de campos eletromagnéticos.',
        summary: 'Comunicação sem fio por radiofrequência para identificação, sensoriamento e troca de dados sem contato físico direto.',
        speaker: 'Abertura Geral (Todos)',
        minutes: 'Visão Geral (30 min totais)',
        notesHtml: `
          <h2>Sistemas Wireless: RFID e NFC</h2>
          <p>Visão geral de RFID e NFC como tecnologias sem fio complementares para identificação, rastreabilidade e transações por aproximação.</p>
          <h3>Cronograma da Apresentação (30 minutos):</h3>
          <ol>
            <li><strong>Bruna (4,8 min):</strong> Abertura e Aplicações Práticas</li>
            <li><strong>Gabriel (5,1 min):</strong> RFID vs NFC, Comunicação e NFC vs QR Code</li>
            <li><strong>Anna (4,0 min):</strong> Vulnerabilidades do RFID (Mifare Classic, Crypto1)</li>
            <li><strong>Integrante de NFC (4,2 min):</strong> Vulnerabilidades do NFC (Interceptação, Clonagem, Relay, AES)</li>
            <li><strong>Júlio (5,1 min):</strong> Normas, Órgãos Reguladores e Instituições</li>
            <li><strong>João W. (5,8 min):</strong> Notícias, Casos Reais (NGate) e Encerramento</li>
          </ol>
        `,
        links: [
          {
            id: 'l_r37',
            title: 'Atlas RFID Store: RFID versus NFC',
            url: 'https://www.atlasrfidstore.com/rfid-insider/rfid-vs-nfc',
            description: 'Comparativo técnico entre frequências, alcance e modos de operação.',
          },
          {
            id: 'l_r39',
            title: 'RF Wireless World: RFID vs NFC Differences',
            url: 'https://www.rfwireless-world.com/terminology/rfid-vs-nfc-differences',
            description: 'Tabela comparativa de frequência, alcance e taxas de transferência.',
          },
          {
            id: 'l_r44',
            title: 'Wikipedia: Near-field communication (Apoio)',
            url: 'https://en.wikipedia.org/wiki/Near-field_communication',
            description: 'Visão geral enciclopédica com fontes primárias.',
          },
        ],
      }
    )
  );

  /* ========================================================================
   * 1. RAMO APLICAÇÕES (Bruna - 4,8 min) - Cor: Verde
   * ======================================================================== */
  add(
    makeConcept(
      'c_aplicacoes',
      'Aplicações no Mundo Real',
      { x: 300, y: 220 },
      { shape: 'rounded', color: 'green', fontSize: 'lg', bold: true },
      {
        description: 'Cenários práticos de uso e impacto no setor produtivo, financeiro e serviços.',
        summary: 'Adoção massiva de RFID e NFC no varejo, transportes, agronegócio e pagamentos digitais.',
        speaker: 'Bruna',
        minutes: '4,8 minutos',
        notesHtml: `
          <h2>Abertura e Aplicações Práticas</h2>
          <p><strong>Apresentadora:</strong> Bruna (4,8 min)</p>
          <p>Abertura dinâmica situando onde o público encontra essas tecnologias diariamente: etiquetas inteligentes de roupas, pedágios automáticos, crachás e o Pix por aproximação no celular.</p>
        `,
      }
    )
  );
  connect('l_w_app', 'c_wireless', 'c_aplicacoes', 'onde é usado', 'hierarchy', 'green');

  // 1.1 Aplicações RFID
  add(
    makeConcept(
      'c_app_rfid',
      'Aplicações RFID',
      { x: 120, y: 380 },
      { shape: 'rounded', color: 'green', fontSize: 'md', bold: true },
      {
        description: 'Rastreabilidade, logística e automação em larga escala.',
        summary: 'Uso de tags passivas e leitores para controle em massa de itens físicos sem linha de visada.',
        speaker: 'Bruna',
        minutes: '2,4 minutos',
      }
    )
  );
  connect('l_app_rfid', 'c_aplicacoes', 'c_app_rfid', 'abrange na indústria e logística', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_varejo',
      'Varejo e Logística',
      { x: -80, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Controle de estoque em tempo real e inventários rápidos.',
        summary: 'Pesquisa ILOS: RFID está presente na rotina de 42% das empresas brasileiras que rastreiam produtos.',
        speaker: 'Bruna',
        notesHtml: '<p>Casos em supermercados e lojas de vestuário com redução de perdas e contagem de centenas de itens por segundo via leitores portáteis UHF.</p>',
        links: [
          {
            id: 'l_r32',
            title: 'Supervarejo: Tecnologia RFID facilita operação em supermercados',
            url: 'https://supervarejo.com.br/varejo/tecnologia-rfid-facilita-operacao-e-se-torna-aliada-dos-supermercados-entenda-o-que-e',
            description: 'Pesquisa ILOS destacando 42% das empresas rastreadoras.',
          },
          {
            id: 'l_r36',
            title: 'Romero e Bonho: Estudo de viabilidade de leitor RFID UHF portátil (Ilha Digital)',
            url: 'https://ilhadigital.florianopolis.ifsc.edu.br/index.php/ilhadigital/article/download/103/85/369',
            description: 'Contexto brasileiro de adoção de UHF no varejo.',
          },
        ],
      }
    )
  );
  connect('l_rfid_varejo', 'c_app_rfid', 'c_app_varejo', 'utilizado em', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_transporte',
      'Transportes e Pedágios',
      { x: 60, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Cobrança automática em praças de pedágio e identificação de veículos.',
        summary: 'Sistemas Sem Parar e Projeto Brasil ID (Centro Wernher von Braun e ENCAT) para rastreio fiscal e logístico.',
        speaker: 'Bruna',
        links: [
          {
            id: 'l_r33',
            title: 'Contábeis: Tecnologia a serviço da sociedade (Projeto Brasil ID)',
            url: 'https://www.contabeis.com.br/noticias/37777/tecnologia-a-servico-da-sociedade-conheca-o-rfid/',
            description: 'Menciona Sem Parar e infraestrutura de tags automotivas.',
          },
        ],
      }
    )
  );
  connect('l_rfid_transp', 'c_app_rfid', 'c_app_transporte', 'implementado em', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_agro',
      'Pecuária e Rastreio Bovino',
      { x: 200, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Identificação individual de rebanhos via brincos eletrônicos de baixa frequência (LF).',
        summary: 'Atendimento a exigências sanitárias e de exportação de carne bovina no Brasil.',
        speaker: 'Bruna',
        links: [
          {
            id: 'l_r34',
            title: 'Santana et al.: Identificação e Registro de Bovinos via RFID (SBC)',
            url: 'https://sol.sbc.org.br/index.php/erbase/article/download/33897/33688',
            description: 'Artigo científico sobre pecuária de precisão no Brasil.',
          },
        ],
      }
    )
  );
  connect('l_rfid_agro', 'c_app_rfid', 'c_app_agro', 'aplicado em', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_industria',
      'Indústria e Mineração',
      { x: 340, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Automação pesada e rastreamento de ativos sob condições severas.',
        summary: 'Integração com projetos nacionais como o SINIAV e monitoramento de vagões/peças metálicas.',
        speaker: 'Bruna',
        links: [
          {
            id: 'l_r35',
            title: 'Pereira et al.: Automação na indústria metalúrgica e de mineração com RFID (ABM)',
            url: 'https://abmproceedings.com.br/en/article/download-pdf/automacao-na-industria-metalurgica-e-de-mineracao-com-rfid-uma-revisao-integrativa',
            description: 'Menciona SINIAV e faixas de frequências de RFID no Brasil.',
          },
        ],
      }
    )
  );
  connect('l_rfid_ind', 'c_app_rfid', 'c_app_industria', 'opera em', 'hierarchy', 'green');

  // 1.2 Aplicações NFC
  add(
    makeConcept(
      'c_app_nfc',
      'Aplicações NFC',
      { x: 500, y: 380 },
      { shape: 'rounded', color: 'green', fontSize: 'md', bold: true },
      {
        description: 'Interações rápidas de curtíssimo alcance focadas na experiência do usuário.',
        summary: 'Pagamentos por aproximação, bilhetes eletrônicos, controle de acesso e leitura de etiquetas inteligentes.',
        speaker: 'Bruna',
        minutes: '2,4 minutos',
      }
    )
  );
  connect('l_app_nfc', 'c_aplicacoes', 'c_app_nfc', 'abrange no uso pessoal', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_pix',
      'Pix por Aproximação e Carteiras',
      { x: 480, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Inovação do Banco Central para pagamentos instantâneos contactless via smartphone e smartwatch.',
        summary: 'Lançado para carteiras digitais (Google Pay / Apple Pay) com estudos para pagamentos no modo offline sem internet.',
        speaker: 'Bruna',
        links: [
          {
            id: 'l_r30',
            title: 'Poder360: Banco Central lança Pix por aproximação para Google Pay',
            url: 'https://www.poder360.com.br/poder-tech/banco-central-lanca-pix-por-aproximacao-para-google-pay',
          },
          {
            id: 'l_r31',
            title: 'O Povo: Pix sem internet está nos planos do Banco Central',
            url: 'https://opovo.com.br/trends/pix-sem-internet-esta-nos-planos-do-banco-central-mas-funcionalidade-ainda-nao-esta-liberada-para-uso-geral/',
          },
          {
            id: 'l_r50',
            title: 'Space Money: Pix por aproximação passa a valer',
            url: 'https://www.spacemoney.com.br/economia/pix-por-aproximacao-passa-a-valer-na-proxima-semana-veja-o-que-muda/',
          },
        ],
      }
    )
  );
  connect('l_nfc_pix', 'c_app_nfc', 'c_app_pix', 'viabiliza', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_bilhetagem',
      'Bilhetagem de Transporte',
      { x: 620, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Acesso instantâneo a catracas de metrô, ônibus e trens metropolitanos.',
        summary: 'Casos globais clássicos: Oyster Card (Londres), OV-chipkaart (Holanda) e Charlie Card (Boston). Ideia já prevista desde 2006.',
        speaker: 'Bruna',
        links: [
          {
            id: 'l_r4',
            title: 'Secure ID News: Pesquisadores publicam hack do Mifare em transportes',
            url: 'https://www.secureidnews.com/?p=11011',
            description: 'Lista os grandes sistemas de transporte que adotaram a tecnologia.',
          },
        ],
      }
    )
  );
  connect('l_nfc_bilh', 'c_app_nfc', 'c_app_bilhetagem', 'gerencia', 'hierarchy', 'green');

  add(
    makeConcept(
      'c_app_acesso',
      'Controle de Acesso Físico',
      { x: 760, y: 520 },
      { shape: 'rounded', color: 'green', fontSize: 'sm', bold: false },
      {
        description: 'Crachás e credenciais virtuais em smartphones para abertura de portas e catracas.',
        summary: 'Substituição de chaves físicas por autenticação por proximidade em empresas e universidades.',
        speaker: 'Bruna',
        links: [
          {
            id: 'l_r1',
            title: 'Radboud University: Falha de segurança no controle de acesso Mifare Classic',
            url: 'https://sos.cs.ru.nl/applications/rfid/main.html',
          },
        ],
      }
    )
  );
  connect('l_nfc_acesso', 'c_app_nfc', 'c_app_acesso', 'controla', 'hierarchy', 'green');

  /* ========================================================================
   * 2. RAMO TECNOLOGIA RFID & NFC (Gabriel - 5,1 min) - Cores: Azul e Teal
   * ======================================================================== */
  add(
    makeConcept(
      'c_rfid',
      'Tecnologia RFID',
      { x: 1050, y: 220 },
      { shape: 'rounded', color: 'blue', fontSize: 'lg', bold: true },
      {
        description: 'Identificação por Radiofrequência: princípios físicos, bandas de frequência e componentes.',
        summary: 'Tecnologia genérica para identificação de objetos via ondas de rádio em distâncias de centímetros a metros.',
        speaker: 'Gabriel',
        minutes: '5,1 minutos (com NFC)',
        notesHtml: `
          <h2>Diferenças, Comunicação e NFC vs QR Code</h2>
          <p><strong>Apresentador:</strong> Gabriel (5,1 min)</p>
          <p>Apresentar a base física do RFID: o leitor energiza a tag por campo indutivo ou eletromagnético e lê seu identificador único. Explicar as três faixas (LF, HF, UHF) e demonstrar que o NFC é uma especialização de HF a 13.56 MHz.</p>
        `,
      }
    )
  );
  connect('l_w_rfid', 'c_wireless', 'c_rfid', 'compreende como base', 'hierarchy', 'blue');

  // 2.1 Faixas de Frequência RFID
  add(
    makeConcept(
      'c_rfid_freq',
      'Faixas de Frequência RFID',
      { x: 920, y: 380 },
      { shape: 'rounded', color: 'blue', fontSize: 'md', bold: true },
      {
        description: 'Diferenciação por bandas do espectro de radiofrequência.',
        summary: 'LF (125-134 kHz), HF (13.56 MHz) e UHF (860-960 MHz), cada uma com comportamentos físicos e alcances distintos.',
        speaker: 'Gabriel',
        links: [
          {
            id: 'l_r37_freq',
            title: 'Atlas RFID: Frequências LF, HF e UHF',
            url: 'https://www.atlasrfidstore.com/rfid-insider/rfid-vs-nfc',
          },
          {
            id: 'l_r39_freq',
            title: 'RF Wireless World: Tabela Comparativa de Frequências',
            url: 'https://www.rfwireless-world.com/terminology/rfid-vs-nfc-differences',
          },
        ],
      }
    )
  );
  connect('l_rfid_freq', 'c_rfid', 'c_rfid_freq', 'opera nas faixas', 'hierarchy', 'blue');

  add(
    makeConcept(
      'c_freq_lf',
      'LF (125 - 134 kHz)',
      { x: 880, y: 520 },
      { shape: 'rounded', color: 'blue', fontSize: 'sm', bold: false },
      {
        description: 'Baixa Frequência: curto alcance (~10 cm), imune à atenuação por água e tecidos animais.',
        summary: 'Ideal para identificação animal (chips subcutâneos e brincos) e imobilizadores automotivos.',
        speaker: 'Gabriel',
      }
    )
  );
  connect('l_freq_lf', 'c_rfid_freq', 'c_freq_lf', 'faixa', 'hierarchy', 'blue');

  add(
    makeConcept(
      'c_freq_hf',
      'HF (13.56 MHz)',
      { x: 1000, y: 520 },
      { shape: 'rounded', color: 'blue', fontSize: 'sm', bold: false },
      {
        description: 'Alta Frequência: alcance de até 1 metro, base sobre a qual opera o NFC.',
        summary: 'Utilizado em cartões de biblioteca, bilhetagem de transporte e smartcards.',
        speaker: 'Gabriel',
      }
    )
  );
  connect('l_freq_hf', 'c_rfid_freq', 'c_freq_hf', 'faixa', 'hierarchy', 'blue');

  add(
    makeConcept(
      'c_freq_uhf',
      'UHF (860 - 960 MHz)',
      { x: 1120, y: 520 },
      { shape: 'rounded', color: 'blue', fontSize: 'sm', bold: false },
      {
        description: 'Ultra Alta Frequência: longo alcance (até 12 metros) e leitura massiva de centenas de tags por segundo.',
        summary: 'Padrão da indústria e logística mundial (RAIN RFID / EPC Gen2).',
        speaker: 'Gabriel',
        links: [
          {
            id: 'l_r21_uhf',
            title: 'GS1 EPC Gen2 UHF RFID Standard',
            url: 'https://ref.gs1.org/standards/gen2/2.1.0',
          },
        ],
      }
    )
  );
  connect('l_freq_uhf', 'c_rfid_freq', 'c_freq_uhf', 'faixa', 'hierarchy', 'blue');

  // 2.2 Componentes e Antenas
  add(
    makeConcept(
      'c_rfid_comp',
      'Componentes e Antenas',
      { x: 1220, y: 380 },
      { shape: 'rounded', color: 'blue', fontSize: 'md', bold: true },
      {
        description: 'Arquitetura física: Etiquetas, Leitores e Acoplamento Eletromagnético.',
        summary: 'Acoplamento indutivo em campo próximo e retroespalhamento (backscatter) em campo distante.',
        speaker: 'Gabriel',
        notesHtml: `
          <p>Conforme Seção 2.3 do NIST SP 800-98 (Tag Characteristics e Tag-Reader Communication) e livro-texto de Klaus Finkenzeller (RFID Handbook):</p>
          <ul>
            <li><strong>Tags:</strong> Passivas (sem bateria), Semipassivas (bateria só para sensores) e Ativas (transmissor próprio).</li>
            <li><strong>Leitores:</strong> Geram a portadora de RF e processam os dados recebidos.</li>
            <li><strong>Antenas:</strong> Geometria do laço de antena determina o alcance e o acoplamento magnético.</li>
          </ul>
        `,
        links: [
          {
            id: 'l_r6_ant',
            title: 'NIST SP 800-98: Guidelines for Securing RFID Systems (Seção 2.3)',
            url: 'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-98.pdf',
            description: 'Características da etiqueta, comunicação etiqueta-leitor e antenas.',
          },
        ],
        references: [
          {
            id: 'ref_finkenzeller',
            title: 'RFID Handbook: Fundamentals and Applications in Contactless Smart Cards and Identification',
            author: 'Klaus Finkenzeller',
            year: '2010',
            source: 'Wiley (Referência clássica da biblioteca UNISO)',
            notes: 'Acoplamento indutivo, retroespalhamento e cálculo de antenas.',
          },
        ],
      }
    )
  );
  connect('l_rfid_comp', 'c_rfid', 'c_rfid_comp', 'composto por', 'hierarchy', 'blue');

  /* ========================================================================
   * 2.3 CONCEITO COMPLETO DE NFC (CONFORME NOVO PDF: Conceito de NFC.docx)
   * Cor: Teal
   * ======================================================================== */
  add(
    makeConcept(
      'c_nfc',
      'Tecnologia NFC',
      { x: 1450, y: 380 },
      { shape: 'rounded', color: 'teal', fontSize: 'lg', bold: true },
      {
        description: 'Comunicação por Campo de Proximidade (Near Field Communication): tecnologia sem fio de curto alcance.',
        summary: 'Opera a 13,56 MHz por acoplamento indutivo a poucos centímetros. Projetada para trocas rápidas por aproximação sem necessidade de procedimentos complexos de conexão.',
        speaker: 'Gabriel',
        notesHtml: `
          <h2>Conceito de NFC (Near Field Communication)</h2>
          <p><strong>NFC (Comunicação por Campo de Proximidade)</strong> é uma tecnologia de comunicação sem fio de curto alcance que permite a troca de informações entre dispositivos eletrônicos por meio de campos eletromagnéticos.</p>
          <ul>
            <li><strong>Frequência de Operação:</strong> Opera na frequência padrão de <strong>13,56 MHz</strong>.</li>
            <li><strong>Princípio Físico:</strong> Utiliza o <em>acoplamento indutivo</em> entre bobinas/antenas a poucos centímetros de distância.</li>
            <li><strong>Diferencial vs Wi-Fi e Bluetooth:</strong> Desenvolvido para conexões instantâneas por simples aproximação física, dispensando procedimentos manuais de pareamento.</li>
            <li><strong>Dispositivos Passivos:</strong> Suporta comunicação com etiquetas (tags) passivas que não precisam de bateria, sendo energizadas diretamente pelo campo magnético do leitor.</li>
          </ul>
        `,
        links: [
          {
            id: 'l_r24_nfc',
            title: 'Nokia, Philips e Sony fundam o NFC Forum (2004)',
            url: 'https://www.securetechalliance.org/nokia-philips-and-sony-establish-the-near-field-communication-nfc-forum/',
          },
          {
            id: 'l_r23_sony',
            title: 'Sony: About NFC (Normas ISO/IEC 18092, 14443 e FeliCa)',
            url: 'https://www.sony.co.jp/en/Products/felica/NFC',
          },
        ],
      }
    )
  );
  connect('l_rfid_nfc_cross', 'c_rfid', 'c_nfc', 'possui como evolução HF', 'cross', 'teal');

  // 2.3.1 Origem e Linha do Tempo do NFC (novo PDF)
  add(
    makeConcept(
      'c_nfc_origem',
      'Origem e Evolução do NFC',
      { x: 1300, y: 520 },
      { shape: 'rounded', color: 'teal', fontSize: 'sm', bold: false },
      {
        description: 'Histórico da criação nos anos 2000 até a popularização universal nos smartphones.',
        summary: '2002 (Início Sony & Philips) -> 2004 (NFC Forum) -> 2006 (Nokia 6131 NFC) -> 2010+ (Carteiras digitais).',
        speaker: 'Gabriel',
        notesHtml: `
          <h3>Linha do Tempo da Origem do NFC</h3>
          <p>Surgiu no início dos anos 2000 quando <strong>Sony e Philips</strong> buscavam uma maneira simples e rápida de conectar eletrônicos apenas aproximando-os:</p>
          <ul>
            <li><strong>2002 — O início:</strong> Sony e Philips iniciam o desenvolvimento conjunto da tecnologia NFC.</li>
            <li><strong>2004 — Padronização:</strong> Sony, Philips e Nokia fundam o <strong>NFC Forum</strong> para promover a tecnologia e garantir a compatibilidade entre dispositivos.</li>
            <li><strong>2006 — Primeiros celulares:</strong> O <em>Nokia 6131 NFC</em> se torna um dos primeiros celulares comerciais com a tecnologia integrada. Na época já se previa: pagamentos por aproximação, bilhetes eletrônicos, controle de acesso e leitura de tags.</li>
            <li><strong>2010 em diante — Popularização:</strong> O NFC ganha espaço nos smartphones e, posteriormente, nos pagamentos por aproximação e carteiras digitais.</li>
          </ul>
        `,
      }
    )
  );
  connect('l_nfc_origem', 'c_nfc', 'c_nfc_origem', 'linha do tempo', 'hierarchy', 'teal');

  // 2.3.2 Princípio de Funcionamento e Lei de Faraday (novo PDF)
  add(
    makeConcept(
      'c_nfc_funcionamento',
      'Princípio de Funcionamento',
      { x: 1420, y: 520 },
      { shape: 'rounded', color: 'teal', fontSize: 'sm', bold: false },
      {
        description: 'Indução eletromagnética fundamentada na Lei de Faraday em 4 etapas bem definidas.',
        summary: '1. Geração do campo -> 2. Acoplamento indutivo -> 3. Transferência de energia -> 4. Transmissão por modulação.',
        speaker: 'Gabriel',
        notesHtml: `
          <h3>Funcionamento via Indução Eletromagnética (Lei de Faraday)</h3>
          <p>O funcionamento está diretamente relacionado à <strong>Lei de Faraday</strong>, que descreve a tensão induzida pela variação do fluxo magnético:</p>
          <ol>
            <li><strong>Geração do campo magnético:</strong> Uma corrente alternada circula pela antena do leitor, produzindo um campo magnético variável.</li>
            <li><strong>Acoplamento indutivo:</strong> O campo magnético interage com a antena do dispositivo ou tag aproximada.</li>
            <li><strong>Transferência de energia:</strong> A tensão induzida pela variação do fluxo alimenta os circuitos de dispositivos passivos sem necessidade de bateria.</li>
            <li><strong>Transmissão de dados:</strong> As informações são transmitidas através da modulação da amplitude ou fase do sinal eletromagnético.</li>
          </ol>
          <p><em>Divisão de papéis nos smartphones:</em> Bluetooth e Wi-Fi são voltados para arquivos e mídia volumosa; o NFC é dedicado a interações ultrarrápidas de toque, pagamento e identificação.</p>
        `,
      }
    )
  );
  connect('l_nfc_func', 'c_nfc', 'c_nfc_funcionamento', 'opera por', 'hierarchy', 'teal');

  // 2.3.3 Modos de Operação do NFC
  add(
    makeConcept(
      'c_nfc_modos',
      'Modos de Operação NFC',
      { x: 1540, y: 520 },
      { shape: 'rounded', color: 'teal', fontSize: 'sm', bold: false },
      {
        description: 'Três modos padronizados pelo NFC Forum para diferentes cenários de uso.',
        summary: '1. Leitor/Gravador (tags passivas) | 2. Ponto a Ponto (P2P entre dispositivos) | 3. Emulação de Cartão (smartphones virando smartcards).',
        speaker: 'Gabriel',
        links: [
          {
            id: 'l_r45_modos',
            title: 'Nortech Control: 5 Principais Diferenças e Modos do NFC',
            url: 'https://blog.nortechcontrol.com/rfid-vs-nfc',
          },
        ],
      }
    )
  );
  connect('l_nfc_modos', 'c_nfc', 'c_nfc_modos', 'opera em 3 modos', 'hierarchy', 'teal');

  // 2.3.4 Limitações da Tecnologia NFC (novo PDF)
  add(
    makeConcept(
      'c_nfc_limitacoes',
      'Limitações da Tecnologia NFC',
      { x: 1660, y: 520 },
      { shape: 'rounded', color: 'teal', fontSize: 'sm', bold: false },
      {
        description: 'Restrições físicas e operacionais detalhadas no documento técnico de NFC.',
        summary: 'Alcance reduzido (< 10 cm), taxas de transmissão convencionais (106, 212 e 424 kbit/s), interferência metálica e necessidade de protocolos compatíveis.',
        speaker: 'Gabriel',
        notesHtml: `
          <h3>Limitações Físicas e Operacionais do NFC</h3>
          <ul>
            <li><strong>Alcance Reduzido:</strong> Restrito a poucos centímetros (intencional para segurança física, mas restritivo).</li>
            <li><strong>Baixa Velocidade de Transmissão:</strong> Taxas convencionais de <strong>106, 212 e 424 kbit/s</strong>, substancialmente inferiores a Bluetooth e Wi-Fi.</li>
            <li><strong>Compatibilidade Obrigatória:</strong> Ambos os dispositivos devem compartilhar modos de operação e protocolos padronizados.</li>
            <li><strong>Interferências por Materiais Metálicos:</strong> Superfícies condutoras dissipam as linhas de fluxo magnético, exigindo camadas de ferrite para operar em smartphones ou cartões com partes metálicas.</li>
            <li><strong>Posicionamento Espacial:</strong> Desalinhamento entre as antenas pode interromper subitamente a transferência.</li>
          </ul>
        `,
      }
    )
  );
  connect('l_nfc_limit', 'c_nfc', 'c_nfc_limitacoes', 'possui restrições de', 'hierarchy', 'teal');

  // 2.3.5 Comparativo NFC vs QR Code
  add(
    makeConcept(
      'c_nfc_vs_qr',
      'NFC versus QR Code',
      { x: 1780, y: 520 },
      { shape: 'rounded', color: 'teal', fontSize: 'sm', bold: false },
      {
        description: 'Comparativo técnico entre tecnologias concorrentes de interação rápida.',
        summary: 'Linha de visada (QR exige câmera; NFC é por toque), Custo (QR é impresso/grátis; NFC usa chip) e Segurança (Quishing vs Skimming/Relay).',
        speaker: 'Gabriel',
        notesHtml: `
          <h3>NFC vs QR Code: Pontos de Destaque</h3>
          <ul>
            <li><strong>Linha de Visada:</strong> QR Code exige foco da câmera e iluminação adequada; NFC funciona sem alinhamento visual ou iluminação.</li>
            <li><strong>Custo Unitário:</strong> QR Code tem custo marginal zero; tag NFC requer chip de silício e antena condutora.</li>
            <li><strong>Segurança:</strong> Ambos são vulneráveis por padrão sem autenticação. QR Codes sofrem com <em>quishing</em> (adesivos maliciosos sobrepostos) e NFC com interceptação e <em>relay</em>.</li>
          </ul>
        `,
        links: [
          {
            id: 'l_r40_qr',
            title: 'ScanApp: NFC vs QR codes - Which should you use?',
            url: 'https://scanapp.org/blog/2026/06/08/nfc-vs-qr-codes-which-should-you-use.html',
          },
          {
            id: 'l_r41_scite',
            title: 'SciTePress: NFC vs QR Code em Embarque de Voos (2018)',
            url: 'https://scitepress.org/PublishedPapers/2018/90095/pdf/index.html',
          },
          {
            id: 'l_r42_atlas',
            title: 'Atlas RFID: NFC vs QR codes - Tudo o que você precisa saber',
            url: 'https://atlasrfidstore.com/rfid-insider/nfc-vs-qr-codes-everything-you-need-to-know',
          },
          {
            id: 'l_r38_kisi',
            title: 'Kisi: NFC versus RFID technology',
            url: 'https://docs.kisi.io/concepts/nfc_versus_rfid',
          },
        ],
      }
    )
  );
  connect('l_nfc_qr', 'c_nfc', 'c_nfc_vs_qr', 'compara-se com', 'hierarchy', 'teal');

  /* ========================================================================
   * 3. RAMO SEGURANÇA E VULNERABILIDADES (Anna & NFC - 8,2 min) - Laranja/Âmbar
   * ======================================================================== */
  add(
    makeConcept(
      'c_seguranca',
      'Vulnerabilidades e Segurança',
      { x: 2150, y: 220 },
      { shape: 'rounded', color: 'amber', fontSize: 'lg', bold: true },
      {
        description: 'Enquadramento geral de riscos, falhas de criptografia e ataques ao canal de rádio.',
        summary: 'A proximidade física NÃO garante segurança por si só. Vulnerabilidades comprometem confidencialidade, autenticidade e integridade.',
        speaker: 'Anna & Integrante de NFC',
        minutes: '8,2 minutos no total',
        notesHtml: `
          <h2>Segurança em Sistemas de Proximidade</h2>
          <p>O mito de que o curto alcance físico do RFID/NFC garante segurança por si só é refutado pela literatura científica.</p>
          <p>Dividido entre vulnerabilidades de hardware/etiquetas em RFID (Anna, 4,0 min) e ataques ao canal e segurança lógica em NFC (Integrante de NFC, 4,2 min).</p>
        `,
        links: [
          {
            id: 'l_r6_sec',
            title: 'NIST SP 800-98: Capítulo 3 - Ameaças e Riscos em RFID',
            url: 'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-98.pdf',
          },
          {
            id: 'l_r9_survey',
            title: 'Survey on Security of Electronic Payment Systems (arXiv 1701.04556, Seção 9.1)',
            url: 'https://arxiv.org/pdf/1701.04556',
            description: 'Organização das vulnerabilidades de interface de rádio e elemento seguro.',
          },
          {
            id: 'l_r46_risks',
            title: 'iTechGuides: 10 Biggest RFID Security Risks (Resumo NIST)',
            url: 'https://www.itechguides.com/what-are-the-10-biggest-rfid-security-risks/',
          },
        ],
      }
    )
  );
  connect('l_w_sec', 'c_wireless', 'c_seguranca', 'apresenta riscos de', 'hierarchy', 'amber');

  // 3.1 Vulnerabilidades RFID (Anna - 4,0 min)
  add(
    makeConcept(
      'c_vuln_rfid',
      'Vulnerabilidades RFID',
      { x: 1950, y: 380 },
      { shape: 'rounded', color: 'amber', fontSize: 'md', bold: true },
      {
        description: 'Quebra de cifras legadas, clonagem de tags e defesas físicas/lógicas.',
        summary: 'Ataque histórico ao Mifare Classic (Crypto1), falsificação de identificadores e medidas de mitigação.',
        speaker: 'Anna',
        minutes: '4,0 minutos',
      }
    )
  );
  connect('l_sec_rfid', 'c_seguranca', 'c_vuln_rfid', 'ameaças em', 'hierarchy', 'amber');

  add(
    makeConcept(
      'c_mifare',
      'Caso Mifare Classic & Crypto1',
      { x: 1880, y: 520 },
      { shape: 'rounded', color: 'amber', fontSize: 'sm', bold: false },
      {
        description: 'A quebra emblemática da cifra proprietária Crypto1 da NXP por pesquisadores holandeses.',
        summary: 'Pesquisa da Radboud University demonstrou clonagem em segundos de cartões Oyster de Londres e transporte holandês.',
        speaker: 'Anna',
        notesHtml: `
          <h3>O Marco da Quebra do Mifare Classic (2008)</h3>
          <p>Garcia et al. (ESORICS 2008) realizaram engenharia reversa do chip e quebraram o gerador pseudoaleatório e a cifra proprietária Crypto1 de 48 bits.</p>
          <p>Mais de 1 bilhão de cartões em uso tornaram-se vulneráveis a clonagem e manipulação de saldo. A NXP tentou impedir a publicação por via judicial (Secure ID News, jul/2008), mas a justiça holandesa liberou a divulgação em nome da segurança pública. Isso forçou a adoção do <strong>Mifare Plus (AES)</strong> e do <strong>DESFire</strong>.</p>
        `,
        links: [
          {
            id: 'l_r1_mif',
            title: 'Radboud University: Demonstração em vídeo do ataque ao Mifare Classic',
            url: 'https://sos.cs.ru.nl/applications/rfid/main.html',
          },
          {
            id: 'l_r2_paper',
            title: 'Garcia et al.: Dismantling MIFARE Classic (ESORICS 2008)',
            url: 'https://sos.cs.ru.nl/applications/rfid/2008-esorics.pdf',
          },
          {
            id: 'l_r3_reg',
            title: 'The Register: Boffins publish hack for world\'s most popular smartcard',
            url: 'https://www.theregister.com/2008/10/06/mifare_hack_finally_published/',
          },
          {
            id: 'l_r5_nxp',
            title: 'Secure ID News: NXP processa pesquisadores para impedir divulgação',
            url: 'https://www.secureidnews.com/?p=5480',
          },
        ],
      }
    )
  );
  connect('l_rfid_mifare', 'c_vuln_rfid', 'c_mifare', 'caso emblemático', 'hierarchy', 'amber');

  // LIGAÇÃO CRUZADA SOLICITADA PELO PDF (PÁG 12): Mifare Classic -> também afeta cartões lidos por -> NFC
  connect('l_mifare_nfc_cross', 'c_mifare', 'c_nfc', 'também afeta cartões lidos por', 'cross', 'amber');

  add(
    makeConcept(
      'c_rfid_ameacas',
      'Clonagem e Rastreamento',
      { x: 1990, y: 520 },
      { shape: 'rounded', color: 'amber', fontSize: 'sm', bold: false },
      {
        description: 'Leitura não autorizada de UIDs estáticos, replicação de tags e espionagem de localização.',
        summary: 'Tags passivas simples transmitem seus dados a qualquer leitor compatível que as energize.',
        speaker: 'Anna',
        links: [
          {
            id: 'l_r47_geo',
            title: 'geosurge: RFID Security and Privacy Risks (Skimming and Cloning)',
            url: 'https://www.geosurge.ai/corpus/gen-4112/radio-frequency-identification/rfid-security-and-privacy-risks-skimming-cloning-and-mitigation-strategies.html',
          },
        ],
      }
    )
  );
  connect('l_rfid_ameacas', 'c_vuln_rfid', 'c_rfid_ameacas', 'inclui riscos de', 'hierarchy', 'amber');

  add(
    makeConcept(
      'c_rfid_defesas',
      'Defesas e Contramedidas RFID',
      { x: 2100, y: 520 },
      { shape: 'rounded', color: 'amber', fontSize: 'sm', bold: false },
      {
        description: 'Técnicas de proteção recomendadas por normas governamentais e acadêmicas.',
        summary: 'Comandos Kill e Sleep, Gaiola de Faraday (carteiras blindadas), Blocker tags e pseudônimos dinâmicos.',
        speaker: 'Anna',
        links: [
          {
            id: 'l_r7_nist',
            title: 'NIST: Guidelines for Ensuring RFID Security (Blindagem e Auditoria)',
            url: 'https://nist.gov/news-events/news/2007/04/nist-issues-guidelines-ensuring-rfid-security',
          },
          {
            id: 'l_r8_arxiv',
            title: 'RFID Exploitation and Countermeasures (arXiv 2110.00094)',
            url: 'https://arxiv.org/pdf/2110.00094',
            description: 'Catálogo de defesas: kill, sleep, gaiola de Faraday, blocker tags e pseudônimos.',
          },
        ],
      }
    )
  );
  connect('l_rfid_defesas', 'c_vuln_rfid', 'c_rfid_defesas', 'mitigado por', 'hierarchy', 'amber');

  /* ========================================================================
   * 3.2 SEGURANÇA E VULNERABILIDADES NFC (CONFORME NOVO PDF: Conceito de NFC)
   * Cor: Laranja
   * ======================================================================== */
  add(
    makeConcept(
      'c_vuln_nfc',
      'Segurança e Vulnerabilidades NFC',
      { x: 2360, y: 380 },
      { shape: 'rounded', color: 'orange', fontSize: 'md', bold: true },
      {
        description: 'Pilares de segurança, interceptação de dados, clonagem de tags e ataques de retransmissão.',
        summary: 'A proximidade não garante segurança por si só. Quatro principais ameaças: interceptação, clonagem, retransmissão e falsificação.',
        speaker: 'Integrante de NFC',
        minutes: '4,2 minutos',
        notesHtml: `
          <h2>Segurança e Principais Vulnerabilidades do NFC</h2>
          <p>Embora opere a curtas distâncias e suporte criptografia, o NFC apresenta vulnerabilidades que comprometem confidencialidade, autenticidade e integridade.</p>
          <p><strong>Quatro Principais Ameaças:</strong></p>
          <ol>
            <li><strong>Interceptação de dados:</strong> Captação dos sinais de RF a distâncias maiores.</li>
            <li><strong>Clonagem de tags:</strong> Cópia de informações em tags sem criptografia.</li>
            <li><strong>Ataques de retransmissão:</strong> Repasse em tempo real por dispositivos intermediários.</li>
            <li><strong>Falsificação (Spoofing / Adulteração):</strong> Alteração de credenciais e dados transmitidos.</li>
          </ol>
        `,
      }
    )
  );
  connect('l_sec_nfc', 'c_seguranca', 'c_vuln_nfc', 'ameaças em', 'hierarchy', 'orange');

  // 3.2.1 Mecanismos de Proteção NFC (novo PDF)
  add(
    makeConcept(
      'c_nfc_mecanismos_seg',
      'Mecanismos de Proteção NFC',
      { x: 2220, y: 520 },
      { shape: 'rounded', color: 'orange', fontSize: 'sm', bold: false },
      {
        description: 'Três mecanismos fundamentais utilizados para proteger as informações transmitidas.',
        summary: 'Autenticação (legitimidade), Criptografia AES (leitura não autorizada) e Integridade (alterações). Limitação: nem todo NFC os utiliza!',
        speaker: 'Integrante de NFC',
        notesHtml: `
          <h3>Mecanismos Fundamentais de Segurança no NFC</h3>
          <ul>
            <li><strong>Autenticação:</strong> Verifica a identidade ou a legitimidade dos participantes antes da transação.</li>
            <li><strong>Criptografia:</strong> Protege informações sensíveis contra leitura não autorizada, com destaque para o algoritmo simétrico <strong>AES (Advanced Encryption Standard)</strong>.</li>
            <li><strong>Integridade:</strong> Permite identificar alterações não autorizadas nos dados transmitidos durante a comunicação.</li>
            <li><strong>Limitação Importante:</strong> Nem toda comunicação NFC utiliza esses mecanismos de proteção por padrão, tornando essencial a segurança na camada de aplicação.</li>
          </ul>
        `,
      }
    )
  );
  connect('l_nfc_mecanismos', 'c_vuln_nfc', 'c_nfc_mecanismos_seg', 'protegido por', 'hierarchy', 'orange');

  // 3.2.2 Interceptação de Dados (novo PDF)
  add(
    makeConcept(
      'c_nfc_interceptacao',
      'Interceptação de Dados',
      { x: 2340, y: 520 },
      { shape: 'rounded', color: 'orange', fontSize: 'sm', bold: false },
      {
        description: 'Captação indevida dos sinais eletromagnéticos gerados durante a comunicação.',
        summary: 'Embora projetado para poucos centímetros, antenas direcionais sensíveis conseguem captar sinais a distâncias maiores. Mitigado por criptografia e redução de exposição.',
        speaker: 'Integrante de NFC',
        notesHtml: `
          <h3>Interceptação de Dados (Eavesdropping)</h3>
          <p>Ocorre quando um terceiro utiliza equipamentos capazes de captar os sinais eletromagnéticos gerados durante a comunicação NFC.</p>
          <p><strong>Exemplo prático:</strong> Uma pessoa utiliza um cartão NFC em um leitor. Um atacante próximo tenta captar os sinais transmitidos para obter informações da comunicação e analisar as mensagens.</p>
          <p><strong>Proteção:</strong> Criptografia forte (AES), autenticação mútua e redução da exposição desnecessária de dados sensíveis no enlace.</p>
        `,
        links: [
          {
            id: 'l_r10_jensen',
            title: 'Jensen, Gouda e Qiu: A Secure Credit Card Protocol over NFC (ICDCN 2016)',
            url: 'https://www.cs.utexas.edu/~ojensen/papers/icdcn16.pdf',
            description: 'Canal NFC opera em texto claro por padrão.',
          },
        ],
      }
    )
  );
  connect('l_nfc_intercep', 'c_vuln_nfc', 'c_nfc_interceptacao', 'vulnerável a', 'hierarchy', 'orange');

  // 3.2.3 Clonagem de Tags NFC (novo PDF)
  add(
    makeConcept(
      'c_nfc_clonagem',
      'Clonagem de Tags NFC',
      { x: 2460, y: 520 },
      { shape: 'rounded', color: 'orange', fontSize: 'sm', bold: false },
      {
        description: 'Cópia das informações de uma tag NFC para reprodução em outra etiqueta ou dispositivo.',
        summary: 'Ocorre em sistemas que usam identificadores fixos sem criptografia. Proteção: autenticação criptográfica e identificadores dinâmicos.',
        speaker: 'Integrante de NFC',
        notesHtml: `
          <h3>Clonagem de Tags NFC</h3>
          <p>Consiste em copiar as informações armazenadas em uma tag NFC e reproduzi-las em outra etiqueta ou dispositivo compatível. Essa falha ocorre principalmente quando sistemas utilizam identificadores fixos (UIDs) sem proteção criptográfica.</p>
          <p><strong>Exemplo prático:</strong> Uma empresa utiliza tags NFC simples para controlar o acesso a salas. Um invasor copia os dados da etiqueta e cria um clone para obter acesso não autorizado.</p>
          <p><strong>Proteção:</strong> Autenticação criptográfica com chaves secretas, identificadores dinâmicos (tokens temporários) e validação pelo servidor central.</p>
        `,
      }
    )
  );
  connect('l_nfc_clona', 'c_vuln_nfc', 'c_nfc_clonagem', 'vulnerável a', 'hierarchy', 'orange');

  // 3.2.4 Ataques de Retransmissão / Relay (novo PDF)
  add(
    makeConcept(
      'c_nfc_relay',
      'Ataques de Retransmissão (Relay)',
      { x: 2580, y: 520 },
      { shape: 'rounded', color: 'orange', fontSize: 'sm', bold: false },
      {
        description: 'Transmissão em tempo real de mensagens entre equipamentos NFC fisicamente distantes via dispositivos intermediários.',
        summary: 'Não exige necessariamente a quebra de criptografia, pois as mensagens legítimas são retransmitidas em tempo real.',
        speaker: 'Integrante de NFC',
        notesHtml: `
          <h3>Ataques de Retransmissão (Relay Attack)</h3>
          <p>O invasor utiliza dispositivos intermediários para retransmitir, em tempo real, as mensagens entre dois equipamentos NFC distantes. O sistema interpreta que estão próximos quando não estão.</p>
          <p><strong>Ponto crítico:</strong> Esse ataque <em>não exige a quebra da criptografia</em>, pois as mensagens legítimas são apenas retransmitidas.</p>
          <p><strong>Exemplo prático:</strong> Um atacante posiciona um aparelho próximo do cartão da vítima no transporte público e outro cúmplice aproxima seu smartphone de um leitor comercial ou caixa eletrônico.</p>
          <p><strong>Proteção:</strong> Mecanismos de verificação estrita de proximidade (<em>distance bounding</em>), medição de tempo de resposta em nanossegundos e autenticação biométrica adicional no smartphone.</p>
        `,
        links: [
          {
            id: 'l_r11_kent',
            title: 'Univ. of Kent (TR1332): Ataques a Pagamentos NFC (Skimming, PIN e Relay)',
            url: 'https://www.cs.kent.ac.uk/people/staff/ba284/Papers/TR1332.pdf',
          },
          {
            id: 'l_r13_hitb',
            title: 'Rodriguez e Vila: Relay Attacks in EMV Cards with Android OTS Devices (HITB 2015)',
            url: 'https://archive.conference.hitb.org/hitbsecconf2015ams/wp-content/uploads/2014/12/D1T1-R.-Rodriguez-P.-Vila-Relay-Attacks-in-EMV-Contactless-Cards-with-Android-OTS-Devices.pdf',
          },
          {
            id: 'l_r14_troop',
            title: 'TROOPERS18: NFC Payments - The Art of Relay & Replay Attacks',
            url: 'https://infocondb.org/con/troopers/troopers18/nfc-payments-the-art-of-relay-replay-attacks',
          },
        ],
      }
    )
  );
  connect('l_nfc_relay', 'c_vuln_nfc', 'c_nfc_relay', 'vulnerável a', 'hierarchy', 'orange');

  // 3.2.5 Falhas em Smartphones e SO
  add(
    makeConcept(
      'c_nfc_falhas_so',
      'Falhas em Smartphones e SO',
      { x: 2700, y: 520 },
      { shape: 'rounded', color: 'orange', fontSize: 'sm', bold: false },
      {
        description: 'Brechas de implementação no subsistema NFC em plataformas móveis.',
        summary: 'Pesquisa da Univ. de Twente apontando NFC ativo com tela desligada em Android, e ações de trojans bancários.',
        speaker: 'Integrante de NFC',
        links: [
          {
            id: 'l_r12_twente',
            title: 'Kumar (2015): Security Analysis of Mobile Payment Systems (Univ. de Twente)',
            url: 'https://purl.utwente.nl/essays/67737',
          },
          {
            id: 'l_r48_defense',
            title: 'eSecurity Planet: Medidas de proteção ao usuário contra malwares NFC',
            url: 'https://www.esecurityplanet.com/threats/news-ngate-malware-poland-atm/',
          },
        ],
      }
    )
  );
  connect('l_nfc_so', 'c_vuln_nfc', 'c_nfc_falhas_so', 'agravado por', 'hierarchy', 'orange');

  /* ========================================================================
   * 4. RAMO NOTÍCIAS E CASOS REAIS (João W. - 5,8 min) - Cor: Rosa
   * ======================================================================== */
  add(
    makeConcept(
      'c_noticias',
      'Notícias e Casos Reais',
      { x: 2850, y: 380 },
      { shape: 'rounded', color: 'pink', fontSize: 'md', bold: true },
      {
        description: 'Incidentes cibernéticos recentes, golpes bancários e dados de mercado em 2026.',
        summary: 'Ameaças emergentes como o trojan NGate no Brasil, alta de ataques em Android e evolução do Pix por aproximação.',
        speaker: 'João W.',
        minutes: '5,8 minutos (Encerramento)',
        notesHtml: `
          <h2>Notícias e Casos Reais: Conexão com o Presente</h2>
          <p><strong>Apresentador:</strong> João W. (5,8 min)</p>
          <p>Conectar todo o conteúdo técnico a notícias reais do Brasil e do mundo, mostrando que a vulnerabilidade de relay deixou de ser teórica e virou arma de quadrilhas de malware bancário.</p>
        `,
      }
    )
  );
  connect('l_sec_noticias', 'c_seguranca', 'c_noticias', 'casos recentes de', 'hierarchy', 'pink');

  add(
    makeConcept(
      'c_ngate',
      'Malware NGate no Brasil',
      { x: 2800, y: 520 },
      { shape: 'rounded', color: 'pink', fontSize: 'sm', bold: false },
      {
        description: 'Trojan bancário para Android que usa a ferramenta NFCGate para relay de cartões físicos.',
        summary: 'Campanha no Brasil disfarçada no app falso HandyPay, com phishing via WhatsApp prometendo raspadinha da Caixa.',
        speaker: 'João W.',
        notesHtml: `
          <h3>A Campanha do NGate no Brasil (2024 - 2026)</h3>
          <ul>
            <li>Descoberto pela <strong>ESET Research</strong> na Tchéquia e Polônia, reaparecendo no Brasil.</li>
            <li>O aplicativo malicioso <em>HandyPay</em> induz a vítima a encostar seu cartão de débito/crédito na traseira do smartphone.</li>
            <li>O tráfego NFC é interceptado pela biblioteca <strong>NFCGate</strong> e enviado a um criminoso que emula o cartão em um caixa eletrônico (ATM) para efetuar saques.</li>
            <li>Classificado pelo <strong>MITRE ATT&CK</strong> como software <strong>S9040</strong>.</li>
          </ul>
        `,
        links: [
          {
            id: 'l_r15_eset',
            title: 'ESET Research: Descoberta original do malware NGate',
            url: 'https://www.eset.com/us/about/newsroom/research/eset-research-discovers-ngate-android-malware-which-relays-nfc-traffic-to-steal-victims-cash-from-atms-1/',
          },
          {
            id: 'l_r16_wls',
            title: 'WeLiveSecurity: NGate reaparece no Brasil com app fraudulento HandyPay',
            url: 'https://welivesecurity.com/pt/pesquisas/ngate-reaparece-no-brasil-com-campanha-de-fraude-nfc-por-meio-do-app-handypay',
          },
          {
            id: 'l_r17_ai',
            title: 'ESET: Novo NGate esconde-se em app de pagamento, indícios de uso de IA generativa',
            url: 'https://eset.com/us/about/newsroom/research/eset-research-ngate-hides-nfc-payment-app-ai',
          },
          {
            id: 'l_r18_em',
            title: 'Estado de Minas: Nova versão do malware NGate atinge usuários no Brasil',
            url: 'https://www.em.com.br/mundo-corporativo/2026/04/7404176-nova-versao-do-malware-ngate-atinge-usuarios-no-brasil.html',
          },
          {
            id: 'l_r19_mitre',
            title: 'MITRE ATT&CK: Ficha Técnica do NGate (S9040)',
            url: 'https://attack.mitre.org/software/S9040/',
          },
          {
            id: 'l_r49_help',
            title: 'Help Net Security: NGate atinge usuários no Brasil',
            url: 'https://www.helpnetsecurity.com/?p=367016',
          },
        ],
      }
    )
  );
  connect('l_not_ngate', 'c_noticias', 'c_ngate', 'destaque', 'hierarchy', 'pink');

  add(
    makeConcept(
      'c_kaspersky',
      'Salto de 188% em Ataques Android',
      { x: 2920, y: 520 },
      { shape: 'rounded', color: 'pink', fontSize: 'sm', bold: false },
      {
        description: 'Relatório da Kaspersky (maio/2026) apontando disparo nos ataques a módulos NFC em smartphones.',
        summary: 'Crescimento exponencial de ferramentas que tentam burlar autenticações biométricas e capturar credenciais.',
        speaker: 'João W.',
        links: [
          {
            id: 'l_r20_kasp',
            title: 'Malaysian Wireless: Kaspersky - NFC attacks on Android surged 188%',
            url: 'https://www.malaysianwireless.com/2026/05/kaspersky-android-nfc-attacks-2026/',
          },
        ],
      }
    )
  );
  connect('l_not_kasp', 'c_noticias', 'c_kaspersky', 'alerta', 'hierarchy', 'pink');

  /* ========================================================================
   * 5. RAMO NORMAS, INSTITUIÇÕES E REGULAÇÃO (Júlio - 5,1 min) - Cor: Slate
   * ======================================================================== */
  add(
    makeConcept(
      'c_regulacao',
      'Normas e Instituições',
      { x: 3200, y: 220 },
      { shape: 'rounded', color: 'slate', fontSize: 'lg', bold: true },
      {
        description: 'Três camadas: Protocolos Internacionais, Padronização Industrial e Espectro Governamental.',
        summary: 'Estrutura legal e técnica que garante interoperabilidade e limites de potência de radiofrequência.',
        speaker: 'Júlio',
        minutes: '5,1 minutos',
        notesHtml: `
          <h2>Normas, Instituições e Órgãos Reguladores</h2>
          <p><strong>Apresentador:</strong> Júlio (5,1 min)</p>
          <p>Apresentar a regulação em 3 camadas claras:</p>
          <ol>
            <li><strong>Protocolos de Comunicação:</strong> Famílias ISO/IEC (18000, 14443, 15693, 18092).</li>
            <li><strong>Padronização de Dados e Indústria:</strong> GS1, RAIN RFID Alliance e NFC Forum (atenção: entidades privadas de padronização, não agências reguladoras estatais).</li>
            <li><strong>Gestão de Espectro e Potência:</strong> Anatel (Brasil), FCC (EUA), ETSI (UE) e ITU (ONU).</li>
          </ol>
        `,
      }
    )
  );
  connect('l_w_reg', 'c_wireless', 'c_regulacao', 'regulamentado por', 'hierarchy', 'slate');

  // 5.1 Camada ISOs
  add(
    makeConcept(
      'c_normas_iso',
      'Normas ISO/IEC',
      { x: 3080, y: 380 },
      { shape: 'rounded', color: 'slate', fontSize: 'md', bold: true },
      {
        description: 'Padrões técnicos fundamentais de interface de rádio.',
        summary: 'ISO 18000-63 (UHF Gen2), ISO 14443 (Smartcards HF), ISO 15693 (Vizinhança) e ISO 18092/21481 (NFCIP).',
        speaker: 'Júlio',
        links: [
          {
            id: 'l_r21_iso',
            title: 'GS1: EPC Gen2 harmonizado com ISO/IEC 18000-63',
            url: 'https://ref.gs1.org/standards/gen2/2.1.0',
          },
          {
            id: 'l_r23_iso',
            title: 'Sony: Visão das Normas ISO/IEC 18092, 21481, 14443 e 15693',
            url: 'https://www.sony.co.jp/en/Products/felica/NFC',
          },
        ],
      }
    )
  );
  connect('l_reg_iso', 'c_regulacao', 'c_normas_iso', 'define protocolos em', 'hierarchy', 'slate');

  // 5.2 Camada Indústria
  add(
    makeConcept(
      'c_entidades_ind',
      'Entidades e Alianças',
      { x: 3200, y: 380 },
      { shape: 'rounded', color: 'slate', fontSize: 'md', bold: true },
      {
        description: 'Organizações globais de padronização setorial e certificação.',
        summary: 'GS1 (identificação e EPC), RAIN RFID (marca industrial UHF) e NFC Forum (ecossistema de proximidade).',
        speaker: 'Júlio',
        notesHtml: '<p><em>Observação crítica:</em> Tratam-se de associações da indústria e de padronização técnica, e não de órgãos reguladores estatais com poder de polícia.</p>',
        links: [
          {
            id: 'l_r22_rain',
            title: 'RAIN RFID Alliance FAQ (Marca para UHF Passivo ISO 18000-63)',
            url: 'https://rainrfid.org/faqs/',
          },
          {
            id: 'l_r24_forum',
            title: 'NFC Forum: Fundação por Sony, Nokia e Philips',
            url: 'https://www.securetechalliance.org/nokia-philips-and-sony-establish-the-near-field-communication-nfc-forum/',
          },
        ],
      }
    )
  );
  connect('l_reg_ind', 'c_regulacao', 'c_entidades_ind', 'padronizado por', 'hierarchy', 'slate');

  // 5.3 Camada Espectro e Órgãos Estatais
  add(
    makeConcept(
      'c_orgaos_espectro',
      'Órgãos de Espectro',
      { x: 3340, y: 380 },
      { shape: 'rounded', color: 'slate', fontSize: 'md', bold: true },
      {
        description: 'Agências governamentais responsáveis pela destinação de frequências e homologação de potência.',
        summary: 'Anatel (Brasil - 915 a 928 MHz), FCC (EUA - 902 a 928 MHz), ETSI (UE - 865 a 868 MHz) e ITU (ONU).',
        speaker: 'Júlio',
        links: [
          {
            id: 'l_r28_anatel',
            title: 'IB Lenhardt: Requisitos da Anatel (Ato 1379/2019 e Resolução 680/2017)',
            url: 'https://ib-lenhardt.com/de/news/technical-requirements-of-restricted-radio-communication-devices',
          },
          {
            id: 'l_r29_homolog',
            title: 'Certificado de Homologação Anatel (Exemplo Pepperl+Fuchs)',
            url: 'https://files.pepperl-fuchs.com/webcat/navi/productInfo/cert/cert4842b.pdf',
            description: 'Ilustração prática da categoria Transceptor de Radiação Restrita.',
          },
          {
            id: 'l_r26_etsi',
            title: 'ETSI EN 302 208: Regulamentação de RFID na Europa',
            url: 'https://standards.globalspec.com/std/10060367/en-302-208',
          },
          {
            id: 'l_r27_fcc',
            title: 'rfid4u: Regulamentações da FCC Parte 15 e ETSI',
            url: 'https://rfid4u.com/rfid-regulations/',
          },
        ],
      }
    )
  );
  connect('l_reg_espectro', 'c_regulacao', 'c_orgaos_espectro', 'fiscalizado por', 'hierarchy', 'slate');

  /* ========================================================================
   * CÁLCULO DE LAYOUT HIERÁRQUICO VIA DAGRE
   * ======================================================================== */
  const doc: MapDoc = {
    schemaVersion: SCHEMA_VERSION,
    id: 'map-rfid-nfc-apresentacao',
    name: 'RFID e NFC: Sistemas Wireless, Segurança e Aplicações',
    createdAt: now,
    updatedAt: now,
    concepts,
    links,
    settings: { layoutDirection: 'TB' },
  };

  try {
    const layout = computeHierarchicalLayout(
      doc,
      (id) => {
        const c = doc.concepts[id];
        const isRoot = c.id === 'c_wireless';
        const isL1 = ['c_aplicacoes', 'c_rfid', 'c_seguranca', 'c_regulacao'].includes(c.id);
        const w = isRoot ? 260 : isL1 ? 220 : 190;
        const h = isRoot ? 64 : isL1 ? 56 : 50;
        return { width: w, height: h };
      },
      {
        direction: 'TB',
        nodeSep: 60,
        rankSep: 95,
      }
    );

    for (const [id, pos] of Object.entries(layout)) {
      if (doc.concepts[id]) {
        doc.concepts[id].position = pos;
      }
    }
  } catch (err) {
    console.error('Erro ao calcular layout hierárquico inicial do mapa RFID/NFC:', err);
  }

  return doc;
}
