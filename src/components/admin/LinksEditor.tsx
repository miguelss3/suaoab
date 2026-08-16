// src/components/admin/LinksEditor.tsx
// Editor de múltiplos links para uma meta. Cada link é uma escolha guiada — só
// um jeito de defini-lo por vez (material já no site, upload do computador, ou
// link externo colado) — e, uma vez definido, mostra uma confirmação simples
// em vez da URL técnica crua, pra ficar compreensível mesmo pra quem não é da
// área técnica.
import { useRef, useState } from "react";
import { CheckCircle2, GripVertical, Library, Link as LinkIcon, Plus, Trash2, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAcervoDisciplina, type OrigemAcervo } from "@/lib/acervoDisciplina";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LinkMeta {
  titulo: string;
  url: string;
}

type Props = {
  materia: string;
  links: LinkMeta[];
  onChange: (links: LinkMeta[]) => void;
};

type ModoLink = "acervo" | "upload" | "externo";

const ABAS: { modo: ModoLink; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { modo: "acervo", label: "Material do Site", icon: Library },
  { modo: "upload", label: "Enviar Arquivo", icon: UploadCloud },
  { modo: "externo", label: "Link Externo", icon: LinkIcon },
];

const ORDEM_ORIGENS: OrigemAcervo[] = ["Direito Material", "Direito Processual", "Laboratório de Peças", "Publicados", "Videoaulas"];

export const LinksEditor = ({ materia, links, onChange }: Props) => {
  const acervo = useAcervoDisciplina(materia);
  const [enviandoIdx, setEnviandoIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const draggedIdxRef = useRef<number | null>(null);
  const [modoPorLinha, setModoPorLinha] = useState<Record<number, ModoLink>>({});
  const [urlExternaDraft, setUrlExternaDraft] = useState<Record<number, string>>({});

  const modoAtual = (indice: number): ModoLink => modoPorLinha[indice] ?? "acervo";
  const definirModo = (indice: number, modo: ModoLink) => setModoPorLinha((prev) => ({ ...prev, [indice]: modo }));

  const atualizarLink = (indice: number, campo: keyof LinkMeta, valor: string) => {
    onChange(links.map((link, i) => (i === indice ? { ...link, [campo]: valor } : link)));
  };

  const escolherDoAcervo = (indice: number, url: string) => {
    if (!url) return;
    const item = acervo.find((a) => a.url === url);
    if (!item) return;
    onChange(links.map((link, i) => (i === indice ? { titulo: item.nome, url: item.url } : link)));
  };

  const enviarDoComputador = async (indice: number, arquivo: File | null) => {
    if (!arquivo || !materia) return;
    setEnviandoIdx(indice);
    try {
      const safeName = arquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const fileRef = ref(storage, `materiais_alunos/${materia}/links_anexos/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(fileRef, arquivo);
      const url = await getDownloadURL(snapshot.ref);
      onChange(links.map((link, i) => (i === indice ? { titulo: link.titulo || arquivo.name, url } : link)));
    } catch (error) {
      console.error("Erro ao enviar arquivo do link:", error);
      toast.error("Erro ao enviar o arquivo.");
    } finally {
      setEnviandoIdx(null);
    }
  };

  const confirmarUrlExterna = (indice: number) => {
    const url = (urlExternaDraft[indice] || "").trim();
    if (!url) return;
    onChange(links.map((link, i) => (i === indice ? { ...link, url } : link)));
    setUrlExternaDraft((prev) => ({ ...prev, [indice]: "" }));
  };

  const trocarLink = (indice: number) => {
    onChange(links.map((link, i) => (i === indice ? { ...link, url: "" } : link)));
  };

  const adicionarLink = () => {
    onChange([...links, { titulo: "", url: "" }]);
  };

  const removerLink = (indice: number) => {
    onChange(links.filter((_, i) => i !== indice));
  };

  // --- DRAG AND DROP (HTML5) ---
  const handleDragStart = (indice: number) => {
    draggedIdxRef.current = indice;
  };

  const handleDragOver = (e: React.DragEvent, indice: number) => {
    e.preventDefault();
    setDragOverIdx(indice);
  };

  const handleDragLeave = () => setDragOverIdx(null);

  const handleDrop = (e: React.DragEvent, alvoIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);

    const fromIdx = draggedIdxRef.current;
    draggedIdxRef.current = null;
    if (fromIdx === null || fromIdx === alvoIdx) return;

    const novaLista = [...links];
    const [movido] = novaLista.splice(fromIdx, 1);
    novaLista.splice(alvoIdx, 0, movido);
    onChange(novaLista);
  };

  return (
    <div className="space-y-2">
      {links.map((link, indice) => {
        const preenchido = !!link.url;
        const modo = modoAtual(indice);

        return (
          <div
            key={indice}
            draggable
            onDragStart={() => handleDragStart(indice)}
            onDragOver={(e) => handleDragOver(e, indice)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, indice)}
            className={`p-3 rounded-lg border bg-muted/5 transition-colors ${
              dragOverIdx === indice ? "border-accent ring-2 ring-accent/40" : "border-border"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="hidden md:flex items-center justify-center h-9 cursor-move text-muted-foreground shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Título do Link</Label>
                  <Input value={link.titulo} onChange={(e) => atualizarLink(indice, "titulo", e.target.value)} placeholder="Ex: Resumo — Teoria do Crime" />
                </div>

                {preenchido ? (
                  <div className="flex items-center gap-2 bg-success/10 border border-success/30 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span className="text-sm font-bold text-success flex-1">Link definido</span>
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-success hover:bg-success/10" asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">Ver</a>
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => trocarLink(indice)}>
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-1 border rounded-md p-1 bg-muted/20 w-fit">
                      {ABAS.map(({ modo: m, label, icon: Icon }) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => definirModo(indice, m)}
                          className={cn(
                            "px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold transition-colors flex items-center gap-1.5",
                            modo === m ? "bg-background shadow-sm text-accent" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" /> {label}
                        </button>
                      ))}
                    </div>

                    {modo === "acervo" && (
                      <select
                        className="w-full h-9 border rounded-md px-2 bg-background text-sm"
                        value=""
                        disabled={!materia || acervo.length === 0}
                        onChange={(e) => escolherDoAcervo(indice, e.target.value)}
                      >
                        <option value="">{materia ? "Selecione o material..." : "Escolha a disciplina primeiro"}</option>
                        {ORDEM_ORIGENS.map((origem) => {
                          const itensOrigem = acervo.filter((a) => a.origem === origem);
                          if (itensOrigem.length === 0) return null;
                          return (
                            <optgroup key={origem} label={origem}>
                              {itensOrigem.map((item, i) => (
                                <option key={`${origem}-${i}`} value={item.url}>{item.nome}</option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    )}

                    {modo === "upload" && (
                      <div className="relative w-full">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={!materia}
                          onChange={(e) => enviarDoComputador(indice, e.target.files?.[0] || null)}
                        />
                        <div className="h-9 border rounded-md flex items-center px-2 text-sm bg-background text-muted-foreground">
                          <UploadCloud className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">{enviandoIdx === indice ? "Enviando..." : "Clique para escolher um arquivo do computador"}</span>
                        </div>
                      </div>
                    )}

                    {modo === "externo" && (
                      <div className="flex gap-2">
                        <Input
                          className="h-9"
                          placeholder="Cole a URL aqui (ex: YouTube, Google Drive...)"
                          value={urlExternaDraft[indice] || ""}
                          onChange={(e) => setUrlExternaDraft((prev) => ({ ...prev, [indice]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarUrlExterna(indice); } }}
                        />
                        <Button type="button" size="sm" className="h-9 shrink-0" onClick={() => confirmarUrlExterna(indice)}>
                          OK
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="button" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-9 shrink-0" onClick={() => removerLink(indice)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={adicionarLink}>
        <Plus className="h-4 w-4" /> Adicionar Link
      </Button>
    </div>
  );
};
