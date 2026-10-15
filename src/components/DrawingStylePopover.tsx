import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, Palette, ChevronDown } from 'lucide-react';
import { useUI } from '../state/uiStore';

const COLOR_PRESETS = [
  '#1e293b', // Preto / Grafite
  '#ef4444', // Vermelho
  '#ea580c', // Laranja
  '#f59e0b', // Âmbar / Amarelo
  '#10b981', // Verde
  '#06b6d4', // Ciano
  '#3b82f6', // Azul
  '#8b5cf6', // Violeta / Roxo
  '#ec4899', // Rosa
  '#64748b', // Cinza
  '#ffffff', // Branco
];

const PEN_WIDTHS = [
  { label: 'Fino', width: 2 },
  { label: 'Médio', width: 4 },
  { label: 'Grosso', width: 8 },
  { label: 'Extra', width: 14 },
];

const HIGHLIGHTER_WIDTHS = [
  { label: 'Fino', width: 14 },
  { label: 'Médio', width: 22 },
  { label: 'Largo', width: 34 },
];

export function DrawingStylePopover() {
  const tool = useUI((s) => s.tool);
  const drawingColor = useUI((s) => s.drawingColor);
  const penWidth = useUI((s) => s.penWidth);
  const highlighterWidth = useUI((s) => s.highlighterWidth);
  const setUI = useUI((s) => s.set);

  const [open, setOpen] = useState(false);

  const isDrawing = tool === 'pen' || tool === 'highlighter';
  const currentWidth = tool === 'highlighter' ? highlighterWidth : penWidth;

  const handleSelectColor = (color: string) => {
    setUI({
      drawingColor: color,
      tool: tool === 'highlighter' ? 'highlighter' : 'pen',
    });
  };

  const handleSelectWidth = (w: number) => {
    if (tool === 'highlighter') {
      setUI({ highlighterWidth: w });
    } else {
      setUI({ penWidth: w, tool: 'pen' });
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`btn btn-sm ${open ? 'btn-active' : 'btn-ghost'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 7px',
            height: 28,
            borderRadius: 'var(--radius-sm)',
            border: isDrawing ? '1px solid var(--border-strong)' : '1px solid transparent',
            background: isDrawing ? 'var(--bg-active)' : 'transparent',
          }}
          title={`Cor e espessura da ${tool === 'highlighter' ? 'marca-texto' : 'caneta'}`}
        >
          {/* Círculo com a cor atual da caneta */}
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: drawingColor,
              border: drawingColor.toLowerCase() === '#ffffff'
                ? '1px solid rgba(0,0,0,0.3)'
                : '1.5px solid var(--bg-surface)',
              boxShadow: '0 0 0 1px var(--border-strong)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {/* Indicador visual de espessura */}
          <span
            style={{
              width: Math.min(Math.max(currentWidth, 3), 16),
              height: Math.min(Math.max(currentWidth, 3), 6),
              backgroundColor: drawingColor,
              borderRadius: 3,
              display: 'inline-block',
            }}
          />
          <ChevronDown size={12} style={{ color: 'var(--text-3)', marginLeft: 1 }} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="popover-content"
          side="bottom"
          align="center"
          sideOffset={8}
          style={{
            zIndex: 100,
            width: 240,
            padding: 12,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Cabeçalho */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
            }}
          >
            <span>Cor da Caneta</span>
            <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>
              {tool === 'highlighter' ? 'Marca-texto' : 'Caneta'}
            </span>
          </div>

          {/* Grade de Paleta de Cores Pré-definidas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 7,
              alignItems: 'center',
            }}
          >
            {COLOR_PRESETS.map((color) => {
              const isSelected = drawingColor.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelectColor(color)}
                  style={{
                    width: 26,
                    height: 26,
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
                    outlineOffset: 1.5,
                    transition: 'transform 0.12s ease',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={`Selecionar cor ${color}`}
                >
                  {isSelected && (
                    <Check
                      size={13}
                      style={{
                        color: color === '#ffffff' ? '#000000' : '#ffffff',
                        strokeWidth: 3,
                      }}
                    />
                  )}
                </button>
              );
            })}

            {/* Seletor Livre de Cor Nativo */}
            <label
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '1.5px dashed var(--border-strong)',
                background: 'var(--bg-subtle)',
                transition: 'all 0.12s ease',
              }}
              title="Escolher cor personalizada..."
            >
              <Palette size={13} style={{ color: 'var(--text-2)' }} />
              <input
                type="color"
                value={drawingColor}
                onChange={(e) => handleSelectColor(e.target.value)}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

          {/* Seletor de Espessura do Traço */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Espessura do Traço
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(tool === 'highlighter' ? HIGHLIGHTER_WIDTHS : PEN_WIDTHS).map((item) => {
                const isSelected = currentWidth === item.width;
                return (
                  <button
                    key={item.width}
                    type="button"
                    onClick={() => handleSelectWidth(item.width)}
                    className={`btn btn-xs ${isSelected ? 'btn-active' : 'btn-ghost'}`}
                    style={{
                      flex: 1,
                      height: 26,
                      fontSize: 11,
                      fontWeight: isSelected ? 600 : 400,
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      padding: '0 4px',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pré-visualização ao vivo do traço */}
          <div
            style={{
              height: 26,
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: currentWidth,
                backgroundColor: drawingColor,
                borderRadius: currentWidth / 2,
                opacity: tool === 'highlighter' ? 0.38 : 1,
              }}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
