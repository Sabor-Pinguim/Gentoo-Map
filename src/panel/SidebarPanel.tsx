import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Globe,
  Image as ImageIcon,
  Video,
  FileCheck,
  BookMarked,
  Info,
} from 'lucide-react';
import { useEditor } from '../state/editorStore';
import { useUI, type PanelTab } from '../state/uiStore';
import { OverviewTab } from './OverviewTab';
import { NotesTab } from './NotesTab';
import { LinksTab } from './LinksTab';
import { ImagesTab } from './ImagesTab';
import { MediaTab } from './MediaTab';
import { DocumentsTab } from './DocumentsTab';
import { ReferencesTab } from './ReferencesTab';

export function SidebarPanel() {
  const panelOpen = useUI((s) => s.panelOpen);
  const panelTab = useUI((s) => s.panelTab);
  const panelWidth = useUI((s) => s.panelWidth);
  const setUI = useUI((s) => s.set);
  const setPref = useUI((s) => s.setPref);

  const selectedNodes = useEditor((s) => s.selectedNodes);
  const doc = useEditor((s) => s.doc);

  // Seleciona o primeiro nó selecionado (se houver múltiplos)
  const currentConceptId = selectedNodes.length > 0 ? selectedNodes[0] : null;
  const concept = currentConceptId && doc ? doc.concepts[currentConceptId] : null;

  // Redimensionamento do painel
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(panelWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = startXRef.current - e.clientX;
      const newWidth = Math.min(880, Math.max(420, startWidthRef.current + dx));
      setPref('panelWidth', newWidth);
    },
    [isResizing, setPref]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!panelOpen) return null;

  const content = concept?.content;

  const counts: Record<PanelTab, number> = {
    overview: 0,
    notes: content?.notesHtml.trim() ? 1 : 0,
    links: content?.links.length ?? 0,
    images: content?.images.length ?? 0,
    media: content?.media.length ?? 0,
    files: content?.documents.length ?? 0,
    refs: content?.references.length ?? 0,
  };

  const tabs: { key: PanelTab; label: string; icon: typeof Info }[] = [
    { key: 'overview', label: 'Geral', icon: Info },
    { key: 'notes', label: 'Anotações', icon: FileText },
    { key: 'links', label: 'Links', icon: Globe },
    { key: 'images', label: 'Imagens', icon: ImageIcon },
    { key: 'media', label: 'Mídias', icon: Video },
    { key: 'files', label: 'Arquivos', icon: FileCheck },
    { key: 'refs', label: 'Referências', icon: BookMarked },
  ];

  return (
    <aside
      className="sidebar-panel"
      style={{ width: panelWidth }}
      aria-label="Painel de materiais do conceito"
    >
      {/* Alça de redimensionamento */}
      <div
        className="panel-resize-handle"
        onMouseDown={handleMouseDown}
        title="Arraste para redimensionar o painel"
      />

      {/* Cabeçalho do Painel */}
      <div className="panel-header">
        <div className="panel-title-area">
          {concept && (
            <span
              className={`panel-concept-dot concept-node color-${concept.style.color}`}
              style={{
                width: 14,
                height: 14,
                minWidth: 'unset',
                padding: 0,
                borderRadius: '50%',
              }}
            />
          )}
          <span className="panel-concept-title">
            {concept ? concept.title || 'Conceito sem título' : 'Nenhum conceito selecionado'}
          </span>
        </div>

        <div className="panel-actions">
          <button
            type="button"
            className="icon-btn"
            style={{ width: 34, height: 34 }}
            onClick={() => setUI({ panelOpen: false })}
            title="Fechar painel lateral"
            aria-label="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {concept ? (
        <>
          {/* Barra de Abas */}
          <div className="panel-tabs-list" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const count = counts[tab.key];
              const isActive = panelTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`panel-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setUI({ panelTab: tab.key })}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {count > 0 && <span className="tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {panelTab === 'overview' && <OverviewTab concept={concept} />}
            {panelTab === 'notes' && <NotesTab concept={concept} />}
            {panelTab === 'links' && <LinksTab concept={concept} />}
            {panelTab === 'images' && <ImagesTab concept={concept} />}
            {panelTab === 'media' && <MediaTab concept={concept} />}
            {panelTab === 'files' && <DocumentsTab concept={concept} />}
            {panelTab === 'refs' && <ReferencesTab concept={concept} />}
          </div>
        </>
      ) : (
        <div className="tab-empty-state" style={{ flex: 1 }}>
          <Info className="tab-empty-icon" />
          <div className="tab-empty-title">Selecione um conceito</div>
          <div className="tab-empty-desc">
            Clique em qualquer conceito do mapa para visualizar e editar seus materiais de estudo,
            anotações, referências e arquivos.
          </div>
        </div>
      )}
    </aside>
  );
}

