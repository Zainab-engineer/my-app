"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import CodeBlock from "@tiptap/extension-code-block";
import Blockquote from "@tiptap/extension-blockquote";
import { useEffect } from "react";

interface EditorProps {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}

export default function Editor({ content, onChange, editable = true }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      CodeBlock,
      Blockquote,
    ],
    content: content || "<p></p>",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content || "<p></p>");
    }
  }, [content, editor]);

  if (!editor) return null;

  if (!editable) {
    return (
      <div className="prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded text-sm italic ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          I
        </button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded text-xs font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          H3
        </button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1 rounded text-sm font-mono ${editor.isActive('codeBlock') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          {"</>"}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
        >
          "
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none"
      />
    </div>
  );
}
