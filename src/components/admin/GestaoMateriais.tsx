// src/components/admin/GestaoMateriais.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, deleteDoc, orderBy } from "firebase/firestore";
import { Trash2, ExternalLink, Filter, BookOpen, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const GestaoMateriais = () => {
  const [materiais, setMateriais] = useState<any[]>([]);
  const [filtroMateria, setFiltroMateria] = useState("");

  useEffect(() => {
    const q = query(collection(db, "materiais_publicados"), orderBy("data_publicacao", "desc"));
    return onSnapshot(q, (snap) => {
      setMateriais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const excluir = async (id: string) => {
    if (confirm("Atenção: Deseja apagar este material permanentemente da área de todos os alunos?")) {
      await deleteDoc(doc(db, "materiais_publicados", id));
      toast.success("Material removido com sucesso.");
    }
  };

  const filtrados = materiais.filter(m => filtroMateria ? m.materia === filtroMateria : true);

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 max-w-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <Label className="text-[10px] uppercase font-black text-muted-foreground">Filtrar por Disciplina</Label>
          <select className="w-full h-8 bg-transparent text-sm font-bold border-none focus:ring-0" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
            <option value="">Todas</option>
            <option value="DADM">DADM</option>
            <option value="DPEN">DPEN</option>
            <option value="DTRI">DTRI</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent transition-all shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${m.tipo === 'Simulado' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                {m.tipo === 'Simulado' ? <Timer className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
              </div>
              {/* Botão de Excluir agora visível permanentemente */}
              <Button variant="ghost" size="sm" className="bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={() => excluir(m.id)}>
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
            <h4 className="font-bold text-primary leading-tight mb-1">{m.titulo}</h4>
            <p className="text-[10px] font-black uppercase text-muted-foreground">{m.materia} • {m.data_publicacao?.toDate?.().toLocaleDateString('pt-BR')}</p>
            <Button variant="outline" className="w-full mt-4 h-9 font-bold text-xs" asChild>
              <a href={m.url_pdf} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-2"/> Acessar PDF</a>
            </Button>
          </div>
        ))}
        {filtrados.length === 0 && <p className="col-span-3 p-8 text-center text-muted-foreground italic">Nenhum material publicado encontrado.</p>}
      </div>
    </div>
  );
};

export default GestaoMateriais;