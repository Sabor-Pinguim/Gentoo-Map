export const EDGE_PALETTE: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  teal: '#0d9488',
  green: '#16a34a',
  amber: '#d97706',
  orange: '#ea580c',
  red: '#dc2626',
  pink: '#db2777',
  violet: '#7c3aed',
};

/** Retorna a cor exata para arestas e marcadores de ponta de seta */
export function getLinkEdgeColor(colorKey?: string): string {
  if (colorKey && EDGE_PALETTE[colorKey]) {
    return EDGE_PALETTE[colorKey];
  }
  return 'var(--edge)';
}
