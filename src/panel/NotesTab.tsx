import { NotesEditor } from './NotesEditor';
import type { Concept } from '../model/types';
import { updateConcept } from '../state/actions';
import { stripHtml } from '../model/factory';

interface NotesTabProps {
  concept: Concept;
}

export function NotesTab({ concept }: NotesTabProps) {
  const handleNotesChange = (html: string) => {
    updateConcept(
      concept.id,
      { content: { ...concept.content, notesHtml: html } },
      `notes-${concept.id}`
    );
  };

  const plainText = stripHtml(concept.content.notesHtml);
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const chars = plainText.length;

  return (
    <div className="panel-content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="panel-section-title" style={{ margin: 0 }}>
          Anotações Extensas
        </span>
        <span className="hint" style={{ fontSize: 11.5 }}>
          {words} palavras · {chars} caracteres
        </span>
      </div>

      <NotesEditor
        contentHtml={concept.content.notesHtml}
        onChange={handleNotesChange}
      />

      <div className="hint" style={{ fontSize: 11.5, marginTop: 4 }}>
        As anotações são salvas automaticamente em tempo real no banco local do navegador.
      </div>
    </div>
  );
}

