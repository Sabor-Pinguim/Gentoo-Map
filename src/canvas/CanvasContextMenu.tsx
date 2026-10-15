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
  ArrowRight,
  ArrowLeft,
  Minus,
  Spline,
  Palette,
  Check,
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
  setLinkStyle,
  toggleCollapse,
  selectAll,
} from '../state/actions';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import { getFlow, getFlowContainer } from './flowApi';
import { exportMapPng } from '../io/export';
import { EDGE_PALETTE } from './edgeColors';
import type { ColorKey } from '../model/types';

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

              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className="menu-item">
                  <ArrowRight size={14} />
                  <span>Pontas de seta</span>
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent className="menu">
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { arrow: 'end' })}
                    >
                      <ArrowRight size={14} />
                      <span>Seta no destino (→)</span>
                      {singleEdge.style.arrow === 'end' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { arrow: 'start' })}
                    >
                      <ArrowLeft size={14} />
                      <span>Seta na origem (←)</span>
                      {singleEdge.style.arrow === 'start' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { arrow: 'both' })}
                    >
                      <ArrowLeftRight size={14} />
                      <span>Ambas as pontas (↔)</span>
                      {singleEdge.style.arrow === 'both' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { arrow: 'none' })}
                    >
                      <Minus size={14} />
                      <span>Sem setas (—)</span>
                      {singleEdge.style.arrow === 'none' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>

              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className="menu-item">
                  <Minus size={14} />
                  <span>Estilo do traço</span>
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent className="menu">
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { line: 'solid' })}
                    >
                      <span>Contínua (————)</span>
                      {singleEdge.style.line === 'solid' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { line: 'dashed' })}
                    >
                      <span>Tracejada (- - - -)</span>
                      {singleEdge.style.line === 'dashed' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { line: 'dotted' })}
                    >
                      <span>Pontilhada (· · · ·)</span>
                      {singleEdge.style.line === 'dotted' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { line: 'auto' })}
                    >
                      <span>Automática (por tipo)</span>
                      {singleEdge.style.line === 'auto' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>

              <ContextMenu.Item
                className="menu-item"
                onSelect={() =>
                  setLinkStyle([singleEdge.id], {
                    curve: singleEdge.style.curve === 'straight' ? 'curved' : 'straight',
                  })
                }
              >
                <Spline size={14} />
                <span>
                  {singleEdge.style.curve === 'straight' ? 'Tornar linha curva' : 'Tornar linha reta'}
                </span>
              </ContextMenu.Item>

              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className="menu-item">
                  <Palette size={14} />
                  <span>Cor da linha</span>
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent className="menu" style={{ minWidth: 160 }}>
                    <ContextMenu.Item
                      className="menu-item"
                      onSelect={() => setLinkStyle([singleEdge.id], { color: 'default' })}
                    >
                      <span>Cor Padrão do Mapa</span>
                      {singleEdge.style.color === 'default' && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </ContextMenu.Item>
                    <ContextMenu.Separator className="menu-sep" />
                    {Object.entries(EDGE_PALETTE).map(([key, hex]) => (
                      <ContextMenu.Item
                        key={key}
                        className="menu-item"
                        onSelect={() => setLinkStyle([singleEdge.id], { color: key as ColorKey })}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: hex,
                            border: '1px solid rgba(0,0,0,0.15)',
                          }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{key}</span>
                        {singleEdge.style.color === key && <Check size={13} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />}
                      </ContextMenu.Item>
                    ))}
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>

              <ContextMenu.Separator className="menu-sep" />

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

