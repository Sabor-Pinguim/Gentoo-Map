import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Image as ImageIcon, Upload, Maximize2 } from 'lucide-react';
import type { Concept, ImageItem } from '../model/types';
import { updateConcept } from '../state/actions';
import { newId } from '../model/factory';
import { putFile, acquireFileUrl, releaseFileUrl } from '../persistence/fileRepo';
import { validateFile } from '../utils/files';
import { normalizeUrl } from '../utils/url';
import { Modal } from '../components/ui';
import { toast } from 'sonner';

interface ImagesTabProps {
  concept: Concept;
}

function ImageCard({
  item,
  onEnlarge,
  onRemove,
}: {
  item: ImageItem;
  onEnlarge: (src: string, caption: string) => void;
  onRemove: () => void;
}) {
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

  const src = item.source.type === 'url' ? item.source.url : blobUrl;

  return (
    <div className="image-thumb-card">
      {src ? (
        <img
          src={src}
          alt={item.alt || item.caption || 'Imagem'}
          onClick={() => src && onEnlarge(src, item.caption || item.alt)}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <ImageIcon size={24} style={{ opacity: 0.3 }} />
        </div>
      )}

      <div className="image-thumb-overlay">
        <div className="image-thumb-caption">{item.caption || item.alt || 'Imagem'}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            style={{ color: '#fff' }}
            onClick={(e) => {
              e.stopPropagation();
              if (src) onEnlarge(src, item.caption || item.alt);
            }}
            title="Ampliar imagem"
          >
            <Maximize2 size={12} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            style={{ color: '#fff' }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remover imagem"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImagesTab({ concept }: ImagesTabProps) {
  const [addingUrl, setAddingUrl] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');

  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; caption: string }>({
    open: false,
    src: '',
    caption: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = concept.content.images;

  const handleAddUrl = () => {
    const valid = normalizeUrl(imageUrl);
    if (!valid) {
      toast.error('Informe uma URL de imagem válida.');
      return;
    }

    const newItem: ImageItem = {
      id: newId('img'),
      source: { type: 'url', url: valid },
      alt: altText.trim(),
      caption: caption.trim(),
    };

    updateConcept(concept.id, {
      content: { ...concept.content, images: [...images, newItem] },
    });

    setImageUrl('');
    setAltText('');
    setCaption('');
    setAddingUrl(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validation = validateFile(file, 'image');
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    try {
      const stored = await putFile(file, file.name, file.type);
      const newItem: ImageItem = {
        id: newId('img'),
        source: {
          type: 'file',
          fileId: stored.id,
          name: stored.name,
          mime: stored.mime,
          size: stored.size,
        },
        alt: file.name,
        caption: file.name,
      };

      updateConcept(concept.id, {
        content: { ...concept.content, images: [...images, newItem] },
      });
      toast.success(`Imagem “${file.name}” adicionada com sucesso!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar imagem localmente.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, images: images.filter((i) => i.id !== id) },
    });
  };

  return (
    <div className="panel-content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="panel-section-title" style={{ margin: 0 }}>
          Galeria de Imagens ({images.length})
        </span>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Enviar arquivo de imagem do computador"
          >
            <Upload size={13} />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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

      {/* Formulário para inclusão por URL */}
      {addingUrl && (
        <div className="item-card" style={{ border: '1.5px solid var(--accent)' }}>
          <div className="item-card-title">Adicionar Imagem por URL</div>

          <div className="field">
            <label className="label">Endereço da imagem</label>
            <input
              type="text"
              autoFocus
              className="input"
              value={imageUrl}
              placeholder="https://exemplo.com/imagem.png"
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Legenda (opcional)</label>
            <input
              type="text"
              className="input"
              value={caption}
              placeholder="Descrição visual ou crédito…"
              onChange={(e) => setCaption(e.target.value)}
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

      {/* Grade de Imagens */}
      {images.length > 0 ? (
        <div className="image-thumbnail-grid">
          {images.map((item) => (
            <ImageCard
              key={item.id}
              item={item}
              onEnlarge={(src, cap) => setLightbox({ open: true, src, caption: cap })}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      ) : (
        !addingUrl && (
          <div
            className="file-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files);
            }}
          >
            <ImageIcon size={32} style={{ color: 'var(--text-3)', opacity: 0.6 }} />
            <div className="file-dropzone-text">Arraste imagens ou clique para enviar</div>
            <div className="file-dropzone-hint">PNG, JPEG, WebP, SVG, GIF até 25 MB</div>
          </div>
        )
      )}

      {/* Modal de visualização ampliada (Lightbox) */}
      <Modal
        open={lightbox.open}
        onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}
        title={lightbox.caption || 'Visualização da Imagem'}
        size="wide"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img
            src={lightbox.src}
            alt={lightbox.caption}
            style={{
              maxWidth: '100%',
              maxHeight: '75vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          {lightbox.caption && (
            <div className="hint" style={{ textAlign: 'center' }}>
              {lightbox.caption}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

