// src/components/admin/GestaoMaterialProcessual.tsx
// Classifica os materiais já publicados (cadernos e simulados) em Direito
// Material ou Direito Processual, para organizar o conteúdo de cada disciplina
// pela divisão clássica usada nos estudos jurídicos.
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { DISCIPLINAS_SEGUNDA_FASE } from "@/lib/disciplinasSegundaFase";

type CategoriaConteudo = "material" | "processual" | "";

interface MaterialPublicado {
  id: string;
  titulo?: string;
  materia?: string;
  tipo?: string;
  categoria?: CategoriaConteudo;
}

const OPCOES_CATEGORIA: { valor: CategoriaConteudo; label: string }[] = [
  { valor: "", label: "Não classificado" },
  { valor: "material", label: "Direito Material" },
  { valor: "processual", label: "Direito Processual" },
];

const GestaoMaterialProcessual = () => {
  const [materiais, setMateriais] = useState<MaterialPublicado[]>([]);
  const [filtroMateria, setFiltroMateria] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "materiais_publicados"), orderBy("data_publicacao", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMateriais(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MaterialPublicado, "id">) })));
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar materiais:", error);
        toast.error("Erro ao carregar materiais.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const materiaisFiltrados = useMemo(
    () => (filtroMateria ? materiais.filter((m) => m.materia === filtroMateria) : materiais),
    [materiais, filtroMateria]
  );

  const handleAlterarCategoria = async (id: string, categoria: CategoriaConteudo) => {
    try {
      await updateDoc(doc(db, "materiais_publicados", id), { categoria });
      toast.success("Classificação atualizada.");
    } catch (error) {
      console.error("Erro ao classificar material:", error);
      toast.error("Erro ao atualizar a classificação.");
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground font-bold">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary italic">Material e Processual</h2>
            <p className="text-sm text-muted-foreground">
              Classifique os cadernos e simulados publicados como Direito Material ou Processual.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setFiltroMateria("")}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
              filtroMateria === "" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
            }`}
          >
            Todas
          </button>
          {DISCIPLINAS_SEGUNDA_FASE.map(({ codigo, nome }) => (
            <button
              key={codigo}
              type="button"
              onClick={() => setFiltroMateria(codigo)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                filtroMateria === codigo ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
              }`}
            >
              {nome}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Material</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left">Disciplina</th>
                <th className="px-4 py-3 text-left">Classificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {materiaisFiltrados.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                    Nenhum material publicado ainda.
                  </td>
                </tr>
              )}
              {materiaisFiltrados.map((material) => (
                <tr key={material.id} className="hover:bg-muted/5">
                  <td className="px-4 py-3">
                    <div className="font-bold text-primary">{material.titulo || "Sem título"}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{material.tipo}</div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">{material.materia}</td>
                  <td className="px-4 py-3">
                    <select
                      value={material.categoria || ""}
                      onChange={(e) => handleAlterarCategoria(material.id, e.target.value as CategoriaConteudo)}
                      className="h-9 text-xs border border-input rounded-md px-2 bg-background"
                    >
                      {OPCOES_CATEGORIA.map((opcao) => (
                        <option key={opcao.valor} value={opcao.valor}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GestaoMaterialProcessual;
