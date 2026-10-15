import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import {
  ReactFlow,
  Background,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
  MarkerType,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConceptNode } from './ConceptNode';
import { ConceptEdge } from './ConceptEdge';
import { CanvasContextMenu } from './CanvasContextMenu';
import { setFlowInstance } from './flowApi';
import { DrawingLayersView } from './DrawingLayersView';
import { DrawingInteractionOverlay } from './DrawingInteractionOverlay';
import type { DrawingStroke } from '../model/types';
import {
  addConceptAt,
  addChild,
  addSibling,
  connect,
  deleteSelection,
  duplicateSelection,
  redo,
  selectAll,
  selectNeighbor,
  toggleCollapse,
  undo,
} from '../state/actions';
import { editor, useEditor } from '../state/editorStore';
import { loadViewport, saveViewport, useUI } from '../state/uiStore';
import { getVisibility } from '../model/hierarchy';
import * as ops from '../model/ops';

const nodeTypes = { concept: ConceptNode };
const edgeTypes = { concept: ConceptEdge };

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const doc = useEditor((s) => s.doc);
  const selectedNodes = useEditor((s) => s.selectedNodes);
  const selectedEdges = useEditor((s) => s.selectedEdges);
  const showMinimap = useUI((s) => s.showMinimap);
  const connectMode = useUI((s) => s.connectMode);
  const tool = useUI((s) => s.tool);

  // Estados de desenho livre sincronizados com o canvas
  const [draftStroke, setDraftStroke] = useState<DrawingStroke | null>(null);
  const [flowInstance, setFlowInstanceLocal] = useState<ReactFlowInstance | null>(null);

  // Monitora se teclas de seleção múltipla (Ctrl / Cmd / Shift) estão pressionadas
  const isMultiKeyRef = useRef(false);
  // Rastreia se uma seleção por área retangular está ativa
  const isBoxSelectingRef = useRef(false);
  const additiveBaselineNodesRef = useRef<Set<string>>(new Set());
  const additiveBaselineEdgesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      isMultiKeyRef.current = e.ctrlKey || e.metaKey || e.shiftKey;
    };
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('keyup', onKey, { capture: true });
    const onBlur = () => {
      isMultiKeyRef.current = false;
    };
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('keyup', onKey, { capture: true });
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const onSelectionStart = useCallback((e?: React.MouseEvent) => {
    isBoxSelectingRef.current = true;
    const isMulti = Boolean(e && (e.ctrlKey || e.metaKey || e.shiftKey)) || isMultiKeyRef.current;
    if (isMulti) {
      additiveBaselineNodesRef.current = new Set(editor().selectedNodes);
      additiveBaselineEdgesRef.current = new Set(editor().selectedEdges);
    } else {
      additiveBaselineNodesRef.current = new Set();
      additiveBaselineEdgesRef.current = new Set();
    }
  }, []);

  const onSelectionEnd = useCallback(() => {
    isBoxSelectingRef.current = false;
    additiveBaselineNodesRef.current = new Set();
    additiveBaselineEdgesRef.current = new Set();
  }, []);

  // Deriva os nós do React Flow a partir do documento (filtrando nós ocultos por ramos recolhidos)
  const nodes: Node[] = useMemo(() => {
    if (!doc) return [];
    const vis = getVisibility(doc);
    return Object.values(doc.concepts)
      .filter((c) => !vis.hidden.has(c.id))
      .map((c) => ({
        id: c.id,
        type: 'concept',
        position: c.position,
        selected: selectedNodes.includes(c.id),
        data: { id: c.id },
      }));
  }, [doc, selectedNodes]);

  // Deriva as arestas do React Flow a partir do documento (filtrando conexões que envolvem nós ocultos)
  const edges: Edge[] = useMemo(() => {
    if (!doc) return [];
    const vis = getVisibility(doc);
    return Object.values(doc.links)
      .filter((l) => !vis.hidden.has(l.source) && !vis.hidden.has(l.target))
      .map((l) => ({
        id: l.id,
        source: l.source,
        target: l.target,
        type: 'concept',
        selected: selectedEdges.includes(l.id),
        markerEnd:
          l.style.arrow === 'end' || l.style.arrow === 'both'
            ? { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'var(--edge)' }
            : undefined,
        markerStart:
          l.style.arrow === 'both'
            ? { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'var(--edge)' }
            : undefined,
        data: { id: l.id },
      }));
  }, [doc, selectedEdges]);

  // Handler para movimentação e seleção de nós
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const moves: Record<string, { x: number; y: number }> = {};
    let selChanged = false;
    const current = editor().selectedNodes;
    const nextSelected = new Set(current);

    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        moves[change.id] = change.position;
      } else if (change.type === 'select') {
        if (change.selected) {
          if (!nextSelected.has(change.id)) {
            nextSelected.add(change.id);
            selChanged = true;
          }
        } else {
          // Se estamos arrastando uma caixa de seleção com Ctrl/Shift,
          // preserva os nós que já estavam selecionados antes dessa caixa iniciar!
          if (isBoxSelectingRef.current && additiveBaselineNodesRef.current.has(change.id)) {
            continue;
          }
          if (nextSelected.has(change.id)) {
            nextSelected.delete(change.id);
            selChanged = true;
          }
        }
      }
    }

    if (selChanged) {
      editor().setSelection(Array.from(nextSelected), editor().selectedEdges);
    }

    if (Object.keys(moves).length > 0) {
      editor().apply('Mover conceitos', (d) => ops.moveConcepts(d, moves), {
        mode: 'coalesce',
        key: 'drag-nodes',
      });
    }
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    let selChanged = false;
    const current = editor().selectedEdges;
    const nextSelected = new Set(current);
    for (const change of changes) {
      if (change.type === 'select') {
        if (change.selected) {
          if (!nextSelected.has(change.id)) {
            nextSelected.add(change.id);
            selChanged = true;
          }
        } else {
          if (isBoxSelectingRef.current && additiveBaselineEdgesRef.current.has(change.id)) {
            continue;
          }
          if (nextSelected.has(change.id)) {
            nextSelected.delete(change.id);
            selChanged = true;
          }
        }
      }
    }
    if (selChanged) {
      editor().setSelection(editor().selectedNodes, Array.from(nextSelected));
    }
  }, []);

  // Clique no fundo limpa a seleção e cancela modos transitórios
  const onPaneClick = useCallback(() => {
    editor().setSelection([], []);
    editor().setEditing(null);
    if (useUI.getState().connectMode) {
      useUI.getState().set({ connectMode: null });
    }
  }, []);

  // Criação de conexão ao soltar handle
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      connect(connection.source, connection.target);
    }
  }, []);

  // Clique no nó
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (connectMode) {
        if (!connectMode.sourceId) {
          useUI.getState().set({ connectMode: { sourceId: node.id } });
        } else if (connectMode.sourceId !== node.id) {
          connect(connectMode.sourceId, node.id);
          useUI.getState().set({ connectMode: null });
        }
        return;
      }

      // Se autoOpenPanel estiver ativo, abre o painel
      if (useUI.getState().autoOpenPanel) {
        useUI.getState().set({ panelOpen: true });
      }
    },
    [connectMode]
  );

  // Duplo clique no canvas cria um novo conceito naquele ponto (exceto com ferramentas de desenho ativas)
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.concept-edge-label-container')) {
        return;
      }
      const flow = (window as unknown as { __flowInstance?: ReactFlowInstance }).__flowInstance;
      if (flow && containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        const flowPos = flow.screenToFlowPosition({
          x: e.clientX - bounds.left,
          y: e.clientY - bounds.top,
        });
        addConceptAt(flowPos);
      } else {
        addConceptAt();
      }
    },
    [tool]
  );

  // Inicialização do React Flow
  const onInit = useCallback(
    (inst: ReactFlowInstance) => {
      (window as unknown as { __flowInstance?: ReactFlowInstance }).__flowInstance = inst;
      setFlowInstance(inst, containerRef.current);
      setFlowInstanceLocal(inst);

      if (doc) {
        const savedVp = loadViewport(doc.id);
        if (savedVp && Math.abs(savedVp.x) < 50000 && Math.abs(savedVp.y) < 50000 && savedVp.zoom >= 0.15) {
          void inst.setViewport(savedVp);
        } else {
          // Aguarda nós serem renderizados e medidos no DOM antes do fitView
          window.setTimeout(() => {
            void inst.fitView({ padding: 0.25, duration: 200 });
          }, 80);
        }
      }
    },
    [doc]
  );

  // Salva viewport ao navegar
  const onMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => {
      if (doc) saveViewport(doc.id, vp);
    },
    [doc]
  );


  // Atalhos de teclado globais do canvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.tiptap');

      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelection();
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        addChild();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        addSibling();
      } else if (e.key === ' ') {
        const sel = editor().selectedNodes;
        if (sel.length === 1) {
          e.preventDefault();
          toggleCollapse(sel[0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        useUI.getState().set({ connectMode: null });
        editor().setSelection([], []);
        editor().setEditing(null);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectNeighbor('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNeighbor('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectNeighbor('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectNeighbor('right');
      } else if (e.key === 'F2') {
        const sel = editor().selectedNodes;
        if (sel.length === 1) {
          e.preventDefault();
          editor().setEditing({ type: 'node', id: sel[0] });
        }
      } else if (!mod && e.key.toLowerCase() === 'v') {
        useUI.getState().set({ tool: 'select' });
      } else if (!mod && e.key.toLowerCase() === 'h') {
        useUI.getState().set({ tool: 'hand' });
      } else if (!mod && e.key.toLowerCase() === 'p') {
        useUI.getState().set({ tool: 'pen' });
      } else if (!mod && e.key.toLowerCase() === 'm') {
        useUI.getState().set({ tool: 'highlighter' });
      } else if (!mod && e.key.toLowerCase() === 'e') {
        useUI.getState().set({ tool: 'eraser' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`canvas-container tool-${tool} ${connectMode ? 'canvas-connecting' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      <CanvasContextMenu>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <ReactFlow
            key={doc?.id ?? 'empty'}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={onInit}
            onMoveEnd={onMoveEnd}
            onSelectionStart={onSelectionStart}
            onSelectionEnd={onSelectionEnd}
            selectionMode={SelectionMode.Partial}
            selectionKeyCode={['Shift', 'Control', 'Meta']}
            multiSelectionKeyCode={['Control', 'Meta', 'Shift']}
            selectionOnDrag={tool === 'select'}
            panOnDrag={tool === 'select' ? [1, 2] : [0, 1, 2]}
            panActivationKeyCode="Space"
            panOnScroll={false}
            zoomOnScroll
            minZoom={0.15}
            maxZoom={2.5}
            deleteKeyCode={null}
          >
            <Background gap={24} size={1.2} color="var(--grid-dot)" />
            {/* Visualização vetorial das camadas de desenho (Underlay e Overlay) */}
            <DrawingLayersView draftStroke={draftStroke} />

            {showMinimap && (
              <MiniMap
                position="bottom-left"
                style={{
                  width: 140,
                  height: 100,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
                nodeColor="var(--border-strong)"
                maskColor="rgba(0, 0, 0, 0.08)"
              />
            )}
          </ReactFlow>

          {/* Camada interativa de desenho livre (Caneta, Marca-texto, Borracha) */}
          <DrawingInteractionOverlay
            containerRef={containerRef}
            flowInstance={flowInstance}
            onDraftChange={setDraftStroke}
          />

          {nodes.length === 0 && (
            <div className="canvas-empty-overlay">
              <div className="canvas-empty-card">
                <Sparkles size={32} style={{ color: 'var(--accent)' }} />
                <div className="canvas-empty-title">Mapa sem conceitos ainda</div>
                <div className="canvas-empty-desc">
                  Dê um duplo clique em qualquer lugar do canvas ou clique no botão abaixo para criar seu primeiro conceito.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => addConceptAt()}
                  style={{ marginTop: 8 }}
                >
                  <Plus size={16} /> Criar primeiro conceito
                </button>
              </div>
            </div>
          )}
        </div>
      </CanvasContextMenu>
    </div>
  );
}
