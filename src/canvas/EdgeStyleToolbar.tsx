import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import {
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Minus,
  Spline,
  Trash2,
  Check,
} from 'lucide-react';
import type { Link, ArrowStyle, LineStyle, ColorKey } from '../model/types';
import { setLinkStyle, reverseLink, deleteSelection } from '../state/actions';
import { EDGE_PALETTE, getLinkEdgeColor } from './edgeColors';

interface EdgeStyleToolbarProps {
  link: Link;
}

const ARROW_OPTIONS: { id: ArrowStyle; label: string; icon: React.ReactNode }[] = [
  { id: 'end', label: 'Seta no destino (→)', icon: <ArrowRight size={14} /> },
  { id: 'start', label: 'Seta na origem (←)', icon: <ArrowLeft size={14} /> },
  { id: 'both', label: 'Ambas as pontas (↔)', icon: <ArrowLeftRight size={14} /> },
  { id: 'none', label: 'Sem setas (—)', icon: <Minus size={14} /> },
];

const LINE_OPTIONS: { id: LineStyle; label: string; preview: string }[] = [
  { id: 'solid', label: 'Contínua', preview: '—————' },
  { id: 'dashed', label: 'Tracejada', preview: '- - - - -' },
  { id: 'dotted', label: 'Pontilhada', preview: '· · · · ·' },
  { id: 'auto', label: 'Automática', preview: 'Auto' },
];

export function EdgeStyleToolbar({ link }: EdgeStyleToolbarProps) {
  const currentArrow = link.style.arrow || 'end';
  const currentLine = link.style.line || 'auto';
  const currentCurve = link.style.curve || 'straight';
  const currentColor = link.style.color || 'default';

  const activeArrowOpt = ARROW_OPTIONS.find((o) => o.id === currentArrow) || ARROW_OPTIONS[0];
  const activeLineOpt = LINE_OPTIONS.find((o) => o.id === currentLine) || LINE_OPTIONS[0];
  const currentColorHex = getLinkEdgeColor(currentColor);

  return (
    <div
      className="edge-style-toolbar nodrag nopan"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '3px 6px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-md, 0 4px 14px rgba(0,0,0,0.12))',
        pointerEvents: 'all',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Seletor de Pontas / Setas */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{
              padding: '3px 6px',
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
            }}
            title="Escolher pontas de seta"
          >
            {activeArrowOpt.icon}
            <span style={{ fontSize: 10, opacity: 0.8 }}>Setas</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" sideOffset={6} align="start" style={{ minWidth: 180, zIndex: 120 }}>
            {ARROW_OPTIONS.map((opt) => (
              <DropdownMenu.Item
                key={opt.id}
                className={`menu-item ${currentArrow === opt.id ? 'active' : ''}`}
                onSelect={() => setLinkStyle([link.id], { arrow: opt.id })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {currentArrow === opt.id && <Check size={13} style={{ color: 'var(--accent)' }} />}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

      {/* 2. Seletor de Traço (Contínua, Tracejada, Pontilhada) */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{
              padding: '3px 6px',
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
            }}
            title="Escolher tipo de traço (contínua, tracejada, pontilhada)"
          >
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{activeLineOpt.preview}</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" sideOffset={6} align="start" style={{ minWidth: 170, zIndex: 120 }}>
            {LINE_OPTIONS.map((opt) => (
              <DropdownMenu.Item
                key={opt.id}
                className={`menu-item ${currentLine === opt.id ? 'active' : ''}`}
                onSelect={() => setLinkStyle([link.id], { line: opt.id })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              >
                <span>{opt.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', opacity: 0.6, fontSize: 11 }}>{opt.preview}</span>
                  {currentLine === opt.id && <Check size={13} style={{ color: 'var(--accent)' }} />}
                </div>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

      {/* 3. Alternador de Curvatura (Reta vs Curva) */}
      <button
        type="button"
        className={`btn btn-sm btn-ghost ${currentCurve === 'curved' ? 'active' : ''}`}
        style={{
          padding: '3px 6px',
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
        }}
        onClick={() => setLinkStyle([link.id], { curve: currentCurve === 'straight' ? 'curved' : 'straight' })}
        title={currentCurve === 'straight' ? 'Alternar para linha curva (Bézier)' : 'Alternar para linha reta'}
      >
        <Spline size={13} style={{ opacity: currentCurve === 'curved' ? 1 : 0.6 }} />
        <span>{currentCurve === 'straight' ? 'Reta' : 'Curva'}</span>
      </button>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

      {/* 4. Seletor de Cor da Linha (Cor Padrão + Paleta) */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{
              padding: '3px 6px',
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
            }}
            title="Escolher cor da linha ou restaurar cor padrão"
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: currentColorHex,
                border: '1px solid rgba(0,0,0,0.2)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 10, opacity: 0.8 }}>
              {currentColor === 'default' ? 'Padrão' : currentColor}
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="menu"
            sideOffset={8}
            align="center"
            style={{
              width: 190,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 130,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
              Cor da Linha
            </div>

            {/* Opção Cor Padrão */}
            <button
              type="button"
              className="btn btn-sm"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                border: currentColor === 'default' ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: currentColor === 'default' ? 'var(--accent-soft)' : 'transparent',
              }}
              onClick={() => setLinkStyle([link.id], { color: 'default' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--edge)',
                    border: '1px solid var(--border-strong)',
                  }}
                />
                <span>Cor Padrão do Mapa</span>
              </div>
              {currentColor === 'default' && <Check size={13} style={{ color: 'var(--accent)' }} />}
            </button>

            {/* Grade de Cores da Paleta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {Object.entries(EDGE_PALETTE).map(([key, hex]) => {
                const isSelected = currentColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: hex,
                      border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected ? '0 0 0 2px var(--bg-surface)' : 'none',
                    }}
                    onClick={() => setLinkStyle([link.id], { color: key as ColorKey })}
                    title={key}
                  >
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

      {/* 5. Inverter Direção */}
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={{ padding: '3px 6px', height: 26 }}
        onClick={() => reverseLink(link.id)}
        title="Inverter direção da conexão"
      >
        <ArrowLeftRight size={13} />
      </button>

      {/* 6. Excluir Conexão */}
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={{ padding: '3px 6px', height: 26, color: 'var(--danger, #ef4444)' }}
        onClick={() => deleteSelection()}
        title="Excluir esta conexão (Del)"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
