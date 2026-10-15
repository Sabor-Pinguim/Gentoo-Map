import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import saboborAudioUrl from '../assets/sabobor-pinguim.mp3';
import { GentooPenguinSvg } from './GentooPenguinSvg';

interface SaboborExplosionProps {
  onClose: () => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  delay: number;
  duration: number;
}

const EMOJIS = ['🔥', '💥', '🐧', '🔥', '💥', '✨', '⚡', '🔥', '💥'];

export function SaboborExplosion({ onClose }: SaboborExplosionProps) {
  const [active, setActive] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gera 48 partículas explosivas em direções radiais aleatórias
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const angle = (i / 48) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const distance = 250 + Math.random() * 450;
      return {
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0.8 + Math.random() * 1.5,
        rotate: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.3,
        duration: 1.2 + Math.random() * 0.8,
      };
    });
  }, []);

  useEffect(() => {
    // Toca a musiquinha do Sabobor Pinguim
    try {
      const audio = new Audio(saboborAudioUrl);
      audioRef.current = audio;
      audio.volume = 0.85;
      void audio.play().catch((err) => {
        console.warn('Audio play prevented:', err);
      });
      audio.onended = () => {
        handleDismiss();
      };
    } catch (e) {
      console.warn('Audio failed:', e);
    }

    // Auto-dismiss após 6 segundos caso o áudio não emita onended
    const timer = setTimeout(() => {
      handleDismiss();
    }, 6000);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') handleDismiss();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleDismiss = () => {
    setActive(false);
    setTimeout(onClose, 300);
  };

  return createPortal(
    <div
      onClick={handleDismiss}
      className={`sabobor-overlay ${active ? 'is-active' : 'is-fading'}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, rgba(234, 88, 12, 0.45) 0%, rgba(15, 23, 42, 0.88) 75%)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Partículas de fogo e explosão explodindo do centro */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="sabobor-particle"
          style={{
            position: 'absolute',
            fontSize: `${28 * p.scale}px`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            animation: `sabobor-burst ${p.duration}s cubic-bezier(0.12, 0.8, 0.32, 1) ${p.delay}s forwards`,
            ['--tx' as string]: `${p.x}px`,
            ['--ty' as string]: `${p.y}px`,
            ['--rot' as string]: `${p.rotate}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      {/* Explosão Central: O Grande Pinguim Gentoo Absolute Cinema e o 67 */}
      <div
        className="sabobor-center-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'sabobor-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}
      >
        {/* Pinguim Gentoo no modo Absolute Cinema */}
        <div
          style={{
            animation: 'gentoo-cinema-float 2.2s infinite ease-in-out',
            marginBottom: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <GentooPenguinSvg size={130} cinemaMode={true} />

          <div
            style={{
              marginTop: 10,
              fontSize: 'clamp(18px, 3vw, 24px)',
              fontWeight: 900,
              letterSpacing: '0.14em',
              color: '#ffffff',
              textTransform: 'uppercase',
              textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(249, 115, 22, 0.8)',
            }}
          >
            ABSOLUTE CINEMA
          </div>
        </div>

        {/* O Grande 67 em chamas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 48, animation: 'gentoo-waddle 0.5s infinite' }}>🔥</span>
          <h1
            className="sabobor-number-67"
            style={{
              fontSize: 'clamp(64px, 12vw, 110px)',
              fontWeight: 900,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(180deg, #fff7ed 0%, #f97316 45%, #ea580c 75%, #991b1b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 35px #f97316) drop-shadow(0 0 70px #ea580c)',
            }}
          >
            67
          </h1>
          <span style={{ fontSize: 48, animation: 'gentoo-waddle 0.5s infinite reverse' }}>🔥</span>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: '6px 20px',
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.15)',
            border: '2px solid rgba(249, 115, 22, 0.8)',
            boxShadow: '0 0 25px rgba(249, 115, 22, 0.6)',
            color: '#fff',
            fontSize: 'clamp(18px, 3vw, 24px)',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}
        >
          🐧 SABOBOR PINGUIM ATIVADO! 💥
        </div>

        <p
          style={{
            marginTop: 14,
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 13,
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          (Clique em qualquer lugar ou aperte Esc para fechar)
        </p>
      </div>
    </div>,
    document.body
  );
}

