import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SaboborExplosion } from './SaboborExplosion';
import { GentooPenguinSvg } from './GentooPenguinSvg';

interface GentooLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Curiosidades científicas rigorosamente verificadas sobre o Pinguim-Gentoo (Pygoscelis papua),
 * baseadas em dados do British Antarctic Survey, Oceanwide Expeditions e IUCN.
 */
const GENTOO_FACTS = [
  '⚡ Recordista dos Mares: O pinguim-gentoo (Pygoscelis papua) é oficialmente a ave nadadora mais rápida do mundo, atingindo até 36 km/h sob a água com suas asas que atuam como hidrofólios!',
  '🧬 Etimologia: O nome do gênero "Pygoscelis" vem do grego clássico (pyge = cauda e skelos = pernas), significando literalmente "com pernas na cauda", já que suas patas traseiras funcionam como eficientes lemes.',
  '💎 Moeda de Amor: Machos e fêmeas cortejam presenteando-se com pedrinhas redondas e limpas para construir ninhos elevados que evitam a água do degelo polar. O furto de pedras entre vizinhos é frequente!',
  '🪶 Cauda de Leme: Entre todas as 18 espécies de pinguins, o gentoo possui a cauda mais longa e rígida (com até 18 penas timoneiras), que balança vigorosamente de um lado para o outro quando ele caminha.',
  '🌊 Mergulhador Profundo: Podem mergulhar a mais de 200 metros de profundidade e realizar mais de 450 mergulhos em um único dia em busca de krill antártico, lulas e pequenos peixes.',
  '👑 Faixa "Bonnet": A icônica faixa branca triangular sobre o topo da cabeça, ligando os dois olhos como um capuz, é a assinatura biológica exclusiva do gentoo, visível mesmo na neblina polar.',
  '🤝 Paternidade Compartilhada: Casais de gentoo são monogâmicos e revezam turnos rigorosamente iguais na incubação dos ovos e na proteção dos filhotes contra predadores como gaivotas e mandriões.',
  '🎺 Trombeta Antártica: Seu chamado de acasalamento é potente e soa como uma trombeta de ar ou um zurro, permitindo que casais se localizem em meio a colônias ruidosas com milhares de aves.',
  '📏 Terceiro Maior: É a terceira maior espécie de pinguim do planeta (atrás apenas do Imperador e do Rei), medindo até 90 cm de altura e pesando até 8,5 kg antes da muda anual de penas.',
  '🧊 Resiliência Climática: Enquanto espécies estritamente dependentes de gelo marinho têm sofrido, o pinguim-gentoo tem expandido suas colônias mais ao sul na Península Antártica.',
  '🐧 O Mascote dos Sistemas: Além de batizar a célebre distribuição Linux Gentoo pelo foco em máxima performance, ele dá nome ao Gentoo Map pela fluidez e rapidez na organização das suas ideias!',
];

export function GentooLogo({ size = 32, showText = false, className = '' }: GentooLogoProps) {
  const [waddling, setWaddling] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showSabobor, setShowSabobor] = useState(false);
  // Não persiste no reload (ao dar F5, volta ao normal)
  const [isCinemaActive, setIsCinemaActive] = useState<boolean>(false);

  // Limpa qualquer chave residual salva anteriormente
  useEffect(() => {
    try {
      localStorage.removeItem('gentoo_cinema_unlocked');
    } catch {
      // ignore
    }
  }, []);

  const isHoveredRef = useRef(false);
  const pressed6Ref = useRef<number>(0);

  // Monitora o atalho secreto "6" e depois "7" com o mouse em cima do pinguim
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em campos de texto
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.tiptap')
      ) {
        return;
      }

      if (!isHoveredRef.current) return;

      const now = Date.now();
      if (e.key === '6') {
        pressed6Ref.current = now;
      } else if (e.key === '7' && now - pressed6Ref.current < 2500) {
        pressed6Ref.current = 0;
        setShowSabobor(true);
        setIsCinemaActive(true);
        toast('🔥 SABOBOR PINGUIM 67 ATIVADO! 💥', {
          description: 'Você desbloqueou o modo Absolute Cinema do Pinguim Gentoo!',
          duration: 5000,
        });
      } else {
        pressed6Ref.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClick = useCallback(() => {
    setWaddling(true);
    setTimeout(() => setWaddling(false), 800);

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount === 7) {
      toast.success('🏆 Conquista Desbloqueada: Mestre dos Pinguins!', {
        description: 'Você explorou todas as curiosidades antárticas!',
        duration: 5000,
      });
    } else {
      const fact = GENTOO_FACTS[(nextCount - 1) % GENTOO_FACTS.length];
      toast('🐧 Pinguim-Gentoo (Pygoscelis papua)', {
        description: fact,
        duration: 4500,
      });
    }
  }, [clickCount]);

  return (
    <>
      <div
        className={`gentoo-logo-wrap ${waddling ? 'is-waddling' : ''} ${className}`}
        onClick={handleClick}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
          pressed6Ref.current = 0;
        }}
        title={
          isCinemaActive
            ? 'Pinguim-Gentoo (Pygoscelis papua) · Modo Absolute Cinema Ativado!'
            : 'Pinguim-Gentoo (Pygoscelis papua) · Clique para curiosidades'
        }
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          cursor: 'pointer',
          userSelect: 'none',
          padding: isCinemaActive ? '3px 8px' : '3px 6px',
          transition: 'padding 0.3s ease',
        }}
      >
        <GentooPenguinSvg size={size} cinemaMode={isCinemaActive} />

        {showText && (
          <span
            style={{
              fontWeight: 700,
              fontSize: 14.5,
              letterSpacing: '-0.02em',
              color: 'var(--text-1)',
            }}
          >
            Gentoo Map
          </span>
        )}
      </div>

      {showSabobor && <SaboborExplosion onClose={() => setShowSabobor(false)} />}
    </>
  );
}
