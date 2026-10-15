import React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  Plus,
  Trash2,
  Copy,
  GitBranch,
  CornerDownRight,
  Maximize2,
  RotateCcw,
  RotateCw,
  FolderOpen,
  ArrowLeftRight,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import {
  addConceptAt,
  addChild,
  addSibling,
  duplicateSelection,
  deleteSelection,
  autoLayout,
  fitView,
  undo,
  redo,
  reverseLink,
  setLinkKind,
  toggleCollapse,
  selectAll,
} from '../state/actions';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import { getFlow, getFlowContainer } from './flowApi';
import { exportMapPng } from '../io/export';

interface CanvasContextMenuProps {
  children: React.ReactNode;
}

export function CanvasContextMenu({ children }: CanvasContextMenuProps) {
  const selectedNodes = useEditor((s) => s.selectedNodes);
  const selectedEdges = useEditor((s) => s.selectedEdges);
  const doc = useEditor((s) => s.doc);
  const setEditing = useEditor((s) => s.setEditing);

  const singleNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const singleNode = singleNodeId && doc ? doc.concepts[singleNodeId] : null;

  const singleEdgeId = selectedEdges.length === 1 ? selectedEdges[0] : null;
  const singleEdge = singleEdgeId && doc ? doc.links[singleEdgeId] : null;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu">
          {singleNode ? (
            <>
              <ContextMenu.Label className="menu-label">
                Conceito: {singleNode.title || 'Sem título'}
              </ContextMenu.Label>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => addChild(singleNode.id)}
              >
                <Plus size={14} />
                <span>Adicionar filho</span>
                <span className="shortcut">Tab</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => addSibling()}
              >
                <CornerDownRight size={14} />
                <span>Adicionar irmão</span>
                <span className="shortcut">Enter</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => duplicateSelection()}
              >
                <Copy size={14} />
                <span>Duplicar conceito</span>
                <span className="shortcut">Ctrl+D</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => {
                  useUI.getState().set({ panelOpen: true });
                }}
              >
                <FolderOpen size={14} />
                <span>Abrir materiais no painel</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => toggleCollapse(singleNode.id)}
              >
                <GitBranch size={14} />
                <span>
                  {singleNode.collapsed ? 'Expandir ramo' : 'Recolher ramo'}
                </span>
                <span className="shortcut">Espaço</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => autoLayout('branch')}
              >
                <Sparkles size={14} />
                <span>Organizar este ramo</span>
              </ContextMenu.Item>

              <ContextMenu.Separator className="menu-sep" />

              <ContextMenu.Item
                className="menu-item danger"
                onSelect={() => deleteSelection()}
              >
                <Trash2 size={14} />
                <span>Excluir</span>
                <span className="shortcut">Del</span>
              </ContextMenu.Item>
            </>
          ) : singleEdge ? (
            <>
              <ContextMenu.Label className="menu-label">
                Conexão {singleEdge.label ? `“${singleEdge.label}”` : ''}
              </ContextMenu.Label>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => setEditing({ type: 'edge', id: singleEdge.id })}
              >
                <span>Editar frase de ligação</span>
                <span className="shortcut">F2</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => reverseLink(singleEdge.id)}
              >
                <ArrowLeftRight size={14} />
                <span>Inverter direção</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() =>
                  setLinkKind(
                    singleEdge.id,
                    singleEdge.kind === 'hierarchy' ? 'cross' : 'hierarchy'
                  )
                }
              >
                <span>
                  Tornar ligação {singleEdge.kind === 'hierarchy' ? 'cruzada' : 'hierárquica'}
                </span>
              </ContextMenu.Item>

              <ContextMenu.Separator className="menu-sep" />

              <ContextMenu.Item
                className="menu-item danger"
                onSelect={() => deleteSelection()}
              >
                <Trash2 size={14} />
                <span>Excluir conexão</span>
                <span className="shortcut">Del</span>
              </ContextMenu.Item>
            </>
          ) : (
            <>
              <ContextMenu.Item
                className="menu-item"
                onSelect={(e) => {
                  const f = getFlow();
                  const flowPos = f
                    ? f.screenToFlowPosition({
                        x: (e as unknown as MouseEvent).clientX ?? window.innerWidth / 2,
                        y: (e as unknown as MouseEvent).clientY ?? window.innerHeight / 2,
                      })
                    : undefined;
                  addConceptAt(flowPos);
                }}
              >
                <Plus size={14} />
                <span>Novo conceito aqui</span>
                <span className="shortcut">Clique duplo</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => autoLayout('all')}
              >
                <Sparkles size={14} />
                <span>Organizar hierarquicamente</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => fitView()}
              >
                <Maximize2 size={14} />
                <span>Ajustar à tela</span>
                <span className="shortcut">Shift+1</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => selectAll()}
              >
                <span>Selecionar tudo</span>
                <span className="shortcut">Ctrl+A</span>
              </ContextMenu.Item>

              <ContextMenu.Separator className="menu-sep" />

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => undo()}
              >
                <RotateCcw size={14} />
                <span>Desfazer</span>
                <span className="shortcut">Ctrl+Z</span>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => redo()}
              >
                <RotateCw size={14} />
                <span>Refazer</span>
                <span className="shortcut">Ctrl+Y</span>
              </ContextMenu.Item>

              <ContextMenu.Separator className="menu-sep" />

              <ContextMenu.Item
                className="menu-item"
                onSelect={() => {
                  const container = getFlowContainer();
                  if (container && doc) {
                    void exportMapPng(container, doc.name);
                  }
                }}
              >
                <ImageIcon size={14} />
                <span>Exportar mapa como PNG</span>
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

