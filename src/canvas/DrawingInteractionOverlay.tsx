import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { toast } from 'sonner';
import { useUI } from '../state/uiStore';
import { useEditor } from '../state/editorStore';
import { addDrawingStroke, deleteDrawingStrokes } from '../state/actions';
import { newId } from '../model/factory';
import type { DrawingStroke, Point } from '../model/types';
import { isStrokeHit } from './drawingUtils';

interface DrawingInteractionOverlayProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  flowInstance: ReactFlowInstance | null;
  onDraftChange: (stroke: DrawingStroke | null) => void;
}

export function DrawingInteractionOverlay({
  flowInstance,
  onDraftChange,
}: DrawingInteractionOverlayProps) {
  const tool = useUI((s) => s.tool);
  const activeLayerIdFromStore = useUI((s) => s.activeLayerId);
  const drawingColor = useUI((s) => s.drawingColor);
  const penWidth = useUI((s) => s.penWidth);
  const highlighterWidth = useUI((s) => s.highlighterWidth);

  const doc = useEditor((s) => s.doc);

  const isDrawingTool = tool === 'pen' || tool === 'highlighter' || tool === 'eraser';

  // Monitora se a barra de espaço está pressionada para permitir pan temporário
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          setIsSpaceHeld(true);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };
    const handleBlur = () => setIsSpaceHeld(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const isInteractingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const erasedStrokeIdsRef = useRef<Set<string>>(new Set());

  // Determina a camada ativa de desenho
  const targetLayerId =
    activeLayerIdFromStore ??
    (doc?.drawings?.layers && Object.keys(doc.drawings.layers)[0]) ??
    (doc?.drawingLayers && Object.keys(doc.drawingLayers)[0]) ??
    'default-layer-1';

  const toFlowCoordinates = useCallback(
    (e: React.PointerEvent): Point | null => {
      if (!flowInstance) return null;
      // screenToFlowPosition espera clientPosition diretamente (clientX, clientY),
      // pois desconta internamente o boundingClientRect do container do React Flow.
      return flowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
    },
    [flowInstance]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Botão direito ou do meio deixa o React Flow lidar (navegação/menu)
    if (e.button !== 0 || isSpaceHeld) return;

    // Verifica se a camada ativa está bloqueada
    const currentLayer = doc?.drawings?.layers?.[targetLayerId] ?? doc?.drawingLayers?.[targetLayerId];
    if (currentLayer && currentLayer.locked && tool !== 'eraser') {
      toast.warning(`A camada "${currentLayer.name}" está bloqueada para edição.`);
      return;
    }

    const flowPos = toFlowCoordinates(e);
    if (!flowPos) return;

    isInteractingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === 'pen' || tool === 'highlighter') {
      pointsRef.current = [flowPos];
      const stroke: DrawingStroke = {
        id: newId('draft'),
        layerId: targetLayerId,
        tool,
        color: drawingColor,
        width: tool === 'highlighter' ? highlighterWidth : penWidth,
        opacity: tool === 'highlighter' ? 0.38 : 1,
        points: [flowPos],
        createdAt: Date.now(),
      };
      onDraftChange(stroke);
    } else if (tool === 'eraser') {
      erasedStrokeIdsRef.current = new Set();
      checkEraserHit(flowPos);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractingRef.current || isSpaceHeld) return;

    const flowPos = toFlowCoordinates(e);
    if (!flowPos) return;

    if (tool === 'pen' || tool === 'highlighter') {
      const lastPoint = pointsRef.current[pointsRef.current.length - 1];
      if (lastPoint) {
        const dx = flowPos.x - lastPoint.x;
        const dy = flowPos.y - lastPoint.y;
        // Evita pontos repetidos ou excessivamente próximos (< 2px em coordenadas do flow)
        if (dx * dx + dy * dy < 4) return;
      }

      pointsRef.current.push(flowPos);
      const stroke: DrawingStroke = {
        id: newId('draft'),
        layerId: targetLayerId,
        tool,
        color: drawingColor,
        width: tool === 'highlighter' ? highlighterWidth : penWidth,
        opacity: tool === 'highlighter' ? 0.38 : 1,
        points: [...pointsRef.current],
        createdAt: Date.now(),
      };
      onDraftChange(stroke);
    } else if (tool === 'eraser') {
      checkEraserHit(flowPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignora erro se ponteiro já foi liberado
    }

    if (tool === 'pen' || tool === 'highlighter') {
      if (pointsRef.current.length > 0) {
        addDrawingStroke({
          id: newId('stroke'),
          layerId: targetLayerId,
          tool,
          color: drawingColor,
          width: tool === 'highlighter' ? highlighterWidth : penWidth,
          opacity: tool === 'highlighter' ? 0.38 : 1,
          points: pointsRef.current,
          createdAt: Date.now(),
        });
      }
      pointsRef.current = [];
      onDraftChange(null);
    } else if (tool === 'eraser') {
      if (erasedStrokeIdsRef.current.size > 0) {
        deleteDrawingStrokes(Array.from(erasedStrokeIdsRef.current));
      }
      erasedStrokeIdsRef.current = new Set();
    }
  };

  // Testa colisão da borracha com traços de camadas visíveis e desbloqueadas
  const checkEraserHit = (flowPos: Point) => {
    const strokes = doc?.drawings?.strokes ?? doc?.strokes;
    const layers = doc?.drawings?.layers ?? doc?.drawingLayers;
    if (!strokes || !layers) return;

    const toDelete: string[] = [];
    for (const stroke of Object.values(strokes)) {
      if (erasedStrokeIdsRef.current.has(stroke.id)) continue;
      const layer = layers[stroke.layerId];
      // Ignora camadas ocultas ou bloqueadas
      if (layer && (!layer.visible || layer.locked)) continue;

      if (isStrokeHit(stroke, flowPos, 18)) {
        toDelete.push(stroke.id);
        erasedStrokeIdsRef.current.add(stroke.id);
      }
    }

    if (toDelete.length > 0) {
      deleteDrawingStrokes(toDelete);
    }
  };

  if (!isDrawingTool) return null;

  const cursorStyle = isSpaceHeld
    ? 'grab'
    : tool === 'eraser'
    ? 'crosshair'
    : 'crosshair';

  return (
    <div
      className={`drawing-interaction-overlay ${isSpaceHeld ? 'is-space-panning' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        cursor: cursorStyle,
        pointerEvents: isSpaceHeld ? 'none' : 'all',
        touchAction: 'none',
      }}
    />
  );
}
