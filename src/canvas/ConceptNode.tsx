import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { addChild, toggleCollapse, updateConcept } from '../state/actions';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import type { Concept } from '../model/types';

export interface ConceptNodeData {
  concept: Concept;
  hasChildren: boolean;
  hiddenCount: number;
  materialCount: number;
  isSearchHit: boolean;
}

export const ConceptNode = memo(function ConceptNode({ id, selected }: NodeProps) {
  const concept = useEditor((s) => s.doc?.concepts[id]);
  const isEditing = useEditor((s) => s.editing?.type === 'node' && s.editing.id === id);
  const searchQuery = useUI((s) => s.searchQuery.trim().toLowerCase());
  const setMeasured = useEditor((s) => s.setMeasured);
  const setEditing = useEditor((s) => s.setEditing);

  const nodeRef = useRef<HTMLDivElement>(null);
  const [inlineTitle, setInlineTitle] = useState(concept?.title ?? '');

  const hasChildren = useEditor((s) => {
    if (!s.doc) return false;
    for (const l of Object.values(s.doc.links)) {
      if (l.kind === 'hierarchy' && l.source === id) return true;
    }
    return false;
  });

  const hiddenCount = useEditor((s) => {
    const c = s.doc?.concepts[id];
    if (!c?.collapsed || !s.doc) return 0;
    // calcula quantos descendentes estão ocultos
    let count = 0;
    const stack = [id];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const curr = stack.pop()!;
      for (const l of Object.values(s.doc.links)) {
        if (l.kind === 'hierarchy' && l.source === curr && !visited.has(l.target)) {
          visited.add(l.target);
          count++;
          stack.push(l.target);
        }
      }
    }
    return count;
  });

  // Atualiza medição do nó para algoritmos de layout
  useEffect(() => {
    if (!nodeRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setMeasured({ [id]: { width: Math.round(width), height: Math.round(height) } });
        }
      }
    });
    observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, [id, setMeasured]);

  useEffect(() => {
    if (concept) setInlineTitle(concept.title);
  }, [concept?.title]);

  if (!concept) return null;

  const isSearchHit =
    Boolean(searchQuery) &&
    (concept.title.toLowerCase().includes(searchQuery) ||
      concept.description.toLowerCase().includes(searchQuery) ||
      concept.content.summary.toLowerCase().includes(searchQuery) ||
      concept.content.notesHtml.toLowerCase().includes(searchQuery));

  const handleFinishEditing = () => {
    setEditing(null);
    if (inlineTitle !== concept.title) {
      updateConcept(id, { title: inlineTitle }, `node-title-${id}`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setInlineTitle(concept.title);
      setEditing(null);
    }
  };

  const style = concept.style;

  return (
    <div
      ref={nodeRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing({ type: 'node', id });
      }}
      className={`concept-node shape-${style.shape} color-${style.color} font-${style.fontSize} ${
        selected ? 'selected' : ''
      } ${isSearchHit ? 'search-hit' : ''}`}
      style={{
        width: concept.width,
        minHeight: concept.height,
      }}
    >
      {/* Handles para conexões em todos os 4 lados */}
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Top} id="top-src" />
      <Handle type="target" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Bottom} id="bottom-src" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Left} id="left-src" />
      <Handle type="target" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Right} id="right-src" />

      {/* Conteúdo textual do nó: apenas o título */}
      <div className="node-content-wrap">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            className="input-bare node-title"
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={handleKeyDown}
            style={{ fontWeight: style.bold ? 700 : 500 }}
          />
        ) : (
          <div className={`node-title ${style.bold ? 'is-bold' : ''}`}>
            {concept.title.trim() ? (
              concept.title
            ) : (
              <span className="node-title-placeholder">Sem título</span>
            )}
          </div>
        )}
      </div>

      {/* Botão de expansão/recolhimento para nós pais */}
      {hasChildren && (
        <button
          type="button"
          className={`node-collapse-btn ${concept.collapsed ? 'is-collapsed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse(id);
          }}
          title={concept.collapsed ? `Expandir ramo (+${hiddenCount} ocultos)` : 'Recolher ramo'}
          aria-label={concept.collapsed ? `Expandir ramo com ${hiddenCount} conceitos ocultos` : 'Recolher ramo'}
        >
          {concept.collapsed ? (
            <>
              <ChevronRight size={12} />
              <span>+{hiddenCount}</span>
            </>
          ) : (
            <ChevronDown size={12} />
          )}
        </button>
      )}

      {/* Botão de adição rápida de filho ao passar o mouse */}
      <button
        type="button"
        className="quick-add-handle quick-add-bottom"
        onClick={(e) => {
          e.stopPropagation();
          addChild(id);
        }}
        title="Criar conceito filho conectado"
        aria-label="Criar conceito filho"
      >
        <Plus size={11} />
      </button>
    </div>
  );
});

