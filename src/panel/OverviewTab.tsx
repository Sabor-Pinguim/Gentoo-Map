import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ExternalLink as ExtIcon,
  Globe,
  Image as ImageIcon,
  Video,
  Music,
  Upload,
  Maximize2,
  FileText,
  Check,
  ArrowRight,
} from 'lucide-react';
import type {
  Concept,
  ConceptStyle,
  NodeShape,
  FontSize,
  ExternalLink,
  ImageItem,
  MediaItem,
} from '../model/types';
import { COLOR_KEYS } from '../model/types';
import { updateConcept, setConceptStyle } from '../state/actions';
import { newId } from '../model/factory';
import { useUI } from '../state/uiStore';
import { normalizeUrl, openExternal, detectEmbed } from '../utils/url';
import { putFile, acquireFileUrl, releaseFileUrl } from '../persistence/fileRepo';
import { validateFile, mediaKindOfFile } from '../utils/files';
import { Modal } from '../components/ui';
import { toast } from 'sonner';

interface OverviewTabProps {
  concept: Concept;
}

const SHAPES: { key: NodeShape; label: string }[] = [
  { key: 'rounded', label: 'Arredondado' },
  { key: 'rectangle', label: 'Retangular' },
  { key: 'pill', label: 'Pílula' },
  { key: 'ellipse', label: 'Elipse' },
];

const FONT_SIZES: { key: FontSize; label: string }[] = [
  { key: 'sm', label: 'Pequena (15px)' },
  { key: 'md', label: 'Média (18px)' },
  { key: 'lg', label: 'Grande (22px)' },
  { key: 'xl', label: 'Muito Grande (27px)' },
];

/** Componente de pré-visualização de imagem com suporte a URLs locais e remotas */
function ImageThumb({
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
    <div className="image-thumb-card" style={{ height: 115 }}>
      {src ? (
        <img
          src={src}
          alt={item.alt || item.caption || 'Imagem'}
          onClick={() => src && onEnlarge(src, item.caption || item.alt)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <ImageIcon size={26} style={{ opacity: 0.3 }} />
        </div>
      )}

      <div className="image-thumb-overlay">
        <div className="image-thumb-caption" style={{ fontSize: 12.5 }}>
          {item.caption || item.alt || 'Imagem'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
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
            <Maximize2 size={13} />
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
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Componente de pré-visualização de mídia (vídeo / áudio) */
function MediaCardMini({
  item,
  onRemove,
}: {
  item: MediaItem;
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

  const embed = item.source.type === 'url' ? detectEmbed(item.source.url) : null;
  const fileUrl = item.source.type === 'file' ? blobUrl : null;

  return (
    <div className="item-card" style={{ padding: '10px 14px' }}>
      <div className="item-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {item.kind === 'video' ? (
            <Video size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          ) : (
            <Music size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          )}
          <div className="item-card-title" style={{ fontSize: 13.5 }}>
            {item.title}
          </div>
        </div>

        <div className="item-card-actions">
          {item.source.type === 'url' && (
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              onClick={() => openExternal((item.source as { url: string }).url)}
              title="Abrir URL original"
            >
              <ExtIcon size={13} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            onClick={onRemove}
            title="Remover mídia"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {embed?.type === 'iframe' && (
        <div style={{ position: 'relative', paddingBottom: '52%', height: 0, marginTop: 6, borderRadius: 6, overflow: 'hidden' }}>
          <iframe
            src={embed.src}
            title={item.title}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {(embed?.type === 'video' || (item.kind === 'video' && fileUrl)) && (
        <video
          controls
          src={fileUrl || (embed as { src: string }).src}
          style={{ width: '100%', maxHeight: 180, background: '#000', marginTop: 6, borderRadius: 6 }}
        />
      )}

      {(embed?.type === 'audio' || (item.kind === 'audio' && fileUrl)) && (
        <audio
          controls
          src={fileUrl || (embed as { src: string }).src}
          style={{ width: '100%', marginTop: 6 }}
        />
      )}
    </div>
  );
}

export function OverviewTab({ concept }: OverviewTabProps) {
  const setUI = useUI((s) => s.set);

  // Estados locais para campos complementares
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Estados locais para adição rápida de links
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Estados locais para adição rápida de mídias/imagens por URL
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');

  // Lightbox de visualização ampliada
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; caption: string }>({
    open: false,
    src: '',
    caption: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const links = concept.content.links;
  const images = concept.content.images;
  const media = concept.content.media;

  const handleTitleChange = (val: string) => {
    updateConcept(concept.id, { title: val }, `title-${concept.id}`);
  };

  const handleDescChange = (val: string) => {
    updateConcept(concept.id, { description: val }, `desc-${concept.id}`);
  };

  const handleSummaryChange = (val: string) => {
    updateConcept(
      concept.id,
      { content: { ...concept.content, summary: val } },
      `summary-${concept.id}`
    );
  };

  const handleStyleChange = (patch: Partial<ConceptStyle>) => {
    setConceptStyle([concept.id], patch);
  };

  // --- Links ---
  const handleSaveLink = () => {
    const validUrl = normalizeUrl(linkUrl);
    if (!validUrl) {
      toast.error('Informe uma URL válida (ex: https://exemplo.com).');
      return;
    }
    const newLink: ExternalLink = {
      id: newId('link'),
      url: validUrl,
      title: linkTitle.trim() || validUrl,
      description: '',
    };
    updateConcept(concept.id, {
      content: { ...concept.content, links: [...links, newLink] },
    });
    setLinkUrl('');
    setLinkTitle('');
    setShowAddLink(false);
    toast.success('Link adicionado.');
  };

  const handleRemoveLink = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, links: links.filter((l) => l.id !== id) },
    });
  };

  // --- Mídias e Imagens ---
  const handleSaveMediaUrl = () => {
    const validUrl = normalizeUrl(mediaUrl);
    if (!validUrl) {
      toast.error('Informe uma URL válida.');
      return;
    }

    if (mediaType === 'image') {
      const newImg: ImageItem = {
        id: newId('img'),
        source: { type: 'url', url: validUrl },
        caption: mediaCaption.trim(),
        alt: mediaCaption.trim(),
      };
      updateConcept(concept.id, {
        content: { ...concept.content, images: [...images, newImg] },
      });
      toast.success('Imagem por URL adicionada.');
    } else {
      const newMed: MediaItem = {
        id: newId('med'),
        kind: 'video',
        title: mediaCaption.trim() || validUrl,
        source: { type: 'url', url: validUrl },
      };
      updateConcept(concept.id, {
        content: { ...concept.content, media: [...media, newMed] },
      });
      toast.success('Vídeo por URL adicionado.');
    }

    setMediaUrl('');
    setMediaCaption('');
    setShowAddMedia(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isImage && !isVideo && !isAudio) {
      toast.error('Selecione uma imagem, vídeo ou áudio compatível.');
      return;
    }

    const category = isImage ? 'image' : isVideo ? 'video' : 'audio';
    const check = validateFile(file, category);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }

    try {
      const stored = await putFile(file, file.name, file.type);
      if (isImage) {
        const newImg: ImageItem = {
          id: newId('img'),
          source: {
            type: 'file',
            fileId: stored.id,
            name: stored.name,
            mime: stored.mime,
            size: stored.size,
          },
          caption: file.name,
          alt: file.name,
        };
        updateConcept(concept.id, {
          content: { ...concept.content, images: [...images, newImg] },
        });
        toast.success(`Imagem "${file.name}" anexada.`);
      } else {
        const kind = mediaKindOfFile(file) ?? (isVideo ? 'video' : 'audio');
        const newMed: MediaItem = {
          id: newId('med'),
          kind,
          title: file.name,
          source: {
            type: 'file',
            fileId: stored.id,
            name: stored.name,
            mime: stored.mime,
            size: stored.size,
          },
        };
        updateConcept(concept.id, {
          content: { ...concept.content, media: [...media, newMed] },
        });
        toast.success(`Arquivo de mídia "${file.name}" anexado.`);
      }
    } catch {
      toast.error('Falha ao processar arquivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, images: images.filter((img) => img.id !== id) },
    });
  };

  const handleRemoveMedia = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, media: media.filter((m) => m.id !== id) },
    });
  };

  // --- Campos extras ---
  const handleAddExtra = () => {
    if (!newKey.trim()) return;
    const extra = [
      ...concept.content.extra,
      { id: newId('ext'), key: newKey.trim(), value: newValue.trim() },
    ];
    updateConcept(concept.id, { content: { ...concept.content, extra } });
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveExtra = (id: string) => {
    const extra = concept.content.extra.filter((item) => item.id !== id);
    updateConcept(concept.id, { content: { ...concept.content, extra } });
  };

  return (
    <div className="panel-content-body">
      {/* 1. Título do Conceito e Descrição Breve */}
      <div className="panel-section">
        <label className="label">Título do Conceito</label>
        <input
          type="text"
          className="input"
          style={{ fontSize: 16.5, fontWeight: 600, minHeight: 42 }}
          value={concept.title}
          placeholder="Ex: Aprendizado de Máquina"
          onChange={(e) => handleTitleChange(e.target.value)}
        />
      </div>

      <div className="panel-section">
        <label className="label">Descrição Breve / Definição</label>
        <input
          type="text"
          className="input"
          style={{ fontSize: 15, minHeight: 40 }}
          value={concept.description}
          placeholder="Definição concisa (armazenada na barra lateral)…"
          onChange={(e) => handleDescChange(e.target.value)}
        />
      </div>

      {/* 2. Anotações e Resumo com atalho para o Editor */}
      <div className="panel-section">
        <div className="panel-section-title">
          <span>Anotações / Resumo</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setUI({ panelTab: 'notes' })}
            title="Abrir editor completo com formatação"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FileText size={14} />
            <span>Editor Completo</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <textarea
          className="textarea"
          rows={3}
          style={{ fontSize: 15, lineHeight: 1.6 }}
          value={concept.content.summary}
          placeholder="Síntese ou pontos principais do conceito…"
          onChange={(e) => handleSummaryChange(e.target.value)}
        />
      </div>

      {/* 3. Links Rápidos da Barra Lateral */}
      <div className="panel-section">
        <div className="panel-section-title">
          <span>Links Externos ({links.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowAddLink(!showAddLink)}
            >
              <Plus size={14} />
              <span>Link</span>
            </button>
            {links.length > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setUI({ panelTab: 'links' })}
                title="Gerenciar na aba Links"
              >
                <span>Aba Links</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Formulário rápido para adicionar link */}
        {showAddLink && (
          <div className="item-card" style={{ border: '1.5px solid var(--accent)', padding: 14 }}>
            <div className="field">
              <label className="label">Endereço Web (URL)</label>
              <input
                type="text"
                autoFocus
                className="input input-bare"
                style={{ border: '1px solid var(--border)', fontSize: 14.5, minHeight: 40 }}
                value={linkUrl}
                placeholder="https://…"
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <label className="label">Título do Link (opcional)</label>
              <input
                type="text"
                className="input input-bare"
                style={{ border: '1px solid var(--border)', fontSize: 14.5, minHeight: 40 }}
                value={linkTitle}
                placeholder="Ex: Documentação / Artigo"
                onChange={(e) => setLinkTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveLink()}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowAddLink(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSaveLink}
                disabled={!linkUrl.trim()}
              >
                <Check size={14} />
                <span>Salvar Link</span>
              </button>
            </div>
          </div>
        )}

        {/* Lista de links */}
        {links.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {links.map((item) => (
              <div key={item.id} className="item-card" style={{ padding: '10px 14px' }}>
                <div className="item-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <Globe size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <button
                      type="button"
                      onClick={() => openExternal(item.url)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        padding: 0,
                        minWidth: 0,
                        color: 'var(--text)',
                        fontWeight: 650,
                        fontSize: 14.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title="Abrir em nova aba"
                    >
                      {item.title}
                    </button>
                  </div>
                  <div className="item-card-actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn-xs"
                      onClick={() => openExternal(item.url)}
                      title="Abrir link externo"
                    >
                      <ExtIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-xs"
                      onClick={() => handleRemoveLink(item.id)}
                      title="Remover link"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
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
          !showAddLink && (
            <div style={{ fontSize: 13.5, color: 'var(--text-3)', fontStyle: 'italic' }}>
              Nenhum link associado. Clique em "+ Link" para adicionar.
            </div>
          )
        )}
      </div>

      {/* 4. Mídias e Imagens da Barra Lateral */}
      <div className="panel-section">
        <div className="panel-section-title">
          <span>Mídias & Imagens ({images.length + media.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => fileInputRef.current?.click()}
              title="Fazer upload de imagem ou vídeo"
            >
              <Upload size={14} />
              <span>Upload</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowAddMedia(!showAddMedia)}
              title="Adicionar por URL"
            >
              <Plus size={14} />
              <span>URL</span>
            </button>
          </div>
        </div>

        {/* Input invisível para upload de arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {/* Formulário rápido para adicionar mídia/imagem por URL */}
        {showAddMedia && (
          <div className="item-card" style={{ border: '1.5px solid var(--accent)', padding: 14 }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
              <label style={{ fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="mediaType"
                  checked={mediaType === 'image'}
                  onChange={() => setMediaType('image')}
                />
                <span>Imagem</span>
              </label>
              <label style={{ fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="mediaType"
                  checked={mediaType === 'video'}
                  onChange={() => setMediaType('video')}
                />
                <span>Vídeo / Áudio</span>
              </label>
            </div>

            <div className="field">
              <label className="label">URL da Mídia (Web, YouTube, etc.)</label>
              <input
                type="text"
                autoFocus
                className="input input-bare"
                style={{ border: '1px solid var(--border)', fontSize: 14.5, minHeight: 40 }}
                value={mediaUrl}
                placeholder="https://…"
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginTop: 8 }}>
              <label className="label">Título / Legenda</label>
              <input
                type="text"
                className="input input-bare"
                style={{ border: '1px solid var(--border)', fontSize: 14.5, minHeight: 40 }}
                value={mediaCaption}
                placeholder="Ex: Diagrama explicativo"
                onChange={(e) => setMediaCaption(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveMediaUrl()}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowAddMedia(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSaveMediaUrl}
                disabled={!mediaUrl.trim()}
              >
                <Check size={14} />
                <span>Salvar Mídia</span>
              </button>
            </div>
          </div>
        )}

        {/* Galeria de imagens anexadas */}
        {images.length > 0 && (
          <div className="image-thumbnail-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {images.map((img) => (
              <ImageThumb
                key={img.id}
                item={img}
                onEnlarge={(src, cap) => setLightbox({ open: true, src, caption: cap })}
                onRemove={() => handleRemoveImage(img.id)}
              />
            ))}
          </div>
        )}

        {/* Lista de vídeos / áudios anexados */}
        {media.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: images.length > 0 ? 8 : 0 }}>
            {media.map((med) => (
              <MediaCardMini
                key={med.id}
                item={med}
                onRemove={() => handleRemoveMedia(med.id)}
              />
            ))}
          </div>
        )}

        {images.length === 0 && media.length === 0 && !showAddMedia && (
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Nenhuma mídia ou imagem anexada. Use "Upload" ou "URL" para adicionar.
          </div>
        )}
      </div>

      {/* 5. Aparência Visual do Conceito */}
      <div className="panel-section">
        <div className="panel-section-title">
          <span>Aparência do Conceito</span>
        </div>

        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="label">Cor</label>
            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              Herdada pelos nós filhos
            </span>
          </div>
          <div className="menu-swatches" style={{ padding: 0, gap: 8 }}>
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                className={`concept-node color-${c}`}
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 'unset',
                  padding: 0,
                  borderRadius: 6,
                  border:
                    concept.style.color === c
                      ? '2.5px solid var(--accent)'
                      : '1.5px solid var(--border)',
                  cursor: 'pointer',
                  transform: concept.style.color === c ? 'scale(1.15)' : 'none',
                }}
                title={`Cor ${c} (sincronizada com filhos)`}
                onClick={() => handleStyleChange({ color: c })}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
          <div className="field">
            <label className="label">Formato</label>
            <select
              className="select"
              style={{ fontSize: 14.5, minHeight: 40 }}
              value={concept.style.shape}
              onChange={(e) => handleStyleChange({ shape: e.target.value as NodeShape })}
            >
              {SHAPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Tamanho da Fonte</label>
            <select
              className="select"
              style={{ fontSize: 14.5, minHeight: 40 }}
              value={concept.style.fontSize}
              onChange={(e) => handleStyleChange({ fontSize: e.target.value as FontSize })}
            >
              {FONT_SIZES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14.5 }}>
            <input
              type="checkbox"
              style={{ width: 16, height: 16, cursor: 'pointer' }}
              checked={concept.style.bold}
              onChange={(e) => handleStyleChange({ bold: e.target.checked })}
            />
            <span style={{ fontWeight: 500 }}>Título em negrito</span>
          </label>
        </div>
      </div>

      {/* 6. Informações complementares (Chave/Valor) */}
      <div className="panel-section">
        <div className="panel-section-title">
          <span>Campos Complementares</span>
          <span className="badge" style={{ fontSize: 12, padding: '2px 8px' }}>{concept.content.extra.length}</span>
        </div>

        {concept.content.extra.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {concept.content.extra.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                }}
              >
                <strong style={{ color: 'var(--text-2)' }}>{item.key}:</strong>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{item.value}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn-xs"
                  onClick={() => handleRemoveExtra(item.id)}
                  title="Remover campo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            type="text"
            className="input input-bare"
            style={{ flex: 1, border: '1px solid var(--border)', fontSize: 14, minHeight: 38 }}
            placeholder="Campo (ex: Categoria)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            type="text"
            className="input input-bare"
            style={{ flex: 1.5, border: '1px solid var(--border)', fontSize: 14, minHeight: 38 }}
            placeholder="Valor"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddExtra()}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleAddExtra}
            disabled={!newKey.trim()}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Lightbox Modal de Ampliação de Imagens */}
      <Modal
        open={lightbox.open}
        onOpenChange={(open) => setLightbox((l) => ({ ...l, open }))}
        title={lightbox.caption || 'Visualização da Imagem'}
        size="wide"
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={lightbox.src}
            alt={lightbox.caption}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          {lightbox.caption && (
            <p style={{ marginTop: 10, fontSize: 14, color: 'var(--text-2)' }}>{lightbox.caption}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
