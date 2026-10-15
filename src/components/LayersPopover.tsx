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
  Palette,
  Check,
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
import { NODES_LAYER_ID, type DrawingLayer } from '../model/types';

const COLOR_PRESETS = [
  '#ea580c', // Gentoo Orange
  '#ef4444', // Vermelho
  '#f59e0b', // Âmbar
  '#10b981', // Verde
  '#06b6d4', // Ciano
  '#3b82f6', // Azul
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#18181b', // Grafite
  '#ffffff', // Branco
];

export function LayersPopover() {
  const doc = useEditor((s) => s.doc);
  const activeLayerId = useUI((s) => s.activeLayerId);
  const drawingColor = useUI((s) => s.drawingColor);
  const penWidth = useUI((s) => s.penWidth);
  const highlighterWidth = useUI((s) => s.highlighterWidth);
  const tool = useUI((s) => s.tool);
  const setUI = useUI((s) => s.set);

  const [open, setOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingNameDraft, setEditingNameDraft] = useState('');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  if (!doc) return null;

  const drawings = doc.drawings;
  const layers = drawings?.layers ?? doc.drawingLayers ?? {};
  const order = drawings?.layerOrder ?? doc.layerOrder ?? [NODES_LAYER_ID, 'default-layer-1'];
  const strokes = drawings?.strokes ?? doc.strokes ?? {};

  // Contagem de traços por camada
  const strokeCounts: Record<string, number> = {};
  for (const stroke of Object.values(strokes)) {
    strokeCounts[stroke.layerId] = (strokeCounts[stroke.layerId] ?? 0) + 1;
  }

  // Na pilha visual de camadas, a mais superior fica no topo da lista (ordem inversa do rendering)
  const visualOrder = [...order].reverse();

  // Camada ativa padrão se não houver selecionada
  const currentActiveId =
    activeLayerId ??
    Object.keys(layers)[0] ??
    'default-layer-1';

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
            width: 320,
            maxHeight: '80vh',
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

          {/* Configuração Rápida de Desenho (Cores & Espessura) */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'var(--bg-surface)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11.5,
                color: 'var(--text-3)',
                fontWeight: 600,
              }}
            >
              <span>COR & ESPESSURA DO TRAÇO</span>
              <span style={{ color: 'var(--accent)' }}>
                {tool === 'highlighter' ? 'Marca-texto' : 'Caneta'}
              </span>
            </div>

            {/* Paleta de Cores */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((color) => {
                const isSelected = drawingColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setUI({ drawingColor: color })}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: isSelected
                        ? '2px solid var(--text)'
                        : '1.5px solid var(--border-strong)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      outline: isSelected ? '2px solid var(--accent)' : 'none',
                      outlineOffset: 1,
                      transition: 'transform 0.1s ease',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={`Cor ${color}`}
                  >
                    {isSelected && (
                      <Check
                        size={11}
                        style={{
                          color: color === '#ffffff' ? '#000000' : '#ffffff',
                          strokeWidth: 3,
                        }}
                      />
                    )}
                  </button>
                );
              })}

              <label
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '1.5px dashed var(--border-strong)',
                  background: 'var(--bg-subtle)',
                }}
                title="Escolher cor personalizada"
              >
                <Palette size={11} style={{ color: 'var(--text-3)' }} />
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => setUI({ drawingColor: e.target.value })}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Seleção de Espessura do Traço */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', width: 60 }}>Espessura:</span>
              {tool === 'highlighter' ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  {[14, 22, 32].map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`btn btn-xs ${highlighterWidth === w ? 'btn-active' : 'btn-ghost'}`}
                      onClick={() => setUI({ highlighterWidth: w })}
                      style={{ height: 22, fontSize: 11, padding: '0 6px' }}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 4 }}>
                  {[2, 4, 8, 14].map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`btn btn-xs ${penWidth === w ? 'btn-active' : 'btn-ghost'}`}
                      onClick={() => setUI({ penWidth: w })}
                      style={{ height: 22, fontSize: 11, padding: '0 6px' }}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              )}
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      border: isOverTarget
                        ? '2px solid var(--accent)'
                        : '1px dashed var(--accent)',
                      cursor: 'grab',
                      userSelect: 'none',
                      margin: '3px 0',
                    }}
                    title="Arraste esta camada para redefinir o que desenha sobre os nós ou abaixo deles"
                  >
                    <GripVertical size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span>📌 Conceitos & Ligações (Nós)</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                        Divisória: acima fica na frente; abaixo fica atrás dos nós
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--accent-soft-2)' : 'var(--bg-surface)',
                    border: isOverTarget
                      ? '2px solid var(--accent)'
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

                  {/* Radio / Indicador de Camada Ativa */}
                  <button
                    type="button"
                    onClick={() => setUI({ activeLayerId: layer.id })}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: isActive
                        ? '4px solid var(--accent)'
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
                            fontSize: 12,
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
                      title={layer.locked ? 'Camada bloqueada (clique para desbloquear)' : 'Bloquear edição na camada'}
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
                        opacity: Object.keys(layers).length <= 1 ? 0.3 : 0.8,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé informativo */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid var(--border)',
              fontSize: 10.5,
              color: 'var(--text-3)',
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Arraste para cima/baixo para reordenar</span>
            <span style={{ fontWeight: 600 }}>Dica: Espaço para mover</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
