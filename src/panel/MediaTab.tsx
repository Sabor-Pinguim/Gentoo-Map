import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Video, Music, Upload, ExternalLink as ExtIcon } from 'lucide-react';
import type { Concept, MediaItem } from '../model/types';
import { updateConcept } from '../state/actions';
import { newId } from '../model/factory';
import { putFile, acquireFileUrl, releaseFileUrl } from '../persistence/fileRepo';
import { validateFile, mediaKindOfFile } from '../utils/files';
import { detectEmbed, normalizeUrl, openExternal } from '../utils/url';
import { toast } from 'sonner';

interface MediaTabProps {
  concept: Concept;
}

function MediaCard({ item, onRemove }: { item: MediaItem; onRemove: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.source.type === 'file') {
      const fileId = item.source.fileId;
      let active = true;
      acquireFileUrl(fileId).then((url) => {
        if (active && url) setBlobUrl(url);
      });
      return () => {
        active = false;
        releaseFileUrl(fileId);
      };
    }
  }, [item.source]);

  const embed = item.source.type === 'url' ? detectEmbed(item.source.url) : null;
  const fileUrl = item.source.type === 'file' ? blobUrl : null;

  return (
    <div className="item-card">
      <div className="item-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {item.kind === 'video' ? (
            <Video size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          ) : (
            <Music size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          )}
          <div className="item-card-title">{item.title}</div>
        </div>

        <div className="item-card-actions">
          {item.source.type === 'url' && (
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              onClick={() => openExternal((item.source as { url: string }).url)}
              title="Abrir URL original"
            >
              <ExtIcon size={12} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            onClick={onRemove}
            title="Remover mídia"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Player ou Fallback */}
      <div style={{ marginTop: 6, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {embed?.type === 'iframe' && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={embed.src}
              title={item.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {(embed?.type === 'video' || (item.kind === 'video' && fileUrl)) && (
          <video
            controls
            src={fileUrl || (embed as { src: string }).src}
            style={{ width: '100%', maxHeight: 220, background: '#000' }}
          />
        )}

        {(embed?.type === 'audio' || (item.kind === 'audio' && fileUrl)) && (
          <audio
            controls
            src={fileUrl || (embed as { src: string }).src}
            style={{ width: '100%', marginTop: 4 }}
          />
        )}

        {embed?.type === 'external' && (
          <div className="notice" style={{ alignItems: 'center' }}>
            <span>Este link não permite reprodução incorporada direta.</span>
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => openExternal((item.source as { url: string }).url)}
            >
              <ExtIcon size={12} />
              <span>Abrir Externamente</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaTab({ concept }: MediaTabProps) {
  const [addingUrl, setAddingUrl] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaList = concept.content.media;

  const handleAddUrl = () => {
    const valid = normalizeUrl(url);
    if (!valid) {
      toast.error('Informe uma URL de vídeo ou áudio válida.');
      return;
    }

    const embed = detectEmbed(valid);
    const kind = embed.type === 'audio' ? 'audio' : 'video';

    const newItem: MediaItem = {
      id: newId('med'),
      kind,
      source: { type: 'url', url: valid },
      title: title.trim() || (embed.type === 'iframe' ? `${embed.provider}: ${valid}` : valid),
    };

    updateConcept(concept.id, {
      content: { ...concept.content, media: [...mediaList, newItem] },
    });

    setUrl('');
    setTitle('');
    setAddingUrl(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const kind = mediaKindOfFile(file);
    if (!kind) {
      toast.error(`O arquivo “${file.name}” não é reconhecido como vídeo ou áudio compatível.`);
      return;
    }

    const validation = validateFile(file, kind);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    try {
      const stored = await putFile(file, file.name, file.type);
      const newItem: MediaItem = {
        id: newId('med'),
        kind,
        source: {
          type: 'file',
          fileId: stored.id,
          name: stored.name,
          mime: stored.mime,
          size: stored.size,
        },
        title: file.name,
      };

      updateConcept(concept.id, {
        content: { ...concept.content, media: [...mediaList, newItem] },
      });
      toast.success(`Mídia “${file.name}” adicionada localmente!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar arquivo de mídia.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, media: mediaList.filter((m) => m.id !== id) },
    });
  };

  return (
    <div className="panel-content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="panel-section-title" style={{ margin: 0 }}>
          Vídeos e Áudios ({mediaList.length})
        </span>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Enviar arquivo de vídeo ou áudio do computador"
          >
            <Upload size={13} />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setAddingUrl(!addingUrl)}
          >
            <Plus size={13} />
            <span>URL</span>
          </button>
        </div>
      </div>

      {/* Formulário URL */}
      {addingUrl && (
        <div className="item-card" style={{ border: '1.5px solid var(--accent)' }}>
          <div className="item-card-title">Adicionar Vídeo ou Áudio por URL</div>

          <div className="field">
            <label className="label">Endereço da mídia (YouTube, Vimeo ou link direto)</label>
            <input
              type="text"
              autoFocus
              className="input"
              value={url}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Título da mídia (opcional)</label>
            <input
              type="text"
              className="input"
              value={title}
              placeholder="Ex: Aula explicativa sobre o algoritmo"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
            <button type="button" className="btn btn-sm" onClick={() => setAddingUrl(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddUrl}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Mídias */}
      {mediaList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mediaList.map((item) => (
            <MediaCard key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
          ))}
        </div>
      ) : (
        !addingUrl && (
          <div className="tab-empty-state">
            <Video className="tab-empty-icon" />
            <div className="tab-empty-title">Nenhum vídeo ou áudio</div>
            <div className="tab-empty-desc">
              Adicione vídeos do YouTube/Vimeo ou envie gravações de áudio e vídeo locais.
            </div>
          </div>
        )
      )}
    </div>
  );
}

