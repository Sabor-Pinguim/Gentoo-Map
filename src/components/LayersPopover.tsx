import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  GripVertical,
  MoveVertical,
} from 'lucide-react';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import {
  createDrawingLayer,
  updateDrawingLayer,
  removeDrawingLayer,
  reorderDrawingLayers,
  confirmAction,
} from '../state/actions';
import {
  NODES_LAYER_ID,
  type DrawingLayer,
  type DrawingStroke,
  type Concept,
  type Link,
} from '../model/types';
import { pointsToSvgPath } from '../canvas/drawingUtils';

/** Miniatura SVG dos traços de uma camada de desenho */
function LayerDrawingPreview({
  strokes,
  width = '100%',
  height = '100%',
}: {
  strokes: DrawingStroke[];
  width?: number | string;
  height?: number | string;
}) {
  if (!strokes || strokes.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          fontSize: 9.5,
          userSelect: 'none',
        }}
      >
        <span style={{ opacity: 0.55 }}>vazia</span>
      </div>
    );
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const spanX = Math.max(maxX - minX, 30);
  const spanY = Math.max(maxY - minY, 30);
  const pad = Math.max(spanX, spanY) * 0.15 + 12;

  const viewBox = `${minX - pad} ${minY - pad} ${spanX + pad * 2} ${spanY + pad * 2}`;

  return (
    <svg
      viewBox={viewBox}
      style={{
        width,
        height,
        display: 'block',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={pointsToSvgPath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={Math.max(stroke.width, Math.max(spanX, spanY) / 26)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={stroke.opacity}
        />
      ))}
    </svg>
  );
}

/** Miniatura SVG dos nós e conexões do mapa conceitual */
function LayerNodesPreview({
  concepts,
  links,
  width = '100%',
  height = '100%',
}: {
  concepts: Record<string, Concept>;
  links: Record<string, Link>;
  width?: number | string;
  height?: number | string;
}) {
  const conceptList = Object.values(concepts);
  if (conceptList.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          fontSize: 9.5,
          userSelect: 'none',
        }}
      >
        <span style={{ opacity: 0.55 }}>sem nós</span>
      </div>
    );
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const c of conceptList) {
    const w = c.width ?? 160;
    const h = c.height ?? 48;
    if (c.position.x < minX) minX = c.position.x;
    if (c.position.x + w > maxX) maxX = c.position.x + w;
    if (c.position.y < minY) minY = c.position.y;
    if (c.position.y + h > maxY) maxY = c.position.y + h;
  }

  const spanX = Math.max(maxX - minX, 60);
  const spanY = Math.max(maxY - minY, 60);
  const pad = Math.max(spanX, spanY) * 0.12 + 18;

  const viewBox = `${minX - pad} ${minY - pad} ${spanX + pad * 2} ${spanY + pad * 2}`;

  return (
    <svg
      viewBox={viewBox}
      style={{
        width,
        height,
        display: 'block',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Mini Conexões */}
      {Object.values(links).map((l) => {
        const src = concepts[l.source];
        const tgt = concepts[l.target];
        if (!src || !tgt) return null;
        const sw = src.width ?? 160;
        const sh = src.height ?? 48;
        const tw = tgt.width ?? 160;
        const th = tgt.height ?? 48;
        return (
          <line
            key={l.id}
            x1={src.position.x + sw / 2}
            y1={src.position.y + sh / 2}
            x2={tgt.position.x + tw / 2}
            y2={tgt.position.y + th / 2}
            stroke="var(--border-strong)"
            strokeWidth={Math.max(spanX, spanY) / 75}
            strokeDasharray={l.kind === 'cross' ? '6 4' : undefined}
            opacity={0.55}
          />
        );
      })}

      {/* Mini Nós de Conceito */}
      {conceptList.map((c) => {
        const w = c.width ?? 160;
        const h = c.height ?? 48;
        return (
          <rect
            key={c.id}
            x={c.position.x}
            y={c.position.y}
            width={w}
            height={h}
            rx={Math.max(h * 0.2, 4)}
            fill="var(--accent)"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

export function LayersPopover() {
  const doc = useEditor((s) => s.doc);
  const activeLayerId = useUI((s) => s.activeLayerId);
  const setUI = useUI((s) => s.set);

  const [open, setOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingNameDraft, setEditingNameDraft] = useState('');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  if (!doc) return null;

  const drawings = doc.drawings;
  const layers = drawings?.layers ?? doc.drawingLayers ?? {};
  const order = drawings?.layerOrder ?? doc.layerOrder ?? [NODES_LAYER_ID, 'default-layer-1'];
  const strokes = drawings?.strokes ?? doc.strokes ?? {};

  // Contagem de traços por camada
  const strokeCounts: Record<string, number> = {};
  const strokesByLayer: Record<string, DrawingStroke[]> = {};
  for (const stroke of Object.values(strokes)) {
    strokeCounts[stroke.layerId] = (strokeCounts[stroke.layerId] ?? 0) + 1;
    if (!strokesByLayer[stroke.layerId]) strokesByLayer[stroke.layerId] = [];
    strokesByLayer[stroke.layerId].push(stroke);
  }

  // Na pilha visual de camadas, a mais superior fica no topo da lista (ordem inversa do rendering)
  const visualOrder = [...order].reverse();

  // Camada ativa padrão se não houver selecionada
  const currentActiveId =
    activeLayerId ??
    Object.keys(layers)[0] ??
    'default-layer-1';

  // Alvo exibido na caixa de preview em destaque:
  // Se estiver arrastando, foca na que está se movendo!
  // Se passar o mouse, foca na que está em hover.
  // Senão, foca na camada ativa selecionada.
  const previewTargetId = draggedLayerId ?? hoveredLayerId ?? currentActiveId;
  const isPreviewingNodes = previewTargetId === NODES_LAYER_ID;
  const previewTargetLayer = !isPreviewingNodes ? layers[previewTargetId] : null;

  const handleStartRename = (layer: DrawingLayer) => {
    setEditingLayerId(layer.id);
    setEditingNameDraft(layer.name);
  };

  const handleFinishRename = (layerId: string) => {
    if (editingNameDraft.trim()) {
      updateDrawingLayer(layerId, { name: editingNameDraft.trim() });
    }
    setEditingLayerId(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLayerId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedLayerId && draggedLayerId !== targetId) {
      setDragOverLayerId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverLayerId(null);
    if (!draggedLayerId || draggedLayerId === targetId) return;

    const fromIndex = order.indexOf(draggedLayerId);
    const toIndex = order.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      const newOrder = [...order];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      reorderDrawingLayers(newOrder);
    }
    setDraggedLayerId(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleDeleteLayer = async (id: string, name: string) => {
    const drawingLayerIds = Object.keys(layers);
    if (drawingLayerIds.length <= 1) {
      return; // Mantém pelo menos uma camada de desenho
    }
    const confirmed = await confirmAction({
      title: 'Excluir camada',
      message: `Tem certeza que deseja excluir a camada "${name}" e todos os seus traços?`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (confirmed) {
      removeDrawingLayer(id);
    }
  };

  // Identifica onde os nós ficam em relação às camadas
  const nodesIndexInVisual = visualOrder.indexOf(NODES_LAYER_ID);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`btn btn-sm ${open ? 'btn-active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
            background: open ? 'var(--accent-soft-2)' : undefined,
            borderColor: open ? 'var(--accent)' : undefined,
            color: open ? 'var(--accent)' : undefined,
          }}
          title="Gerenciador de camadas de desenho e nós"
        >
          <Layers size={15} style={{ color: 'var(--accent)' }} />
          <span>Camadas</span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 5px',
              borderRadius: 99,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
            }}
          >
            {Object.keys(layers).length}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="menu"
          sideOffset={8}
          align="start"
          style={{
            width: 326,
            maxHeight: '84vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            zIndex: 100,
          }}
        >
          {/* Cabeçalho do Popover */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                Camadas do Mapa
              </span>
            </div>

            <button
              type="button"
              className="btn btn-xs btn-primary"
              onClick={() => createDrawingLayer()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Criar nova camada de desenho"
            >
              <Plus size={13} />
              <span>Nova</span>
            </button>
          </div>

          {/* CAIXINHA DE PREVIEW DINÂMICA DA CAMADA */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--text-3)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {draggedLayerId ? (
                  <span
                    style={{
                      color: 'var(--accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <MoveVertical size={12} />
                    <span>Movendo camada</span>
                  </span>
                ) : (
                  <span>Pré-visualização</span>
                )}
              </div>

              <span
                style={{
                  fontWeight: 600,
                  color: draggedLayerId ? 'var(--accent)' : 'var(--text)',
                  maxWidth: 160,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textTransform: 'none',
                }}
              >
                {isPreviewingNodes
                  ? '📌 Conceitos & Ligações (Nós)'
                  : (previewTargetLayer?.name ?? 'Camada')}
              </span>
            </div>

            {/* Container da Caixinha de Preview */}
            <div
              style={{
                height: 78,
                background:
                  'repeating-conic-gradient(var(--bg-subtle) 0% 25%, var(--bg-surface) 0% 50%) 50% / 12px 12px',
                border: draggedLayerId ? '2px dashed var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                transition: 'border-color 0.15s ease',
              }}
            >
              {isPreviewingNodes ? (
                <LayerNodesPreview
                  concepts={doc.concepts}
                  links={doc.links}
                  width="100%"
                  height="100%"
                />
              ) : (
                <LayerDrawingPreview
                  strokes={strokesByLayer[previewTargetId] ?? []}
                  width="100%"
                  height="100%"
                />
              )}

              {/* Tag com contagem no canto inferior */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 5,
                  fontSize: 9.5,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-3)',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
              >
                {isPreviewingNodes
                  ? `${Object.keys(doc.concepts).length} conceitos`
                  : `${(strokesByLayer[previewTargetId] ?? []).length} traços`}
              </div>
            </div>
          </div>

          {/* Lista de Camadas com Drag & Drop */}
          <div
            style={{
              padding: '6px 8px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {visualOrder.map((id, index) => {
              const isNodes = id === NODES_LAYER_ID;
              const isOverTarget = dragOverLayerId === id;
              const isDraggingThis = draggedLayerId === id;
              const isAboveNodes = index < nodesIndexInVisual;

              // Camada Especial: Nós e Conexões do Mapa
              if (isNodes) {
                return (
                  <div
                    key={NODES_LAYER_ID}
                    draggable
                    onDragStart={(e) => handleDragStart(e, NODES_LAYER_ID)}
                    onDragOver={(e) => handleDragOver(e, NODES_LAYER_ID)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, NODES_LAYER_ID)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredLayerId(NODES_LAYER_ID)}
                    onMouseLeave={() => setHoveredLayerId(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isDraggingThis
                        ? 'var(--accent-soft)'
                        : 'var(--bg-subtle)',
                      border: isOverTarget
                        ? '2px solid var(--accent)'
                        : isDraggingThis
                        ? '1.5px dashed var(--accent)'
                        : '1px dashed var(--accent)',
                      cursor: 'grab',
                      userSelect: 'none',
                      margin: '2px 0',
                    }}
                    title="Arraste esta camada para redefinir o que desenha sobre os nós ou abaixo deles"
                  >
                    <GripVertical size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />

                    {/* Miniatura do mapa de nós */}
                    <div
                      style={{
                        width: 36,
                        height: 24,
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid var(--accent)',
                        background: 'var(--bg-surface)',
                        flexShrink: 0,
                      }}
                    >
                      <LayerNodesPreview
                        concepts={doc.concepts}
                        links={doc.links}
                        width="100%"
                        height="100%"
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span>📌 Conceitos & Ligações (Nós)</span>
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-3)' }}>
                        Divisória: acima na frente; abaixo atrás dos nós
                      </div>
                    </div>
                  </div>
                );
              }

              const layer = layers[id];
              if (!layer) return null;

              const isActive = layer.id === currentActiveId;
              const strokeCount = strokeCounts[layer.id] ?? 0;
              const isEditing = editingLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  onDragOver={(e) => handleDragOver(e, layer.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, layer.id)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredLayerId(layer.id)}
                  onMouseLeave={() => setHoveredLayerId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isDraggingThis
                      ? 'var(--accent-soft)'
                      : isActive
                      ? 'var(--accent-soft-2)'
                      : 'var(--bg-surface)',
                    border: isOverTarget
                      ? '2px solid var(--accent)'
                      : isDraggingThis
                      ? '1.5px dashed var(--accent)'
                      : isActive
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border)',
                    boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
                    cursor: 'default',
                    opacity: layer.visible ? (layer.opacity ?? 1) : 0.45,
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Grip Handle para Drag and Drop */}
                  <div
                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
                    title="Arrastar para reordenar camada"
                  >
                    <GripVertical size={14} style={{ color: 'var(--text-3)' }} />
                  </div>

                  {/* Miniatura do conteúdo da camada */}
                  <div
                    style={{
                      width: 36,
                      height: 24,
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: '1px solid var(--border-strong)',
                      background:
                        'repeating-conic-gradient(var(--bg-subtle) 0% 25%, var(--bg-surface) 0% 50%) 50% / 8px 8px',
                      flexShrink: 0,
                    }}
                    title="Miniatura do que está desenhado nesta camada"
                  >
                    <LayerDrawingPreview
                      strokes={strokesByLayer[layer.id] ?? []}
                      width="100%"
                      height="100%"
                    />
                  </div>

                  {/* Radio / Indicador de Camada Ativa */}
                  <button
                    type="button"
                    onClick={() => setUI({ activeLayerId: layer.id })}
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      border: isActive
                        ? '3.5px solid var(--accent)'
                        : '1.5px solid var(--border-strong)',
                      background: 'var(--bg-surface)',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                    }}
                    title={
                      isActive
                        ? 'Camada ativa atual de desenho'
                        : 'Clique para definir como camada ativa de desenho'
                    }
                  />

                  {/* Nome da Camada (Inline Editável) */}
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => !isEditing && setUI({ activeLayerId: layer.id })}
                    onDoubleClick={() => handleStartRename(layer)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        className="input-bare"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: '1px 4px',
                          border: '1px solid var(--accent)',
                          borderRadius: 3,
                          width: '100%',
                        }}
                        value={editingNameDraft}
                        onChange={(e) => setEditingNameDraft(e.target.value)}
                        onBlur={() => handleFinishRename(layer.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(layer.id);
                          if (e.key === 'Escape') setEditingLayerId(null);
                        }}
                      />
                    ) : (
                      <div>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--accent)' : 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {layer.name}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--text-3)', display: 'flex', gap: 4 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: isAboveNodes ? 'var(--accent)' : 'var(--success)',
                            }}
                          >
                            {isAboveNodes ? 'Frente dos Nós' : 'Atrás dos Nós'}
                          </span>
                          <span>•</span>
                          <span>{strokeCount} traço{strokeCount === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações da Camada: Visibilidade, Bloqueio, Exclusão */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {/* Botão de Visibilidade */}
                    <button
                      type="button"
                      className="icon-btn icon-btn-xs"
                      onClick={() => updateDrawingLayer(layer.id, { visible: !layer.visible })}
                      title={layer.visible ? 'Ocultar camada' : 'Exibir camada'}
                      style={{ color: layer.visible ? 'var(--text-2)' : 'var(--text-3)' }}
                    >
                      {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>

                    {/* Botão de Bloqueio */}
                    <button
                      type="button"
                      className="icon-btn icon-btn-xs"
                      onClick={() => updateDrawingLayer(layer.id, { locked: !layer.locked })}
                      title={
                        layer.locked
                          ? 'Camada bloqueada (clique para desbloquear)'
                          : 'Bloquear edição na camada'
                      }
                      style={{ color: layer.locked ? 'var(--warning)' : 'var(--text-3)' }}
                    >
                      {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>

                    {/* Botão de Excluir */}
                    <button
                      type="button"
                      className="icon-btn icon-btn-xs"
                      disabled={Object.keys(layers).length <= 1}
                      onClick={() => handleDeleteLayer(layer.id, layer.name)}
                      title={
                        Object.keys(layers).length <= 1
                          ? 'Não é possível excluir a única camada'
                          : 'Excluir camada e seus traços'
                      }
                      style={{
                        color: Object.keys(layers).length <= 1 ? 'var(--text-3)' : 'var(--danger)',
                        opacity: Object.keys(layers).length <= 1 ? 0.35 : 1,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dica de Rodapé */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 10,
              color: 'var(--text-3)',
              background: 'var(--bg-subtle)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Arraste as camadas para organizar</span>
            <span style={{ color: 'var(--accent)' }}>Duplo-clique para renomear</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
