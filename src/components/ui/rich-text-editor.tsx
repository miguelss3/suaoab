// src/components/ui/rich-text-editor.tsx
// Editor rich-text baseado em Tiptap/ProseMirror: negrito, itálico, sublinhado,
// riscado, títulos, citação, listas e alinhamento — com paste "tipo Word" já
// tratado pelo próprio Tiptap (normaliza o HTML colado do Word/Google Docs).
// Como a extensão de imagem não está registrada, qualquer <img> colada é
// automaticamente descartada pelo schema do editor (sem suporte a imagem
// nesta versão, por decisão de produto).
import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

type ToolbarButton = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const TOOLBAR: ToolbarButton[] = [
  { label: "Negrito (Ctrl+B)", icon: Bold, isActive: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { label: "Itálico (Ctrl+I)", icon: Italic, isActive: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: "Sublinhado (Ctrl+U)", icon: UnderlineIcon, isActive: (e) => e.isActive("underline"), run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: "Riscado", icon: Strikethrough, isActive: (e) => e.isActive("strike"), run: (e) => e.chain().focus().toggleStrike().run() },
  { label: "Título", icon: Heading2, isActive: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Citação", icon: Quote, isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Lista", icon: List, isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Lista numerada", icon: ListOrdered, isActive: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Alinhar à esquerda", icon: AlignLeft, isActive: (e) => e.isActive({ textAlign: "left" }), run: (e) => e.chain().focus().setTextAlign("left").run() },
  { label: "Centralizar", icon: AlignCenter, isActive: (e) => e.isActive({ textAlign: "center" }), run: (e) => e.chain().focus().setTextAlign("center").run() },
  { label: "Alinhar à direita", icon: AlignRight, isActive: (e) => e.isActive({ textAlign: "right" }), run: (e) => e.chain().focus().setTextAlign("right").run() },
  { label: "Justificar", icon: AlignJustify, isActive: (e) => e.isActive({ textAlign: "justify" }), run: (e) => e.chain().focus().setTextAlign("justify").run() },
  { label: "Limpar formatação", icon: Eraser, isActive: () => false, run: (e) => e.chain().focus().clearNodes().unsetAllMarks().run() },
];

export const RichTextEditor = ({ value, onChange, placeholder, className }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[140px] w-full rounded-b-md px-3 py-2 text-sm leading-relaxed outline-none",
          "prose prose-sm max-w-none",
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
        ),
      },
    },
  });

  // Sincroniza valor externo apenas quando o conteúdo é realmente diferente
  // (para não atrapalhar a posição do cursor enquanto o usuário digita).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border border-input bg-background [&_.is-editor-empty:before]:content-[attr(data-placeholder)] [&_.is-editor-empty:before]:text-muted-foreground/60 [&_.is-editor-empty:before]:float-left [&_.is-editor-empty:before]:pointer-events-none [&_.is-editor-empty:before]:h-0", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/30 px-2 py-1.5">
        {TOOLBAR.map(({ label, icon: Icon, isActive, run }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => {
              // Evita perder a seleção ao clicar no botão
              e.preventDefault();
            }}
            onClick={() => run(editor)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent/10 hover:text-primary",
              isActive(editor) && "bg-accent/10 text-accent"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
