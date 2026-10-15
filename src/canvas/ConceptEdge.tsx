import { memo, useState, useEffect, type KeyboardEvent } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { setLinkLabel } from '../state/actions';
import { useEditor } from '../state/editorStore';
import { getLinkEdgeColor } from './edgeColors';

export const ConceptEdge = memo(function ConceptEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const link = useEditor((s) => s.doc?.links[id]);
  const isEditing = useEditor((s) => s.editing?.type === 'edge' && s.editing.id === id);
  const setEditing = useEditor((s) => s.setEditing);

  const [labelDraft, setLabelDraft] = useState(link?.label ?? '');

  useEffect(() => {
    if (link) setLabelDraft(link.label);
  }, [link?.label]);

  if (!link) return null;

  const isStraight = link.style.curve === 'straight';
  const [edgePath, labelX, labelY] = isStraight
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });

  const handleFinishEditing = () => {
    setEditing(null);
    if (labelDraft !== link.label) {
      setLinkLabel(id, labelDraft, `edge-label-${id}`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setLabelDraft(link.label);
      setEditing(null);
    }
  };

  const isCross = link.kind === 'cross';
  const isDashed = link.style.line === 'dashed' || (link.style.line === 'auto' && isCross);
  const isDotted = link.style.line === 'dotted';
  const strokeColor = selected ? 'var(--accent)' : getLinkEdgeColor(link.style.color);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        className={`${isCross ? 'edge-cross' : ''}`}
        style={{
          strokeDasharray: isDotted ? '3,4' : isDashed ? '6,5' : undefined,
          stroke: strokeColor,
          strokeWidth: selected ? 2.8 : 2.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="concept-edge-label-container nodrag nopan"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing({ type: 'edge', id });
          }}
        >
          {isEditing ? (
            <input
              autoFocus
              type="text"
              className="concept-edge-label-input"
              value={labelDraft}
              placeholder="frase de ligação"
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={handleFinishEditing}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div
              className={`concept-edge-label ${selected ? 'selected' : ''}`}
              title="Dê um clique duplo para editar a frase de ligação"
            >
              {link.label.trim() ? (
                <span>{link.label}</span>
              ) : (
                <span style={{ opacity: 0.45, fontStyle: 'italic', fontSize: 11 }}>
                  + ligar
                </span>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

