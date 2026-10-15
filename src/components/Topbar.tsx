import { useState, useEffect } from 'react';
import {
  Folder,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Undo2,
  Redo2,
  Search,
  Download,
  Database,
  Keyboard,
  Sun,
  Moon,
  Laptop,
  PanelRight,
  Maximize2,
  Plus,
  GitBranch,
  Sparkles,
  ArrowRight,
  ChevronDown,
  MousePointer,
  Hand,
  Pen,
  Highlighter,
  Eraser,
  Image as ImageIcon,
  FileText,
  FileCode,
  FileArchive,
  FileJson,
  Upload,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import {
  addConceptAt,
  addChild,
  autoLayout,
  fitView,
  redo,
  startConnectMode,
  undo,
} from '../state/actions';
import { renameMap, retrySave } from '../state/session';
import { IconButton, Tooltip } from './ui';
import { GentooLogo } from './GentooLogo';
import { LayersPopover } from './LayersPopover';
import { DrawingStylePopover } from './DrawingStylePopover';
import {
  exportMapPng,
  exportMapPdf,
  exportMapSvg,
  exportBackupZip,
  exportMapJson,
} from '../io/export';
import { getFlowContainer } from '../canvas/flowApi';

export function Topbar() {
  const doc = useEditor((s) => s.doc);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const saveStatus = useEditor((s) => s.saveStatus);
  const saveError = useEditor((s) => s.saveError);
  const selectedNodes = useEditor((s) => s.selectedNodes);

  const panelOpen = useUI((s) => s.panelOpen);
  const theme = useUI((s) => s.theme);
  const connectMode = useUI((s) => s.connectMode);
  const tool = useUI((s) => s.tool);
  const drawingColor = useUI((s) => s.drawingColor);
  const setUI = useUI((s) => s.set);
  const setPref = useUI((s) => s.setPref);
  const openDialog = useUI((s) => s.openDialog);

  const [mapNameDraft, setMapNameDraft] = useState(doc?.name ?? '');

  useEffect(() => {
    if (doc) setMapNameDraft(doc.name);
  }, [doc?.name]);

  const handleNameBlur = () => {
    if (doc && mapNameDraft.trim() && mapNameDraft !== doc.name) {
      void renameMap(doc.id, mapNameDraft.trim());
    }
  };

  const nextTheme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';

  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        gap: 12,
        zIndex: 25,
        flexShrink: 0,
      }}
    >
      {/* Lado Esquerdo: Mascote Pinguim Gentoo, Seletor de Mapa e Nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <GentooLogo size={32} />

        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => openDialog('maps')}
          title="Ver todos os mapas salvos"
        >
          <Folder size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600 }}>Mapas</span>
        </button>

        <div className="divider-v" />

        <input
          type="text"
          className="input-bare"
          style={{
            fontWeight: 600,
            fontSize: 14,
            maxWidth: 240,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          value={mapNameDraft}
          placeholder="Nome do mapa"
          onChange={(e) => setMapNameDraft(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />

        {/* Indicador de Salvamento Automático */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
          {saveStatus === 'saved' && (
            <Tooltip label="Todas as alterações estão salvas localmente no navegador (IndexedDB)">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  color: 'var(--success)',
                }}
              >
                <Check size={13} />
                <span>Salvo</span>
              </span>
            </Tooltip>
          )}

          {saveStatus === 'saving' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                color: 'var(--text-3)',
              }}
            >
              <Loader2 size={13} className="animate-spin" />
              <span>Salvando…</span>
            </span>
          )}

          {saveStatus === 'pending' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                color: 'var(--warning)',
              }}
            >
              <Save size={13} />
              <span>Pendente…</span>
            </span>
          )}

          {saveStatus === 'error' && (
            <button
              type="button"
              className="btn btn-sm btn-danger-ghost"
              style={{ height: 24, padding: '0 6px', fontSize: 11 }}
              onClick={() => retrySave()}
              title={saveError || 'Erro de armazenamento. Clique para tentar novamente.'}
            >
              <AlertCircle size={13} />
              <span>Falha ao salvar (Tentar de novo)</span>
            </button>
          )}
        </div>
      </div>

      {/* Centro: Ferramentas de Seleção, Desenho Livre e Edição */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 2,
            gap: 2,
            marginRight: 2,
          }}
        >
          <IconButton
            label="Ferramenta Seleção (Arrastar no fundo cria área de seleção retangular)"
            shortcut="V"
            active={tool === 'select'}
            onClick={() => setUI({ tool: 'select' })}
          >
            <MousePointer size={15} />
          </IconButton>
          <IconButton
            label="Ferramenta Mão (Arrastar com botão esquerdo move a tela)"
            shortcut="H"
            active={tool === 'hand'}
            onClick={() => setUI({ tool: 'hand' })}
          >
            <Hand size={15} />
          </IconButton>

          <div className="divider-v" style={{ height: 16, margin: '0 2px' }} />

          <IconButton
            label="Caneta (Desenho livre vetorial no mapa)"
            shortcut="P"
            active={tool === 'pen'}
            onClick={() => setUI({ tool: 'pen' })}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Pen size={15} />
              {tool === 'pen' && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -3,
                    right: -3,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: drawingColor,
                    border: '1px solid var(--bg-surface)',
                  }}
                />
              )}
            </div>
          </IconButton>

          <IconButton
            label="Marca-texto (Traço translúcido de destaque)"
            shortcut="M"
            active={tool === 'highlighter'}
            onClick={() => setUI({ tool: 'highlighter' })}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Highlighter size={15} />
              {tool === 'highlighter' && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -3,
                    right: -3,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: drawingColor,
                    border: '1px solid var(--bg-surface)',
                  }}
                />
              )}
            </div>
          </IconButton>

          <IconButton
            label="Borracha (Apaga traços inteiros ao clicar ou arrastar por cima)"
            shortcut="E"
            active={tool === 'eraser'}
            onClick={() => setUI({ tool: 'eraser' })}
          >
            <Eraser size={15} />
          </IconButton>

          <div className="divider-v" style={{ height: 16, margin: '0 2px' }} />

          {/* Seletor direto de Cor e Espessura da Caneta */}
          <DrawingStylePopover />
        </div>

        {/* Gerenciador Expansível de Camadas e Subcamadas */}
        <LayersPopover />

        <div className="divider-v" />

        <IconButton
          label="Desfazer"
          shortcut="Ctrl+Z"
          disabled={past.length === 0}
          onClick={() => undo()}
        >
          <Undo2 size={16} />
        </IconButton>

        <IconButton
          label="Refazer"
          shortcut="Ctrl+Y"
          disabled={future.length === 0}
          onClick={() => redo()}
        >
          <Redo2 size={16} />
        </IconButton>

        <div className="divider-v" />

        <button
          type="button"
          className="btn btn-sm"
          onClick={() => addConceptAt()}
          title="Criar novo conceito (Clique duplo no canvas)"
        >
          <Plus size={14} />
          <span>Novo Conceito</span>
        </button>

        <IconButton
          label="Adicionar Conceito Filho"
          shortcut="Tab"
          disabled={selectedNodes.length === 0}
          onClick={() => addChild()}
        >
          <GitBranch size={16} />
        </IconButton>

        <IconButton
          label={connectMode ? 'Cancelar modo de conexão' : 'Ligar Conceitos'}
          active={Boolean(connectMode)}
          onClick={() => {
            if (connectMode) setUI({ connectMode: null });
            else startConnectMode();
          }}
        >
          <ArrowRight size={16} />
        </IconButton>

        {/* Menu de Organização Automática */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="btn btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Organizar layout hierárquico"
            >
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <span>Organizar</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu">
              <DropdownMenu.Item className="menu-item" onSelect={() => autoLayout('all', 'TB')}>
                <span>Hierarquia Vertical (Cima para Baixo)</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item className="menu-item" onSelect={() => autoLayout('all', 'LR')}>
                <span>Hierarquia Horizontal (Esquerda para Direita)</span>
              </DropdownMenu.Item>
              {selectedNodes.length === 1 && (
                <>
                  <DropdownMenu.Separator className="menu-sep" />
                  <DropdownMenu.Item className="menu-item" onSelect={() => autoLayout('branch')}>
                    <span>Organizar somente este ramo</span>
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {selectedNodes.length > 1 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-soft-2)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>{selectedNodes.length} selecionados</span>
          </div>
        )}
      </div>

      {/* Lado Direito: Navegação, Exportação e Preferências */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconButton
          label="Ajustar visualização de todo o mapa"
          shortcut="Shift+1"
          onClick={() => fitView()}
        >
          <Maximize2 size={16} />
        </IconButton>

        <IconButton
          label="Pesquisar conceitos no mapa"
          shortcut="Ctrl+F"
          onClick={() => setUI({ searchOpen: true })}
        >
          <Search size={16} />
        </IconButton>

        {/* Menu de Exportação Rápida e Backup */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="icon-btn"
              title="Exportar Imagem PNG, PDF ou Backup"
              aria-label="Exportar mapa"
            >
              <Download size={16} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu" align="end" sideOffset={6} style={{ minWidth: 230 }}>
              <DropdownMenu.Item
                className="menu-item"
                onSelect={() => {
                  const container = getFlowContainer();
                  if (container && doc) {
                    void exportMapPng(container, doc.name);
                  }
                }}
              >
                <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                <span>Exportar como PNG (Imagem)</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="menu-item"
                onSelect={() => {
                  const container = getFlowContainer();
                  if (container && doc) {
                    void exportMapPdf(container, doc.name);
                  }
                }}
              >
                <FileText size={14} style={{ color: 'var(--primary)' }} />
                <span>Exportar como PDF</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="menu-item"
                onSelect={() => {
                  const container = getFlowContainer();
                  if (container && doc) {
                    void exportMapSvg(container, doc.name);
                  }
                }}
              >
                <FileCode size={14} style={{ color: 'var(--primary)' }} />
                <span>Exportar como Vetor SVG</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="menu-sep" />

              <DropdownMenu.Item
                className="menu-item"
                onSelect={() => {
                  if (doc) exportMapJson(doc);
                }}
              >
                <FileJson size={14} />
                <span>Salvar Arquivo JSON (.cmap.json)</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="menu-item"
                onSelect={() => {
                  if (doc) void exportBackupZip(doc);
                }}
              >
                <FileArchive size={14} />
                <span>Backup Completo (.cmapzip)</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="menu-sep" />

              <DropdownMenu.Item
                className="menu-item"
                onSelect={() => openDialog('export')}
              >
                <Upload size={14} />
                <span>Mais opções / Importar…</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <IconButton
          label="Armazenamento Local & Limpeza"
          onClick={() => openDialog('storage')}
        >
          <Database size={16} />
        </IconButton>

        <IconButton
          label="Atalhos de teclado"
          shortcut="?"
          onClick={() => openDialog('shortcuts')}
        >
          <Keyboard size={16} />
        </IconButton>

        <IconButton
          label={`Tema: ${theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Sistema'}`}
          onClick={() => setPref('theme', nextTheme)}
        >
          {theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Laptop size={16} />}
        </IconButton>

        <div className="divider-v" />

        <IconButton
          label={panelOpen ? 'Ocultar painel lateral' : 'Exibir painel lateral'}
          active={panelOpen}
          onClick={() => setUI({ panelOpen: !panelOpen })}
        >
          <PanelRight size={16} />
        </IconButton>
      </div>
    </header>
  );
}

