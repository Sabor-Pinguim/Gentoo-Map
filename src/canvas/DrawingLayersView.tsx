import { useMemo } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { useEditor } from '../state/editorStore';
import { NODES_LAYER_ID, type DrawingStroke, type DrawingLayer } from '../model/types';
import { pointsToSvgPath } from './drawingUtils';

interface DrawingLayersViewProps {
  draftStroke?: DrawingStroke | null;
}

/**
 * Renderiza os traços vetoriais SVG sincronizados na viewport do React Flow.
 * Divide as camadas em:
 *  - Underlay (abaixo dos nós): zIndex 1
 *  - Overlay (acima dos nós): zIndex 20
 */
export function DrawingLayersView({ draftStroke }: DrawingLayersViewProps) {
  const doc = useEditor((s) => s.doc);

  const { underlayLayers, overlayLayers, strokesByLayer } = useMemo(() => {
    if (!doc) {
      return { underlayLayers: [], overlayLayers: [], strokesByLayer: {} };
    }

    const drawings = doc.drawings;
    const layers = drawings?.layers ?? doc.drawingLayers ?? {
      'default-layer-1': {
        id: 'default-layer-1',
        name: 'Anotações',
        visible: true,
        locked: false,
        opacity: 1,
        createdAt: 0,
      },
    };

    const order = drawings?.layerOrder ?? doc.layerOrder ?? [NODES_LAYER_ID, 'default-layer-1'];
    const strokes = drawings?.strokes ?? doc.strokes ?? {};

    // Agrupa os traços por camada
    const byLayer: Record<string, DrawingStroke[]> = {};
    for (const stroke of Object.values(strokes)) {
      if (!byLayer[stroke.layerId]) byLayer[stroke.layerId] = [];
      byLayer[stroke.layerId].push(stroke);
    }

    const underlay: DrawingLayer[] = [];
    const overlay: DrawingLayer[] = [];
    let isAboveNodes = false;

    for (const id of order) {
      if (id === NODES_LAYER_ID) {
        isAboveNodes = true;
        continue;
      }
      const layer = layers[id];
      if (!layer) continue;

      if (isAboveNodes) {
        overlay.push(layer);
      } else {
        underlay.push(layer);
      }
    }

    return {
      underlayLayers: underlay,
      overlayLayers: overlay,
      strokesByLayer: byLayer,
    };
  }, [doc]);

  // Função auxiliar para renderizar uma lista de camadas
  const renderLayerGroup = (layerList: DrawingLayer[], isOverlayGroup: boolean) => {
    if (layerList.length === 0) return null;
    return (
      <svg
        className={`drawing-svg-layer ${isOverlayGroup ? 'drawing-overlay' : 'drawing-underlay'}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: isOverlayGroup ? 20 : 1,
        }}
      >
        {layerList.map((layer) => {
          if (!layer.visible) return null;
          const strokes = strokesByLayer[layer.id] ?? [];
          const isDraftForThisLayer = draftStroke ? draftStroke.layerId === layer.id : false;

          return (
            <g key={layer.id} className="drawing-layer-group" opacity={layer.opacity}>
              {strokes.map((stroke) => {
                const pathData = pointsToSvgPath(stroke.points);
                if (!pathData) return null;
                const isHighlight = stroke.tool === 'highlighter';

                return (
                  <path
                    key={stroke.id}
                    d={pathData}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={isHighlight ? 0.35 : stroke.opacity}
                    style={{
                      mixBlendMode: isHighlight ? 'multiply' : 'normal',
                    }}
                  />
                );
              })}

              {/* Traço de rascunho em tempo real da camada ativa */}
              {isDraftForThisLayer && draftStroke && draftStroke.points.length > 0 && (
                <path
                  d={pointsToSvgPath(draftStroke.points)}
                  fill="none"
                  stroke={draftStroke.color}
                  strokeWidth={draftStroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={draftStroke.tool === 'highlighter' ? 0.45 : draftStroke.opacity}
                  style={{
                    mixBlendMode: draftStroke.tool === 'highlighter' ? 'multiply' : 'normal',
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <ViewportPortal>
      {/* Camadas posicionadas abaixo dos nós */}
      {renderLayerGroup(underlayLayers, false)}

      {/* Camadas posicionadas acima dos nós */}
      {renderLayerGroup(overlayLayers, true)}
    </ViewportPortal>
  );
}
