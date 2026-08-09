// src/components/admin/LinksEditor.tsx
// Editor de múltiplos links para uma meta — cada link pode ser digitado à mão
// ou escolhido a partir de material já publicado para a disciplina (acervo
// teórico, laboratório de peças, publicados e videoaulas).
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAcervoDisciplina, type OrigemAcervo } from "@/lib/acervoDisciplina";

export interface LinkMeta {
  titulo: string;
  url: string;
}

type Props = {
  materia: string;
  links: LinkMeta[];
  onChange: (links: LinkMeta[]) => void;
};

const ORDEM_ORIGENS: OrigemAcervo[] = ["Direito Material", "Direito Processual", "Laboratório de Peças", "Publicados", "Videoaulas"];

export const LinksEditor = ({ materia, links, onChange }: Props) => {
  const acervo = useAcervoDisciplina(materia);

  const atualizarLink = (indice: number, campo: keyof LinkMeta, valor: string) => {
    onChange(links.map((link, i) => (i === indice ? { ...link, [campo]: valor } : link)));
  };

  const escolherDoAcervo = (indice: number, url: string) => {
    if (!url) return;
    const item = acervo.find((a) => a.url === url);
    if (!item) return;
    onChange(links.map((link, i) => (i === indice ? { titulo: item.nome, url: item.url } : link)));
  };

  const adicionarLink = () => {
    onChange([...links, { titulo: "", url: "" }]);
  };

  const removerLink = (indice: number) => {
    onChange(links.filter((_, i) => i !== indice));
  };

  return (
    <div className="space-y-2">
      {links.map((link, indice) => (
        <div key={indice} className="p-3 rounded-lg border border-dashed border-border bg-muted/5 space-y-2">
          <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Escolher material já enviado (opcional)</Label>
              <select
                className="w-full h-9 border rounded-md px-2 bg-background text-sm"
                value=""
                disabled={!materia || acervo.length === 0}
                onChange={(e) => escolherDoAcervo(indice, e.target.value)}
              >
                <option value="">{materia ? "Selecione..." : "Escolha a disciplina primeiro"}</option>
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
            </div>
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-9" onClick={() => removerLink(indice)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Título do Link</Label>
              <Input value={link.titulo} onChange={(e) => atualizarLink(indice, "titulo", e.target.value)} placeholder="Ex: Resumo — Teoria do Crime" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">URL</Label>
              <Input value={link.url} onChange={(e) => atualizarLink(indice, "url", e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={adicionarLink}>
        <Plus className="h-4 w-4" /> Adicionar Link
      </Button>
    </div>
  );
};
