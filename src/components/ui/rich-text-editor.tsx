// src/components/ui/rich-text-editor.tsx
// Editor rich-text minimalista baseado em contentEditable + document.execCommand.
// Suficiente para Negrito/Itálico/Sublinhado, alinhamentos, listas e títulos.
import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
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

type CommandButton = {
  cmd: string;
  arg?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

const COMMANDS: CommandButton[] = [
  { cmd: "bold", icon: Bold, label: "Negrito (Ctrl+B)" },
  { cmd: "italic", icon: Italic, label: "Itálico (Ctrl+I)" },
  { cmd: "underline", icon: Underline, label: "Sublinhado (Ctrl+U)" },
  { cmd: "formatBlock", arg: "H2", icon: Heading2, label: "Título" },
  { cmd: "formatBlock", arg: "BLOCKQUOTE", icon: Quote, label: "Citação" },
  { cmd: "insertUnorderedList", icon: List, label: "Lista" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Lista numerada" },
  { cmd: "justifyLeft", icon: AlignLeft, label: "Alinhar à esquerda" },
  { cmd: "justifyCenter", icon: AlignCenter, label: "Centralizar" },
  { cmd: "justifyRight", icon: AlignRight, label: "Alinhar à direita" },
  { cmd: "justifyFull", icon: AlignJustify, label: "Justificar" },
  { cmd: "removeFormat", icon: Eraser, label: "Limpar formatação" },
];

export const RichTextEditor = ({ value, onChange, placeholder, className }: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sincroniza valor externo apenas quando o conteúdo é realmente diferente
  // (para não atrapalhar a posição do cursor enquanto o usuário digita).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/30 px-2 py-1.5">
        {COMMANDS.map(({ cmd, arg, icon: Icon, label }) => (
          <button
            key={`${cmd}-${arg ?? ""}`}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => {
              // Evita perder a seleção ao clicar no botão
              e.preventDefault();
            }}
            onClick={() => exec(cmd, arg)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent/10 hover:text-primary"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[140px] w-full rounded-b-md px-3 py-2 text-sm leading-relaxed outline-none",
          "prose prose-sm max-w-none",
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
        )}
      />
    </div>
  );
};
