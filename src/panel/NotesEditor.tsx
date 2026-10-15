import { useEffect } from 'react';
import { useEditor as useTiptap, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Highlighter,
  Link as LinkIcon,
  Code,
} from 'lucide-react';
import { sanitizeNotesHtml } from '../utils/url';

interface NotesEditorProps {
  contentHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function NotesEditor({ contentHtml, onChange, placeholder = 'Escreva aqui anotações detalhadas sobre este conceito…' }: NotesEditorProps) {
  const editor = useTiptap({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
    ],
    content: sanitizeNotesHtml(contentHtml),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(sanitizeNotesHtml(html));
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        'data-placeholder': placeholder,
      },
    },
  });

  // Atualiza conteúdo quando o nó selecionado mudar
  useEffect(() => {
    if (editor && contentHtml !== editor.getHTML()) {
      editor.commands.setContent(sanitizeNotesHtml(contentHtml));
    }
  }, [contentHtml, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="tiptap-wrap">
      <div className="tiptap-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          title="Negrito (Ctrl+B)"
        >
          <Bold size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          title="Itálico (Ctrl+I)"
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          title="Tachado"
        >
          <Strikethrough size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
          title="Destaque"
        >
          <Highlighter size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`tiptap-toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          title="Título 1"
        >
          <Heading1 size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`tiptap-toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          title="Título 2"
        >
          <Heading2 size={14} />
        </button>

        <div className="divider-v" style={{ height: 16 }} />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          title="Lista com marcadores"
        >
          <List size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          title="Lista numerada"
        >
          <ListOrdered size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
          title="Citação"
        >
          <Quote size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`tiptap-toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
          title="Código"
        >
          <Code size={14} />
        </button>

        <button
          type="button"
          onClick={setLink}
          className={`tiptap-toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          title="Inserir ou editar link"
        >
          <LinkIcon size={14} />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

