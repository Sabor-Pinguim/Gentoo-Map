import React from 'react';

export interface GentooPenguinSvgProps {
  size?: number;
  cinemaMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente SVG vetorial do Pinguim-Gentoo (Pygoscelis papua).
 * Suporta o modo "Absolute Cinema" ativado pelo easter egg,
 * com mãos levantadas (pose clássica do meme) e chamas nos olhos.
 */
export function GentooPenguinSvg({
  size = 32,
  cinemaMode = false,
  className = '',
  style = {},
}: GentooPenguinSvgProps) {
  // Proporções dinâmicas calculadas com base no tamanho
  const handFontSize = Math.max(13, Math.round(size * 0.44));
  // Fogo bem pequeno e sutil nos olhos (aprox. 5px na barra e 16px no modal)
  const eyeFlameFontSize = Math.max(5, Math.round(size * 0.12));
  const handOffset = Math.round(size * 0.22);

  return (
    <div
      className={`gentoo-penguin-svg-container ${cinemaMode ? 'is-cinema' : ''} ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: cinemaMode
            ? 'drop-shadow(0 2px 8px rgba(249, 115, 22, 0.45)) drop-shadow(0 1.5px 3px rgba(0, 0, 0, 0.3))'
            : 'drop-shadow(0 1.5px 3px rgba(0, 0, 0, 0.22))',
          transition: 'filter 0.3s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'visible',
        }}
      >
        {/* Cauda em cunha (Pygoscelis = cauda de leme/vassoura) */}
        <path d="M14.6 25L16 29L17.4 25Z" fill="#020617" />

        {/* Pés alaranjados com membranas (característica dos Gentoos) */}
        <ellipse cx="12.2" cy="27.2" rx="3.4" ry="1.7" fill="#ea580c" />
        <ellipse cx="12.2" cy="27" rx="3.1" ry="1.5" fill="#f97316" />
        <ellipse cx="19.8" cy="27.2" rx="3.4" ry="1.7" fill="#ea580c" />
        <ellipse cx="19.8" cy="27" rx="3.1" ry="1.5" fill="#f97316" />

        {/* Corpo e Cabeça (Preto / Ardósia característico do Gentoo) */}
        <path
          d="M16 3.8C10.8 3.8 8.8 9.5 8.8 17.5C8.8 24 10.6 26.5 16 26.5C21.4 26.5 23.2 24 23.2 17.5C23.2 9.5 21.2 3.8 16 3.8Z"
          fill="var(--text-1, #0f172a)"
        />

        {/* Asas / Nadadeiras hidrodinâmicas com borda branca interna clássica */}
        <path
          d="M8.8 14.5C7.2 17.5 6.4 21.5 8.2 24C9 22.8 9.6 19.5 9.4 16Z"
          fill="#020617"
          opacity="0.95"
        />
        <path
          d="M8.2 23.8C8.8 22.6 9.4 19.5 9.3 16.2"
          stroke="#ffffff"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.85"
        />

        <path
          d="M23.2 14.5C24.8 17.5 25.6 21.5 23.8 24C23 22.8 22.4 19.5 22.6 16Z"
          fill="#020617"
          opacity="0.95"
        />
        <path
          d="M23.8 23.8C23.2 22.6 22.6 19.5 22.7 16.2"
          stroke="#ffffff"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Faixa Branca 'Bonnet' no Topo da Cabeça (Assinatura Exclusiva do Pinguim Gentoo) */}
        <path
          d="M9.6 11.2C9.4 7.8 12.2 4.6 16 4.6C19.8 4.6 22.6 7.8 22.4 11.2C21.2 9.2 18.6 7.8 16 7.8C13.4 7.8 10.8 9.2 9.6 11.2Z"
          fill="#ffffff"
        />
        {/* Extensão da mancha branca até acima dos olhos */}
        <path d="M9.6 11.2C10.6 9.5 12.5 9.5 13.5 11.2C12.4 11.8 10.6 11.8 9.6 11.2Z" fill="#ffffff" />
        <path d="M22.4 11.2C21.4 9.5 19.5 9.5 18.5 11.2C19.6 11.8 21.4 11.8 22.4 11.2Z" fill="#ffffff" />

        {/* Barriga Branca (Tuxedo) */}
        <path
          d="M16 13.8C12.8 13.8 11.2 17.2 11.2 21.8C11.2 25.2 13 26.2 16 26.2C19 26.2 20.8 25.2 20.8 21.8C20.8 17.2 19.2 13.8 16 13.8Z"
          fill="#ffffff"
        />

        {/* Anel orbital branco ao redor dos olhos (específico do Pinguim-Gentoo) */}
        <circle cx="12.8" cy="10.8" r="1.35" fill="#ffffff" />
        <circle cx="19.2" cy="10.8" r="1.35" fill="#ffffff" />

        {/* Olhos do Pinguim com brilho */}
        <circle cx="12.8" cy="10.8" r="0.85" fill="#0f172a" />
        <circle cx="19.2" cy="10.8" r="0.85" fill="#0f172a" />
        <circle cx="12.5" cy="10.5" r="0.28" fill="#ffffff" />
        <circle cx="18.9" cy="10.5" r="0.28" fill="#ffffff" />

        {/* Bico Vermelho-Alaranjado Marcante do Gentoo */}
        <path
          d="M13.6 11.6C13.6 11.6 15.2 16 16 16.3C16.8 16 18.4 11.6 18.4 11.6C17.2 12 14.8 12 13.6 11.6Z"
          fill="#ea580c"
        />
        {/* Laterais vibrantes do bico */}
        <path d="M14 11.8L16 15.8L15 11.9Z" fill="#f97316" />
        <path d="M18 11.8L16 15.8L17 11.9Z" fill="#f97316" />
        {/* Culmen (crista superior escura do bico) */}
        <path d="M15.5 11.6H16.5L16.2 16.2H15.8Z" fill="#0f172a" opacity="0.65" />
        {/* Brilho sutil no bico */}
        <circle cx="16" cy="15.4" r="0.3" fill="#fed7aa" />
      </svg>

      {/* Modo Absolute Cinema: Mãos levantadas e fogo sutil nos olhos */}
      {cinemaMode && (
        <>
          {/* Mão esquerda levantada (polegar voltado para dentro/centro, dedos inclinados para fora) */}
          <span
            className="gentoo-hand-left"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -handOffset,
              top: Math.round(size * 0.04),
              fontSize: `${handFontSize}px`,
              lineHeight: 1,
              transform: 'rotate(-12deg)',
              pointerEvents: 'none',
              userSelect: 'none',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              animation: 'gentoo-cinema-hand-left 1.4s infinite ease-in-out',
            }}
          >
            🖐️
          </span>

          {/* Mão direita levantada (espelhada: polegar voltado para dentro/centro, dedos inclinados para fora) */}
          <span
            className="gentoo-hand-right"
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -handOffset,
              top: Math.round(size * 0.04),
              fontSize: `${handFontSize}px`,
              lineHeight: 1,
              transform: 'scaleX(-1) rotate(-12deg)',
              pointerEvents: 'none',
              userSelect: 'none',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              animation: 'gentoo-cinema-hand-right 1.4s infinite ease-in-out',
            }}
          >
            🖐️
          </span>

          {/* Foguinho no olho esquerdo (cx: 12.8 / 32 = 40%) */}
          <span
            className="gentoo-eye-flame-left"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '40%',
              top: '33.75%',
              transform: 'translate(-50%, -50%)',
              fontSize: `${eyeFlameFontSize}px`,
              lineHeight: 1,
              pointerEvents: 'none',
              userSelect: 'none',
              filter: 'drop-shadow(0 0 1.5px #ea580c)',
              animation: 'gentoo-eye-flame 0.7s infinite ease-in-out',
            }}
          >
            🔥
          </span>

          {/* Foguinho no olho direito (cx: 19.2 / 32 = 60%) */}
          <span
            className="gentoo-eye-flame-right"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '60%',
              top: '33.75%',
              transform: 'translate(-50%, -50%)',
              fontSize: `${eyeFlameFontSize}px`,
              lineHeight: 1,
              pointerEvents: 'none',
              userSelect: 'none',
              filter: 'drop-shadow(0 0 1.5px #ea580c)',
              animation: 'gentoo-eye-flame 0.7s infinite ease-in-out 0.2s',
            }}
          >
            🔥
          </span>
        </>
      )}
    </div>
  );
}
