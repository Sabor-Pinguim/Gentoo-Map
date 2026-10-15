import { useState, useRef, useEffect } from 'react';
import { FileText, Download, Trash2, Edit2, Eye, Upload } from 'lucide-react';
import type { Concept, DocumentItem } from '../model/types';
import { updateConcept } from '../state/actions';
import { newId } from '../model/factory';
import { putFile, acquireFileUrl, getFile } from '../persistence/fileRepo';
import { formatBytes, friendlyFormat, isPdf, validateFile } from '../utils/files';
import { Modal } from '../components/ui';
import { toast } from 'sonner';

interface DocumentsTabProps {
  concept: Concept;
}

function DocumentRow({
  item,
  onPreview,
  onRename,
  onRemove,
}: {
  item: DocumentItem;
  onPreview: (item: DocumentItem) => void;
  onRename: (item: DocumentItem) => void;
  onRemove: () => void;
}) {
  const handleDownload = async () => {
    try {
      const stored = await getFile(item.fileId);
      if (!stored) {
        toast.error('Arquivo não encontrado no armazenamento local.');
        return;
      }
      const url = URL.createObjectURL(stored.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Falha ao baixar arquivo.');
    }
  };

  const canPreview = isPdf(item.mime, item.name);

  return (
    <div className="item-card">
      <div className="item-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              padding: '6px 8px',
              background: 'var(--bg-muted)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-2)',
            }}
          >
            {friendlyFormat(item.mime, item.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="item-card-title">{item.name}</div>
            <div className="hint" style={{ fontSize: 11 }}>
              {formatBytes(item.size)}
            </div>
          </div>
        </div>

        <div className="item-card-actions">
          {canPreview && (
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              onClick={() => onPreview(item)}
              title="Pré-visualizar documento"
            >
              <Eye size={13} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            onClick={handleDownload}
            title="Baixar arquivo"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            onClick={() => onRename(item)}
            title="Renomear"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-xs"
            onClick={onRemove}
            title="Remover documento"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentsTab({ concept }: DocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docs = concept.content.documents;

  const [previewDoc, setPreviewDoc] = useState<{ open: boolean; url: string | null; name: string }>({
    open: false,
    url: null,
    name: '',
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateFile(file, 'document');
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    try {
      const stored = await putFile(file, file.name, file.type);
      const newItem: DocumentItem = {
        id: newId('doc'),
        fileId: stored.id,
        name: stored.name,
        mime: stored.mime,
        size: stored.size,
        addedAt: Date.now(),
      };

      updateConcept(concept.id, {
        content: { ...concept.content, documents: [...docs, newItem] },
      });
      toast.success(`Documento “${file.name}” anexado com sucesso!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar documento.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRename = (item: DocumentItem) => {
    const nextName = window.prompt('Novo nome do documento:', item.name);
    if (!nextName || !nextName.trim() || nextName === item.name) return;
    const updated = docs.map((d) => (d.id === item.id ? { ...d, name: nextName.trim() } : d));
    updateConcept(concept.id, {
      content: { ...concept.content, documents: updated },
    });
  };

  const handleRemove = (id: string) => {
    updateConcept(concept.id, {
      content: { ...concept.content, documents: docs.filter((d) => d.id !== id) },
    });
  };

  const openPreview = async (item: DocumentItem) => {
    const url = await acquireFileUrl(item.fileId);
    if (!url) {
      toast.error('Não foi possível carregar a pré-visualização do documento.');
      return;
    }
    setPreviewDoc({ open: true, url, name: item.name });
  };

  useEffect(() => {
    return () => {
      // Libera url quando desmontar modal se houver
    };
  }, []);

  return (
    <div className="panel-content-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="panel-section-title" style={{ margin: 0 }}>
          Documentos e Arquivos ({docs.length})
        </span>

        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={13} />
          <span>Anexar Arquivo</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      {/* Lista de Documentos */}
      {docs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map((item) => (
            <DocumentRow
              key={item.id}
              item={item}
              onPreview={openPreview}
              onRename={handleRename}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      ) : (
        <div
          className="file-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
        >
          <FileText size={32} style={{ color: 'var(--text-3)', opacity: 0.6 }} />
          <div className="file-dropzone-text">Arraste arquivos ou clique para anexar</div>
          <div className="file-dropzone-hint">PDFs, apresentações, textos e planilhas até 100 MB</div>
        </div>
      )}

      {/* Modal de Pré-visualização de Documento */}
      <Modal
        open={previewDoc.open}
        onOpenChange={(open) => {
          if (!open && previewDoc.url) {
            // liberação se necessário
          }
          setPreviewDoc((prev) => ({ ...prev, open }));
        }}
        title={previewDoc.name}
        size="wide"
      >
        {previewDoc.url && (
          <iframe
            src={previewDoc.url}
            title={previewDoc.name}
            style={{ width: '100%', height: '70vh', border: 0, borderRadius: 'var(--radius-sm)' }}
          />
        )}
      </Modal>
    </div>
  );
}
