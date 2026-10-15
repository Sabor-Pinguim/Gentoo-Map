import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Palette, Check, RotateCcw } from 'lucide-react';
import { useEditor } from '../state/editorStore';
import { setCanvasBackground } from '../state/actions';

const BACKGROUND_PRESETS = [
  { label: 'Branco Puro', color: '#ffffff' },
  { label: 'Papel Creme', color: '#fcfaf6' },
  { label: 'Gelo Suave', color: '#f1f5f9' },
  { label: 'Menta Suave', color: '#f0fdf4' },
  { label: 'Azul Céu', color: '#f0f9ff' },
  { label: 'Grafite', color: '#1e293b' },
  { label: 'Ardósia Escuro', color: '#0f172a' },
  { label: 'Preto Noturno', color: '#090a0f' },
];

export function CanvasBackgroundPopover() {
  const doc = useEditor((s) => s.doc);
  const currentBg = doc?.settings?.backgroundColor;
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="icon-btn"
          title="Alterar cor de fundo do canvas"
          aria-label="Cor de fundo do canvas"
          style={{ position: 'relative' }}
        >
          <Palette size={16} />
          {currentBg && (
            <span
              style={{
                position: 'absolute',
                bottom: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: currentBg,
                border: '1px solid rgba(0,0,0,0.3)',
              }}
            />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="menu"
          align="end"
          sideOffset={6}
          style={{
            width: 230,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              Cor de Fundo do Canvas
            </span>
          </div>

          {/* Opção Padrão Automático */}
          <button
            type="button"
            className="btn btn-sm"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              border: !currentBg ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: !currentBg ? 'var(--accent-soft)' : 'transparent',
              padding: '6px 8px',
            }}
            onClick={() => setCanvasBackground(undefined)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={12} style={{ opacity: 0.7 }} />
              <span>Padrão do Tema (Automático)</span>
            </div>
            {!currentBg && <Check size={13} style={{ color: 'var(--accent)' }} />}
          </button>

          {/* Grade de Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {BACKGROUND_PRESETS.map((preset) => {
              const isSelected = currentBg?.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.color}
                  type="button"
                  style={{
                    height: 28,
                    borderRadius: 6,
                    background: preset.color,
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-strong)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 0 2px var(--bg-surface)' : 'none',
                  }}
                  onClick={() => setCanvasBackground(preset.color)}
                  title={preset.label}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      color={preset.color === '#ffffff' || preset.color === '#fcfaf6' || preset.color === '#f1f5f9' || preset.color === '#f0fdf4' || preset.color === '#f0f9ff' ? '#0f172a' : '#ffffff'}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Seletor Customizado HTML5 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingTop: 6,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cor personalizada:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={currentBg || '#ffffff'}
                onChange={(e) => setCanvasBackground(e.target.value)}
                style={{
                  width: 28,
                  height: 24,
                  padding: 0,
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: 'none',
                }}
              />
              <span style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.8 }}>
                {currentBg || 'Auto'}
              </span>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
