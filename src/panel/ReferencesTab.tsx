import { useState } from 'react';
import { Plus, Trash2, Edit2, BookMarked, Copy, Check } from 'lucide-react';
import type { Concept, ReferenceItem } from '../model/types';
import { updateConcept } from '../state/actions';
import { newId } from '../model/factory';
import { toast } from 'sonner';

interface ReferencesTabProps {
  concept: Concept;
}

export function ReferencesTab({ concept }: ReferencesTabProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const refs = concept.content.references;

  const handleSaveAdd = () => {
    if (!title.trim()) {
      toast.error('Informe ao menos o título da referência.');
      return;
    }

    const newRef: ReferenceItem = {
      id: newId('ref'),
      title: title.trim(),
      author: author.trim(),
      year: year.trim(),
      source: source.trim(),
      notes: notes.trim(),
    };

    updateConcept(concept.id, {
      content: { ...concept.content, references: [...refs, newRef] },
    });

    setTitle('');
    setAuthor('');
    setYear('');
    setSource('');
    setNotes('');
    setAdding(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!title.trim()) {
      toast.error('Informe ao menos o título da referência.');
      return;
    }

    const updated = refs.map((r) =>
      r.id === id
        ? {
            ...r,
            title: title.trim(),
            author: author.trim(),
            year: year.trim(),
            source: source.trim(),
            notes: notes.trim(),
          }
        : r
    );

    updateConcept(concept.id, {
      content: { ...concept.content, references: updated },
    });

    setEditingId(null);
    setTitle('');
    setAuthor('');
    setYear('');
    setSource('');
    setNotes('');
  };

  const handleRemove = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, references: refs.filter((r) => r.id !== id) },
    });
  };

  const startEdit = (r: ReferenceItem) => {
    setEditingId(r.id);
    setTitle(r.title);
    setAuthor(r.author);
    setYear(r.year);
    setSource(r.source);
    setNotes(r.notes);
    setAdding(false);
  };

  const copyCitation = (r: ReferenceItem) => {
    // Formata estilo bibliográfico
    const parts: string[] = [];
    if (r.author) parts.push(`${r.author}.`);
    parts.push(`“${r.title}”.`);
    if (r.year) parts.push(`(${r.year}).`);
    if (r.source) parts.push(r.source);

    const citation = parts.join(' ');
    navigator.clipboard.writeText(citation).then(() => {
      toast.success('Citação copiada para a área de transferência!');
    });
  };

  return (
    <div className="panel-content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="panel-section-title" style={{ margin: 0 }}>
          Referências Bibliográficas ({refs.length})
        </span>

        {!adding && !editingId && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              setAdding(true);
              setTitle('');
              setAuthor('');
              setYear('');
              setSource('');
              setNotes('');
            }}
          >
            <Plus size={13} />
            <span>Adicionar</span>
          </button>
        )}
      </div>

      {/* Formulário de Referência */}
      {(adding || editingId) && (
        <div className="item-card" style={{ border: '1.5px solid var(--accent)' }}>
          <div className="item-card-title">
            {adding ? 'Nova Referência' : 'Editar Referência'}
          </div>

          <div className="field">
            <label className="label">Título da obra ou artigo *</label>
            <input
              type="text"
              autoFocus
              className="input"
              value={title}
              placeholder="Ex: Deep Learning"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <div className="field">
              <label className="label">Autor / Instituição</label>
              <input
                type="text"
                className="input"
                value={author}
                placeholder="Ex: Goodfellow, I. et al."
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">Ano</label>
              <input
                type="text"
                className="input"
                value={year}
                placeholder="Ex: 2016"
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Fonte / DOI / ISBN / Editora / URL</label>
            <input
              type="text"
              className="input"
              value={source}
              placeholder="Ex: MIT Press / DOI: 10.1000/xyz"
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Anotações / Citações Relevantes</label>
            <textarea
              className="textarea"
              rows={2}
              value={notes}
              placeholder="Capítulos, páginas ou trecho chave…"
              onChange={(e) => setNotes(e.target.value)}
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

      {/* Lista de Referências */}
      {refs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {refs.map((item) => (
            <div key={item.id} className="item-card">
              <div className="item-card-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                  <BookMarked
                    size={16}
                    style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className="item-card-title">{item.title}</div>
                    {(item.author || item.year) && (
                      <div className="hint" style={{ fontSize: 11.5 }}>
                        {item.author} {item.year ? `(${item.year})` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="item-card-actions">
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => copyCitation(item)}
                    title="Copiar citação formatada"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => startEdit(item)}
                    title="Editar referência"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => handleRemove(item.id)}
                    title="Remover referência"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {item.source && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.source}
                </div>
              )}

              {item.notes && <div className="item-card-desc">{item.notes}</div>}
            </div>
          ))}
        </div>
      ) : (
        !adding && (
          <div className="tab-empty-state">
            <BookMarked className="tab-empty-icon" />
            <div className="tab-empty-title">Nenhuma referência adicionada</div>
            <div className="tab-empty-desc">
              Organize artigos científicos, livros e documentos que fundamentam este conceito.
            </div>
          </div>
        )
      )}
    </div>
  );
}

