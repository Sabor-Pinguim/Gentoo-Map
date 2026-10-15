import { useRef } from 'react';
import {
  FileJson,
  FileArchive,
  Image as ImageIcon,
  FileCode,
  FileText,
  Upload,
} from 'lucide-react';
import { Modal } from '../components/ui';
import { useEditor } from '../state/editorStore';
import { useUI } from '../state/uiStore';
import {
  exportBackupZip,
  exportMapJson,
  exportMapPdf,
  exportMapPng,
  exportMapSvg,
} from '../io/export';
import { importMapFile } from '../io/import';
import { getFlowContainer } from '../canvas/flowApi';
import { toast } from 'sonner';

export function ExportDialog() {
  const dialog = useUI((s) => s.dialog);
  const openDialog = useUI((s) => s.openDialog);
  const doc = useEditor((s) => s.doc);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOpen = dialog === 'export';

  if (!doc) return null;

  const handleImportFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ok = await importMapFile(file);
    if (ok) openDialog(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportPng = () => {
    const el = getFlowContainer();
    if (!el) {
      toast.error('Canvas não encontrado.');
      return;
    }
    void exportMapPng(el, doc.name);
  };

  const handleExportSvg = () => {
    const el = getFlowContainer();
    if (!el) {
      toast.error('Canvas não encontrado.');
      return;
    }
    void exportMapSvg(el, doc.name);
  };

  const handleExportPdf = () => {
    const el = getFlowContainer();
    if (!el) {
      toast.error('Canvas não encontrado.');
      return;
    }
    void exportMapPdf(el, doc.name);
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && openDialog(null)}
      title="Exportação e Importação"
      description="Faça backup completo, intercâmbio de dados ou gere arquivos para visualização e impressão."
      size="wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Seção 1: Formatos Editáveis (Preservam dados) */}
        <div>
          <div className="panel-section-title" style={{ marginBottom: 8 }}>
            Formatos Editáveis (Preservam nós, relações e dados)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Backup Completo ZIP */}
            <div className="item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileArchive size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <div className="item-card-title">Backup Completo (.cmapzip)</div>
                  <div className="hint" style={{ fontSize: 11 }}>
                    JSON + todos os arquivos anexados (imagens, PDFs, mídias)
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ marginTop: 6 }}
                onClick={() => void exportBackupZip(doc)}
              >
                Exportar Backup (.cmapzip)
              </button>
            </div>

            {/* JSON Estruturado */}
            <div className="item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileJson size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <div className="item-card-title">Estrutura em JSON (.json)</div>
                  <div className="hint" style={{ fontSize: 11 }}>
                    Formato versionado leve para intercâmbio e controle de versão
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 6 }}
                onClick={() => exportMapJson(doc)}
              >
                Exportar JSON
              </button>
            </div>
          </div>
        </div>

        {/* Seção 2: Formatos de Visualização / Impressão */}
        <div>
          <div className="panel-section-title" style={{ marginBottom: 8 }}>
            Formatos Apenas para Visualização e Impressão (Não Editáveis)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div className="item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon size={18} style={{ color: 'var(--text-2)' }} />
                <div className="item-card-title">Imagem PNG</div>
              </div>
              <div className="hint" style={{ fontSize: 11 }}>
                Alta resolução com fundo limpo para apresentações e slides.
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 4 }}
                onClick={handleExportPng}
              >
                Exportar PNG
              </button>
            </div>

            <div className="item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCode size={18} style={{ color: 'var(--text-2)' }} />
                <div className="item-card-title">Vetor SVG</div>
              </div>
              <div className="hint" style={{ fontSize: 11 }}>
                Gráfico vetorial escalável sem perda de nitidez em qualquer tamanho.
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 4 }}
                onClick={handleExportSvg}
              >
                Exportar SVG
              </button>
            </div>

            <div className="item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={18} style={{ color: 'var(--text-2)' }} />
                <div className="item-card-title">Documento PDF</div>
              </div>
              <div className="hint" style={{ fontSize: 11 }}>
                Arquivo formatado para impressão física ou envio por e-mail.
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 4 }}
                onClick={handleExportPdf}
              >
                Exportar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Seção 3: Importação */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="panel-section-title" style={{ marginBottom: 8 }}>
            Importar Mapa ou Backup
          </div>

          <div
            className="file-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleImportFile(e.dataTransfer.files);
            }}
          >
            <Upload size={24} style={{ color: 'var(--accent)' }} />
            <div className="file-dropzone-text">
              Clique ou arraste um arquivo JSON ou pacote .cmapzip / .zip
            </div>
            <div className="file-dropzone-hint">
              A importação valida o formato antes de abrir e restaura todos os anexos.
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip,.cmapzip"
            style={{ display: 'none' }}
            onChange={(e) => void handleImportFile(e.target.files)}
          />
        </div>
      </div>
    </Modal>
  );
}

