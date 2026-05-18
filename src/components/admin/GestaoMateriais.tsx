// src/components/admin/GestaoMateriais.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import {
  Trash2,
  ExternalLink,
  Filter,
  BookOpen,
  Timer,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Material {
  id: string;
  titulo: string;
  materia: string;
  tipo?: string;
  url_pdf?: string;
  data_publicacao?: any;
  ordem?: number;
}

const GestaoMateriais = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [filtroMateria, setFiltroMateria] = useState("");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedRef = useRef<{ id: string; materia: string } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "materiais_publicados"),
      orderBy("data_publicacao", "desc")
    );
    return onSnapshot(q, (snap) => {
      setMateriais(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Material[]
      );
    });
  }, []);

  const excluir = async (id: string) => {
    if (
      !confirm(
        "Atenção: Deseja apagar este material permanentemente da área de todos os alunos?"
      )
    )
      return;
    try {
      const material = materiais.find((m) => m.id === id);
      if (material?.url_pdf) {
        const fileRef = ref(storage, material.url_pdf);
        await deleteObject(fileRef).catch((e) =>
          console.log("Ficheiro já não existia no storage.", e)
        );
      }
      await deleteDoc(doc(db, "materiais_publicados", id));
      toast.success("Material e ficheiro PDF removidos com sucesso.");
    } catch (e) {
      toast.error("Erro ao excluir material.");
    }
  };

  // --- AGRUPAMENTO POR MATÉRIA (com filtro aplicado) ---
  const grupos = useMemo(() => {
    const filtrados = filtroMateria
      ? materiais.filter((m) => m.materia === filtroMateria)
      : materiais;

    const map = new Map<string, Material[]>();
    for (const m of filtrados) {
      const chave = m.materia || "Sem disciplina";
      if (!map.has(chave)) map.set(chave, []);
      map.get(chave)!.push(m);
    }

    // Dentro de cada grupo: ordena por `ordem` ascendente.
    // Itens sem `ordem` vão para o final (mantendo a ordem por data vinda do snapshot).
    for (const [k, lista] of map) {
      lista.sort((a, b) => {
        const oa = typeof a.ordem === "number" ? a.ordem : Number.POSITIVE_INFINITY;
        const ob = typeof b.ordem === "number" ? b.ordem : Number.POSITIVE_INFINITY;
        return oa - ob;
      });
      map.set(k, lista);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [materiais, filtroMateria]);

  const toggleGrupo = (materia: string) => {
    setAbertos((prev) => ({ ...prev, [materia]: !prev[materia] }));
  };

  // --- DRAG AND DROP (HTML5) ---
  const handleDragStart = (id: string, materia: string) => {
    draggedRef.current = { id, materia };
  };

  const handleDragOver = (e: React.DragEvent, alvoId: string) => {
    e.preventDefault();
    setDragOverId(alvoId);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = async (
    e: React.DragEvent,
    alvoId: string,
    materia: string,
    lista: Material[]
  ) => {
    e.preventDefault();
    setDragOverId(null);

    const dragged = draggedRef.current;
    draggedRef.current = null;
    if (!dragged || dragged.id === alvoId) return;
    if (dragged.materia !== materia) {
      toast.error("Só é possível reordenar dentro da mesma disciplina.");
      return;
    }

    const fromIdx = lista.findIndex((m) => m.id === dragged.id);
    const toIdx = lista.findIndex((m) => m.id === alvoId);
    if (fromIdx === -1 || toIdx === -1) return;

    const novaLista = [...lista];
    const [movido] = novaLista.splice(fromIdx, 1);
    novaLista.splice(toIdx, 0, movido);

    // Atualização otimista (UI primeiro)
    setMateriais((prev) => {
      const ids = new Set(novaLista.map((m) => m.id));
      const resto = prev.filter((m) => !ids.has(m.id));
      return [
        ...resto,
        ...novaLista.map((m, i) => ({ ...m, ordem: i })),
      ];
    });

    // Persistência em batch no Firestore
    try {
      const batch = writeBatch(db);
      novaLista.forEach((m, i) => {
        batch.update(doc(db, "materiais_publicados", m.id), { ordem: i });
      });
      await batch.commit();
      toast.success("Ordem atualizada com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar a nova ordem.");
    }
  };

  return (
    <div className="space-y-6">
      {/* FILTRO */}
      <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 max-w-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <Label className="text-[10px] uppercase font-black text-muted-foreground">
            Filtrar por Disciplina
          </Label>
          <select
            className="w-full h-8 bg-transparent text-sm font-bold border-none focus:ring-0"
            value={filtroMateria}
            onChange={(e) => setFiltroMateria(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="DADM">DADM</option>
            <option value="DPEN">DPEN</option>
            <option value="DTRI">DTRI</option>
          </select>
        </div>
      </div>

      {/* ACORDEÃO POR MATÉRIA */}
      <div className="space-y-3">
        {grupos.length === 0 && (
          <p className="p-8 text-center text-muted-foreground italic">
            Nenhum material publicado encontrado.
          </p>
        )}

        {grupos.map(([materia, lista]) => {
          const aberto = !!abertos[materia];
          return (
            <div
              key={materia}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
            >
              {/* CABEÇALHO CLICÁVEL */}
              <button
                type="button"
                onClick={() => toggleGrupo(materia)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {aberto ? (
                    <ChevronDown className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-black uppercase tracking-wide text-primary">
                    {materia}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {lista.length} {lista.length === 1 ? "item" : "itens"}
                </span>
              </button>

              {/* CONTEÚDO EXPANSÍVEL COM DnD */}
              {aberto && (
                <div className="p-4 border-t border-border bg-background/40 space-y-2">
                  {lista.map((m) => {
                    const isHover = dragOverId === m.id;
                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={() => handleDragStart(m.id, materia)}
                        onDragOver={(e) => handleDragOver(e, m.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, m.id, materia, lista)}
                        className={`group flex items-center gap-3 bg-card border rounded-lg px-3 py-3 transition-all cursor-move ${
                          isHover
                            ? "border-accent ring-2 ring-accent/40"
                            : "border-border hover:border-accent/60"
                        }`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary" />

                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            m.tipo === "Simulado"
                              ? "bg-orange-500/10 text-orange-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {m.tipo === "Simulado" ? (
                            <Timer className="h-4 w-4" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-primary leading-tight truncate">
                            {m.titulo}
                          </h4>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">
                            {m.materia} •{" "}
                            {m.data_publicacao?.toDate?.().toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 font-bold text-xs shrink-0"
                          asChild
                        >
                          <a href={m.url_pdf} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> PDF
                          </a>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0"
                          onClick={() => excluir(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GestaoMateriais;
