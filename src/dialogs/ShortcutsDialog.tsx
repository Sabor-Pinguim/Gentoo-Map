import { Modal } from '../components/ui';
import { useUI } from '../state/uiStore';

const SHORTCUT_GROUPS = [
  {
    category: 'Edição e Criação',
    shortcuts: [
      { key: 'Clique Duplo', desc: 'Criar novo conceito no ponto clicado' },
      { key: 'Ctrl + Clique', desc: 'Selecionar múltiplos nós individualmente' },
      { key: 'Arrastar na tela', desc: 'Área de seleção para múltiplos nós' },
      { key: 'Tab', desc: 'Criar conceito filho conectado ao selecionado' },
      { key: 'Enter', desc: 'Criar conceito irmão do mesmo nível' },
      { key: 'F2', desc: 'Editar título do conceito ou frase de ligação' },
      { key: 'Ctrl + D', desc: 'Duplicar nós selecionados com materiais' },
      { key: 'Del / Backspace', desc: 'Excluir elementos selecionados' },
      { key: 'Ctrl + Z', desc: 'Desfazer última alteração' },
      { key: 'Ctrl + Y', desc: 'Refazer alteração' },
    ],
  },
  {
    category: 'Hierarquia e Navegação',
    shortcuts: [
      { key: 'V / H', desc: 'Alternar ferramentas: Seleção (V) / Mão Pan (H)' },
      { key: 'Espaço + Arrastar', desc: 'Mover a tela mantendo a seleção ativa' },
      { key: 'Espaço', desc: 'Recolher ou expandir ramo do conceito selecionado' },
      { key: 'Setas direcionais', desc: 'Navegar para o conceito mais próximo' },
      { key: 'Ctrl + A', desc: 'Selecionar todos os conceitos visíveis' },
      { key: 'Ctrl + F', desc: 'Abrir busca textual de conceitos' },
      { key: 'Shift + 1', desc: 'Ajustar zoom e centralizar todo o mapa' },
      { key: 'Esc', desc: 'Desmarcar seleção / cancelar modo de conexão' },
    ],
  },
];

export function ShortcutsDialog() {
  const dialog = useUI((s) => s.dialog);
  const openDialog = useUI((s) => s.openDialog);

  const isOpen = dialog === 'shortcuts';

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && openDialog(null)}
      title="Atalhos de Teclado"
      description="Operações frequentes podem ser executadas com agilidade pelo teclado."
      size="wide"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {SHORTCUT_GROUPS.map((grp) => (
          <div key={grp.category} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="panel-section-title">{grp.category}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grp.shortcuts.map((sc) => (
                <div
                  key={sc.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: 'var(--text-2)' }}>{sc.desc}</span>
                  <span className="kbd">{sc.key}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

