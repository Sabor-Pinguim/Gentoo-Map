import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Topbar } from './components/Topbar';
import { Canvas } from './canvas/Canvas';
import { SidebarPanel } from './panel/SidebarPanel';
import { MapListDialog } from './dialogs/MapListDialog';
import { ExportDialog } from './dialogs/ExportDialog';
import { StorageDialog } from './dialogs/StorageDialog';
import { ShortcutsDialog } from './dialogs/ShortcutsDialog';
import { SearchModal } from './dialogs/SearchModal';
import { ConfirmHost, TooltipProvider } from './components/ui';

import { useEditor } from './state/editorStore';
import { useUI, getLastMapId } from './state/uiStore';
import { useMaps, openMap, startAutosave } from './state/session';
import { createRfidPresentationMap } from './model/rfidPresentationMap';
import { listMaps, saveMap } from './persistence/mapRepo';
import { ArrowRight, Loader2, X } from 'lucide-react';

export function App() {
  const [init, setInit] = useState(false);
  const doc = useEditor((s) => s.doc);
  const theme = useUI((s) => s.theme);
  const busy = useUI((s) => s.busy);
  const connectMode = useUI((s) => s.connectMode);
  const setUI = useUI((s) => s.set);

  // Tema claro/escuro/sistema
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const match = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        root.setAttribute('data-theme', match.matches ? 'dark' : 'light');
      };
      apply();
      match.addEventListener('change', apply);
      return () => match.removeEventListener('change', apply);
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Atualiza título da página com o nome do mapa ativo
  useEffect(() => {
    document.title = doc?.name ? `${doc.name} · Gentoo Map` : 'Gentoo Map';
  }, [doc?.name]);

  // Inicialização e recuperação de mapas salvos
  useEffect(() => {
    startAutosave();

    async function bootstrap() {
      try {
        // Assegura que o mapa completo da apresentação RFID e NFC esteja disponível no armazenamento local
        const rfidPresentation = createRfidPresentationMap();
        await saveMap(rfidPresentation);

        const maps = await listMaps();
        const lastId = getLastMapId();

        // Se o usuário não tiver navegado para outro mapa específico (ou se estava no mapa exemplo de IA),
        // abre diretamente o mapa da apresentação RFID/NFC
        const targetId =
          lastId && lastId !== 'map_sample_ia' && maps.some((m) => m.id === lastId)
            ? lastId
            : rfidPresentation.id;

        await openMap(targetId);
        await useMaps.getState().refresh();
      } catch (err) {
        console.error('Falha ao inicializar banco de dados:', err);
      } finally {
        setInit(true);
      }
    }

    void bootstrap();
  }, []);

  if (!init || !doc) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: 'var(--bg-app)',
          color: 'var(--text)',
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>Carregando seus mapas conceituais…</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
        }}
      >
        <Topbar />

      <main
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        <Canvas />
        <SidebarPanel />

        {/* Indicador Flutuante do Modo Conexão */}
        {connectMode && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--accent)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'pop-in 0.15s ease-out',
            }}
          >
            <ArrowRight size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {connectMode.sourceId
                ? 'Clique no conceito de destino para conectar'
                : 'Clique no primeiro conceito (origem) da conexão'}
            </span>
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              onClick={() => setUI({ connectMode: null })}
              title="Cancelar (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Indicador de Operação em Andamento (ex: Organização automática) */}
        {busy && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span>{busy}</span>
          </div>
        )}
      </main>

      {/* Diálogos Globais */}
      <MapListDialog />
      <ExportDialog />
      <StorageDialog />
      <ShortcutsDialog />
      <SearchModal />
      <ConfirmHost />

      {/* Notificações Toaster */}
      <Toaster
        position="bottom-right"
        theme={theme === 'dark' ? 'dark' : 'light'}
        richColors
        closeButton
      />
    </div>
    </TooltipProvider>
  );
}

