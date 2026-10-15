import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import { Modal } from '../components/ui';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import { focusConcept } from '../state/actions';
import { stripHtml } from '../model/factory';
import type { Concept } from '../model/types';

export function SearchModal() {
  const searchOpen = useUI((s) => s.searchOpen);
  const setUI = useUI((s) => s.set);
  const doc = useEditor((s) => s.doc);

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      // Mantém query global sincronizada para destaques no canvas
      setUI({ searchQuery: '' });
    }
  }, [searchOpen, setUI]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setUI({ searchQuery: val });
  };

  const results = useMemo(() => {
    if (!doc || !query.trim()) return [];
    const q = query.trim().toLowerCase();

    const matches: { concept: Concept; matchIn: string }[] = [];

    for (const c of Object.values(doc.concepts)) {
      if (c.title.toLowerCase().includes(q)) {
        matches.push({ concept: c, matchIn: 'Título' });
      } else if (c.description.toLowerCase().includes(q)) {
        matches.push({ concept: c, matchIn: 'Descrição' });
      } else if (c.content.summary.toLowerCase().includes(q)) {
        matches.push({ concept: c, matchIn: 'Resumo geral' });
      } else if (stripHtml(c.content.notesHtml).toLowerCase().includes(q)) {
        matches.push({ concept: c, matchIn: 'Anotações extensas' });
      } else if (c.content.references.some((r) => r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q))) {
        matches.push({ concept: c, matchIn: 'Referências bibliográficas' });
      }
    }

    return matches;
  }, [doc, query]);

  const handleSelect = (conceptId: string) => {
    setUI({ searchOpen: false });
    focusConcept(conceptId);
  };

  return (
    <Modal
      open={searchOpen}
      onOpenChange={(open) => {
        if (!open) {
          setUI({ searchOpen: false, searchQuery: '' });
        }
      }}
      title="Pesquisar Conceitos no Mapa"
      description="Localize termos em títulos, descrições, anotações e referências."
      size="wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
            }}
          />
          <input
            autoFocus
            type="text"
            className="input"
            style={{ paddingLeft: 36, fontSize: 14 }}
            placeholder="Digite para pesquisar em todo o mapa…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </div>

        {/* Resultados */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.length > 0 ? (
            results.map(({ concept, matchIn }) => (
              <div
                key={concept.id}
                className="item-card"
                style={{ cursor: 'pointer', transition: 'background var(--dur-fast)' }}
                onClick={() => handleSelect(concept.id)}
              >
                <div className="item-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span
                      className={`panel-concept-dot concept-node color-${concept.style.color}`}
                      style={{
                        width: 10,
                        height: 10,
                        minWidth: 'unset',
                        padding: 0,
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className="item-card-title">{concept.title || 'Sem título'}</div>
                      {concept.description && (
                        <div className="hint" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {concept.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge" style={{ fontSize: 10 }}>
                      Encontrado em: {matchIn}
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
              </div>
            ))
          ) : query.trim() ? (
            <div className="tab-empty-state">
              <Search className="tab-empty-icon" />
              <div className="tab-empty-title">Nenhum resultado encontrado</div>
              <div className="tab-empty-desc">
                Não foram encontrados conceitos contendo “{query}”.
              </div>
            </div>
          ) : (
            <div className="tab-empty-state">
              <BookOpen className="tab-empty-icon" />
              <div className="tab-empty-title">Busca em tempo real</div>
              <div className="tab-empty-desc">
                Digite uma palavra-chave para filtrar conceitos e navegar diretamente até eles.
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

