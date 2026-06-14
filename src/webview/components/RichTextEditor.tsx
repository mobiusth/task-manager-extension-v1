import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import type { RichTextContent } from '../types';
import { emptyRichText } from '../richText';

type RichTextEditorProps = {
  content: RichTextContent;
  onChange(content: RichTextContent): void;
  onReady?(editor: Editor | null): void;
};

export function RichTextEditor({ content, onChange, onReady }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || emptyRichText,
    editorProps: {
      attributes: {
        class: 'rich-editor-content'
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON() as RichTextContent);
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const next = JSON.stringify(content || emptyRichText);
    const current = JSON.stringify(editor.getJSON());
    if (next !== current) {
      editor.commands.setContent(content || emptyRichText, false);
    }
  }, [content, editor]);

  useEffect(() => {
    onReady?.(editor);
    return () => onReady?.(null);
  }, [editor, onReady]);

  return (
    <section className="rich-editor">
      <div className="editor-toolbar" aria-label="Task 내용 서식 도구">
        <button type="button" title="Bold" className={editor?.isActive('bold') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleBold().run()}>
          B
        </button>
        <button type="button" title="Italic" className={editor?.isActive('italic') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button type="button" title="Heading 1" className={editor?.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </button>
        <button type="button" title="Heading 2" className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" title="Bullet List" className={editor?.isActive('bulletList') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          UL
        </button>
        <button type="button" title="Ordered List" className={editor?.isActive('orderedList') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          OL
        </button>
        <button type="button" title="Blockquote" className={editor?.isActive('blockquote') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          ""
        </button>
        <button type="button" title="Inline Code" className={editor?.isActive('code') ? 'active' : ''} onClick={() => editor?.chain().focus().toggleCode().run()}>
          {'<>'}
        </button>
        <button type="button" title="Undo" onClick={() => editor?.chain().focus().undo().run()}>
          Undo
        </button>
        <button type="button" title="Redo" onClick={() => editor?.chain().focus().redo().run()}>
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </section>
  );
}
