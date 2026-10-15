import { useState } from 'react';
import { ExternalLink as ExtIcon, Plus, Trash2, Edit2, Check, Globe } from 'lucide-react';
import type { Concept, ExternalLink } from '../model/types';
import { updateConcept } from '../state/actions';
import { newId } from '../model/factory';
import { normalizeUrl, openExternal } from '../utils/url';
import { toast } from 'sonner';

interface LinksTabProps {
  concept: Concept;
}

export function LinksTab({ concept }: LinksTabProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const links = concept.content.links;

  const handleSaveAdd = () => {
    const validUrl = normalizeUrl(url);
    if (!validUrl) {
      toast.error('Informe uma URL válida (ex: https://exemplo.com).');
      return;
    }

    const newLink: ExternalLink = {
      id: newId('link'),
      url: validUrl,
      title: title.trim() || validUrl,
      description: desc.trim(),
    };

    updateConcept(concept.id, {
      content: { ...concept.content, links: [...links, newLink] },
    });

    setUrl('');
    setTitle('');
    setDesc('');
    setAdding(false);
  };

  const handleSaveEdit = (id: string) => {
    const validUrl = normalizeUrl(url);
    if (!validUrl) {
      toast.error('Informe uma URL válida.');
      return;
    }

    const updated = links.map((l) =>
      l.id === id
        ? { ...l, url: validUrl, title: title.trim() || validUrl, description: desc.trim() }
        : l
    );

    updateConcept(concept.id, {
      content: { ...concept.content, links: updated },
    });

    setEditingId(null);
    setUrl('');
    setTitle('');
    setDesc('');
  };

  const handleRemove = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, links: links.filter((l) => l.id !== id) },
    });
  };

  const startEdit = (l: ExternalLink) => {
    setEditingId(l.id);
    setUrl(l.url);
    setTitle(l.title);
    setDesc(l.description);
    setAdding(false);
  };

  return (
    <div className="panel-content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="panel-section-title" style={{ margin: 0 }}>
          Links Externos ({links.length})
        </span>
        {!adding && !editingId && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              setAdding(true);
              setUrl('');
              setTitle('');
              setDesc('');
            }}
          >
            <Plus size={13} />
            <span>Adicionar Link</span>
          </button>
        )}
      </div>

      {/* Formulário de Adicionar / Editar */}
      {(adding || editingId) && (
        <div className="item-card" style={{ border: '1.5px solid var(--accent)' }}>
          <div className="item-card-title">
            {adding ? 'Novo Link Externo' : 'Editar Link'}
          </div>

          <div className="field">
            <label className="label">Endereço Web (URL)</label>
            <input
              type="text"
              autoFocus
              className="input"
              value={url}
              placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Título Personalizado</label>
            <input
              type="text"
              className="input"
              value={title}
              placeholder="Ex: Artigo de Referência"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Descrição (opcional)</label>
            <input
              type="text"
              className="input"
              value={desc}
              placeholder="Comentário sobre a relevância da página…"
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setAdding(false);
                setEditingId(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => (adding ? handleSaveAdd() : handleSaveEdit(editingId!))}
            >
              <Check size={13} />
              <span>Salvar</span>
            </button>
          </div>
        </div>
      )}

      {/* Lista de Links */}
      {links.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map((item) => (
            <div key={item.id} className="item-card">
              <div className="item-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Globe size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div className="item-card-title">{item.title}</div>
                </div>

                <div className="item-card-actions">
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => openExternal(item.url)}
                    title="Abrir em nova aba"
                  >
                    <ExtIcon size={12} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => startEdit(item)}
                    title="Editar link"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => handleRemove(item.id)}
                    title="Remover link"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {item.description && <div className="item-card-desc">{item.description}</div>}

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.url}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !adding && (
          <div className="tab-empty-state">
            <Globe className="tab-empty-icon" />
            <div className="tab-empty-title">Nenhum link associado</div>
            <div className="tab-empty-desc">
              Adicione links para páginas da web, artigos e repositórios relevantes a este conceito.
            </div>
          </div>
        )
      )}
    </div>
  );
}

