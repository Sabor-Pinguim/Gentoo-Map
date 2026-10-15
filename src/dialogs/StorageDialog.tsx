import { useState, useEffect } from 'react';
import { Database, ShieldCheck, Trash2, Info, HardDrive } from 'lucide-react';
import { Modal } from '../components/ui';
import { useUI } from '../state/uiStore';
import {
  estimateStorage,
  isStoragePersisted,
  requestPersistentStorage,
} from '../persistence/fileRepo';
import { fileUsageSummary } from '../persistence/gc';
import { runGarbageCollection } from '../state/session';
import { formatBytes } from '../utils/files';
import { toast } from 'sonner';

export function StorageDialog() {
  const dialog = useUI((s) => s.dialog);
  const openDialog = useUI((s) => s.openDialog);

  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<{
    fileCount: number;
    usedBytes: number;
    orphanBytes: number;
    orphanCount: number;
    mapCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const isOpen = dialog === 'storage';

  const refresh = async () => {
    const [est, pers, sum] = await Promise.all([
      estimateStorage(),
      isStoragePersisted(),
      fileUsageSummary(),
    ]);
    setEstimate(est);
    setPersisted(pers);
    setSummary(sum);
  };

  useEffect(() => {
    if (isOpen) {
      void refresh();
    }
  }, [isOpen]);

  const handleRequestPersist = async () => {
    const granted = await requestPersistentStorage();
    if (granted) {
      toast.success('Armazenamento persistente concedido pelo navegador!');
    } else {
      toast.info('O navegador não concedeu persistência adicional no momento.');
    }
    void refresh();
  };

  const handleRunGc = async () => {
    setLoading(true);
    try {
      const res = await runGarbageCollection();
      if (res.removed > 0) {
        toast.success(
          `Limpeza concluída: ${res.removed} arquivo(s) não referenciado(s) removido(s) (${formatBytes(
            res.freed
          )} liberados).`
        );
      } else {
        toast.info('Não há arquivos órfãos para remover. Todos os arquivos em disco estão em uso.');
      }
      await refresh();
    } catch {
      toast.error('Erro ao executar a limpeza.');
    } finally {
      setLoading(false);
    }
  };

  const percentUsed =
    estimate && estimate.quota > 0
      ? Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
      : 0;

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && openDialog(null)}
      title="Gerenciamento de Armazenamento Local"
      description="Todos os dados, anotações e arquivos anexados residem no IndexedDB do seu navegador."
      size="wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Aviso de Sincronização */}
        <div className="notice warning">
          <Info size={16} />
          <div>
            <strong>Aviso de Privacidade e Sincronização:</strong> Seus mapas e arquivos são
            armazenados <em>exclusivamente neste computador e navegador</em>. Eles não são enviados
            para a nuvem nem sincronizados automaticamente com outros dispositivos. Exporte cópias
            em backup (.cmapzip) regularmente.
          </div>
        </div>

        {/* Cota do Navegador */}
        {estimate && (
          <div className="item-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HardDrive size={18} style={{ color: 'var(--accent)' }} />
                <span className="item-card-title">Capacidade de Armazenamento do Navegador</span>
              </div>
              <span className="hint" style={{ fontWeight: 600 }}>
                {formatBytes(estimate.usage)} de {formatBytes(estimate.quota)} ({percentUsed}%)
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: 8,
                background: 'var(--bg-muted)',
                borderRadius: 4,
                overflow: 'hidden',
                marginTop: 6,
              }}
            >
              <div
                style={{
                  width: `${percentUsed}%`,
                  height: '100%',
                  background: percentUsed > 85 ? 'var(--danger)' : 'var(--accent)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Estatísticas de Arquivos */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="item-card">
              <div className="label">Total de Mapas Salvos</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                {summary.mapCount}
              </div>
            </div>

            <div className="item-card">
              <div className="label">Arquivos Anexados em Uso</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                {summary.fileCount} ({formatBytes(summary.usedBytes)})
              </div>
            </div>
          </div>
        )}

        {/* Persistência e Coleta de Lixo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div className="item-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: persisted ? 'var(--success)' : 'var(--text-3)' }} />
              <div>
                <div className="item-card-title">
                  {persisted ? 'Armazenamento Persistente Ativo' : 'Armazenamento com Limpeza Automática'}
                </div>
                <div className="hint" style={{ fontSize: 11 }}>
                  {persisted
                    ? 'O navegador protegerá seus dados contra exclusão quando o disco estiver cheio.'
                    : 'Solicite persistência para evitar que o navegador descarte dados locais.'}
                </div>
              </div>
            </div>

            {!persisted && (
              <button type="button" className="btn btn-sm" onClick={handleRequestPersist}>
                Solicitar Persistência
              </button>
            )}
          </div>

          <div className="item-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trash2 size={18} style={{ color: 'var(--text-2)' }} />
              <div>
                <div className="item-card-title">Coleta de Lixo (Arquivos Órfãos)</div>
                <div className="hint" style={{ fontSize: 11 }}>
                  {summary && summary.orphanCount > 0
                    ? `Existem ${summary.orphanCount} arquivo(s) não mais referenciados (${formatBytes(
                        summary.orphanBytes
                      )}).`
                    : 'Todos os arquivos armazenados estão vinculados a mapas ativos.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm"
              disabled={loading || !summary || summary.orphanCount === 0}
              onClick={handleRunGc}
            >
              <Database size={13} />
              <span>Limpar Órfãos</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

