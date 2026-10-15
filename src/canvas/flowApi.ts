import type { ReactFlowInstance } from '@xyflow/react';

/** Referência à instância do React Flow para comandos imperativos (zoom, centralizar, exportar). */
let instance: ReactFlowInstance | null = null;
let container: HTMLElement | null = null;

export function setFlowInstance(i: ReactFlowInstance | null, el: HTMLElement | null) {
  instance = i;
  container = el;
}

export function getFlow(): ReactFlowInstance | null {
  return instance;
}

export function getFlowContainer(): HTMLElement | null {
  return container;
}

/** Centro da área visível em coordenadas do mapa. */
export function viewportCenter(): { x: number; y: number } {
  if (!instance || !container) return { x: 0, y: 0 };
  const r = container.getBoundingClientRect();
  return instance.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

