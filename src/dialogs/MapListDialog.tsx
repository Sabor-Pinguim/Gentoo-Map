import { useState } from 'react';
import { Plus, Copy, Trash2, Folder, ExternalLink, Calendar } from 'lucide-react';
import { Modal } from '../components/ui';
import { useMaps, createNewMap, openMap, duplicateMap, deleteMapById } from '../state/session';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import { confirmAction } from '../state/actions';
import { toast } from 'sonner';

export function MapListDialog() {
  const dialog = useUI((s) => s.dialog);
  const openDialog = useUI((s) => s.openDialog);
  const maps = useMaps((s) => s.maps);
  const currentDocId = useEditor((s) => s.doc?.id);

  const [newMapName, setNewMapName] = useState('');
  const [creating, setCreating] = useState(false);

  const isOpen = dialog === 'maps';

  const handleCreate = async () => {
    if (!newMapName.trim()) return;
    try {
      await createNewMap(newMapName.trim());
      setNewMapName('');
      setCreating(false);
      openDialog(null);
      toast.success('Novo mapa criado!');
    } catch {
      toast.error('Falha ao criar mapa.');
    }
  };

  const handleOpen = async (id: string) => {
    if (id === currentDocId) {
      openDialog(null);
      return;
    }
    const ok = await openMap(id);
    if (ok) openDialog(null);
  };

  const handleDuplicate = async (id: string) => {
    const copy = await duplicateMap(id);
    if (copy) toast.success(`Cópia criada: “${copy.name}”`);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir mapa?',
      message: `Tem certeza de que deseja excluir o mapa “${name}”? Esta operação não pode ser desfeita.`,
      confirmLabel: 'Excluir definitivamente',
      danger: true,
    });

    if (confirmed) {
      await deleteMapById(id);
      toast.success('Mapa excluído.');
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && openDialog(null)}
      title="Meus Mapas Conceituais"
      description="Todos os mapas são persistidos no armazenamento local do seu navegador."
      size="wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Barra de Criação Rápida */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="Nome do novo mapa…"
            value={newMapName}
            onChange={(e) => setNewMapName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!newMapName.trim() || creating}
          >
            <Plus size={14} />
            <span>Criar Mapa</span>
          </button>
        </div>

        {/* Lista de Mapas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '55vh', overflowY: 'auto' }}>
          {maps.map((m) => {
            const isCurrent = m.id === currentDocId;
            const updatedDate = new Date(m.updatedAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={m.id}
                className="item-card"
                style={{
                  border: isCurrent ? '1.5px solid var(--accent)' : undefined,
                  background: isCurrent ? 'var(--accent-soft)' : undefined,
                }}
              >
                <div className="item-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Folder
                      size={18}
                      style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="item-card-title"
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        onClick={() => handleOpen(m.id)}
                      >
                        <span>{m.name}</span>
                        {isCurrent && <span className="badge">Atual</span>}
                      </div>

                      <div
                        className="hint"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, marginTop: 2 }}
                      >
                        <span>
                          {m.conceptCount} conceito{m.conceptCount !== 1 ? 's' : ''} · {m.linkCount} conexão
                          {m.linkCount !== 1 ? 'ões' : ''}
                        </span>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={11} />
                          {updatedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="item-card-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleOpen(m.id)}
                      title="Abrir este mapa"
                    >
                      <ExternalLink size={13} />
                      <span>{isCurrent ? 'Abrir' : 'Selecionar'}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => handleDuplicate(m.id)}
                      title="Duplicar mapa"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => handleDelete(m.id, m.name)}
                      title="Excluir mapa"
                      disabled={maps.length <= 1}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

