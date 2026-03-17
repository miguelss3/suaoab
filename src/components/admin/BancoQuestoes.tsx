// src/components/admin/BancoQuestoes.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { Plus, Trash2, Filter, X, Search, History, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BancoQuestoes = () => {
  const [questoes, setQuestoes] = useState<any[]>([]);
  
  // Filtros
  const [filtroMateria, setFiltroMateria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [isBuscaAtiva, setIsBuscaAtiva] = useState(false);
  
  const [showAdd, setShowAdd] = useState(false);
  
  // Form de Nova Questão
  const [materia, setMateria] = useState("");
  const [tipo, setTipo] = useState("Discursiva");
  const [enunciado, setEnunciado] = useState("");
  const [gabarito, setGabarito] = useState("");

  // Estados de Edição
  const [questaoEditandoId, setQuestaoEditandoId] = useState<string | null>(null);
  const [editMateria, setEditMateria] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editEnunciado, setEditEnunciado] = useState("");
  const [editGabarito, setEditGabarito] = useState("");

  useEffect(() => {
    const q = query(collection(db, "banco_questoes"), orderBy("data_criacao", "desc"));
    return onSnapshot(q, (snap) => {
      setQuestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const salvarQuestao = async () => {
    if (!materia || !enunciado) return toast.error("Preencha o conteúdo!");
    const idQuestao = Math.floor(10000 + Math.random() * 90000).toString();
    try {
      await setDoc(doc(db, "banco_questoes", idQuestao), {
        id_questao: idQuestao, materia, tipo, enunciado, gabarito, historico_uso: [], data_criacao: serverTimestamp()
      });
      toast.success(`Questão #${idQuestao} guardada!`);
      setShowAdd(false); setEnunciado(""); setGabarito("");
    } catch (e) { toast.error("Erro ao salvar."); }
  };

  const deleteQuestao = async (id: string) => {
    if (confirm("Apagar questão definitivamente? O histórico dela será perdido.")) await deleteDoc(doc(db, "banco_questoes", id));
  };

  const abrirEdicaoQuestao = (q: any) => {
    setQuestaoEditandoId(q.id);
    setEditMateria(q.materia);
    setEditTipo(q.tipo);
    setEditEnunciado(q.enunciado);
    setEditGabarito(q.gabarito);
  };

  const salvarEdicaoQuestao = async () => {
    if (!editMateria || !editEnunciado) return toast.error("A matéria e o enunciado são obrigatórios!");
    try {
      await updateDoc(doc(db, "banco_questoes", questaoEditandoId!), {
        materia: editMateria,
        tipo: editTipo,
        enunciado: editEnunciado,
        gabarito: editGabarito
      });
      toast.success("Questão atualizada com sucesso!");
      setQuestaoEditandoId(null);
    } catch (e) {
      toast.error("Erro ao atualizar questão.");
    }
  };

  const ativarBusca = () => {
    if (!filtroMateria) return toast.error("Selecione pelo menos 'Todas as Matérias' ou uma específica.");
    setIsBuscaAtiva(true);
  };

  const limparBusca = () => {
    setFiltroMateria("");
    setFiltroTipo("");
    setIsBuscaAtiva(false);
  };

  const questoesFiltradas = questoes.filter(q => {
    const matchMateria = filtroMateria === "Todas" || q.materia === filtroMateria;
    const matchTipo = filtroTipo === "" || filtroTipo === "Todos" ? true : q.tipo === filtroTipo;
    return matchMateria && matchTipo;
  });

  return (
    <div className="space-y-6">
      <div className="bg-card p-5 rounded-xl border border-border flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row items-end gap-4 w-full md:w-auto">
          <div className="w-full md:w-48 space-y-1">
            <Label className="text-[10px] uppercase font-black text-muted-foreground">Matéria</Label>
            <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="Todas">Todas as Matérias</option>
              <option value="DADM">DADM</option>
              <option value="DPEN">DPEN</option>
              <option value="DTRI">DTRI</option>
            </select>
          </div>
          <div className="w-full md:w-48 space-y-1">
            <Label className="text-[10px] uppercase font-black text-muted-foreground">Tipo de Questão</Label>
            <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos os Tipos</option>
              <option value="Discursiva">Discursiva</option>
              <option value="Peça">Peça Prática</option>
            </select>
          </div>
          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <Button variant="accent" onClick={ativarBusca}><Search className="h-4 w-4 mr-2"/> Buscar</Button>
            {isBuscaAtiva && <Button variant="outline" onClick={limparBusca}>Limpar</Button>}
          </div>
        </div>
        
        <Button variant="hero" onClick={() => setShowAdd(true)} className="md:mt-5"><Plus className="h-4 w-4 mr-2"/> Nova Questão</Button>
      </div>

      {!isBuscaAtiva ? (
        <div className="bg-muted/10 border-2 border-dashed rounded-2xl p-20 text-center">
          <Filter className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-xl font-bold text-primary mb-2">Acervo Recolhido</h3>
          <p className="text-muted-foreground font-bold">Selecione os filtros acima e clique em "Buscar" para carregar as questões.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/10">
            <h4 className="font-bold text-primary text-sm flex items-center gap-2">
              Resultados da Busca <span className="bg-accent text-white px-2 py-0.5 rounded text-[10px]">{questoesFiltradas.length} encontradas</span>
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b">
              <tr>
                <th className="px-6 py-4 text-left">ID / Matéria</th>
                <th className="px-6 py-4 text-left">Tipo</th>
                <th className="px-6 py-4 text-left">Enunciado (Resumo)</th>
                <th className="px-6 py-4 text-left">Histórico de Uso no Motor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {questoesFiltradas.map(q => (
                <tr key={q.id} className="border-b border-border hover:bg-muted/5">
                  <td className="px-6 py-4">
                    <span className="font-black text-muted-foreground block">#{q.id_questao}</span>
                    <span className="font-bold text-primary text-xs">{q.materia}</span>
                  </td>
                  <td className="px-6 py-4 font-medium">{q.tipo}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[200px]">{q.enunciado}</td>
                  <td className="px-6 py-4">
                    {q.historico_uso && q.historico_uso.length > 0 ? (
                      <div className="space-y-1">
                        {q.historico_uso.map((uso: any, i: number) => (
                          <div key={i} className="text-[9px] bg-accent/10 border border-accent/20 text-accent px-2 py-1 rounded w-max flex items-center gap-1">
                            <History className="h-3 w-3"/>
                            {uso.titulo} ({new Date(uso.data).toLocaleDateString('pt-BR')})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded">Nova / Inédita</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <Button variant="ghost" size="sm" className="border hover:bg-accent/10 hover:text-accent" onClick={() => abrirEdicaoQuestao(q)} title="Editar Questão">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteQuestao(q.id)} title="Excluir">
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </td>
                </tr>
              ))}
              {questoesFiltradas.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">Nenhuma questão corresponde a este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Adicionar Nova */}
      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-primary/90 backdrop-blur-md">
          <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-bold text-primary italic">Alimentar Banco de Dados</h3>
              <Button variant="ghost" onClick={() => setShowAdd(false)}><X/></Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Matéria</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={materia} onChange={e => setMateria(e.target.value)}>
                   <option value="">Selecione...</option><option value="DADM">DADM</option><option value="DPEN">DPEN</option><option value="DTRI">DTRI</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={tipo} onChange={e => setTipo(e.target.value)}>
                   <option value="Discursiva">Questão Discursiva</option><option value="Peça">Peça Prática</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
               <Label>Enunciado Oficial</Label>
               <Textarea className="min-h-[150px]" value={enunciado} onChange={e => setEnunciado(e.target.value)} />
            </div>
            <div className="space-y-1">
               <Label>Padrão de Resposta (Gabarito)</Label>
               <Textarea className="min-h-[150px]" value={gabarito} onChange={e => setGabarito(e.target.value)} />
            </div>
            <Button className="w-full h-12" variant="hero" onClick={salvarQuestao}>Guardar no Banco</Button>
          </div>
        </div>
      )}

      {/* Modal de EDIÇÃO */}
      {questaoEditandoId !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Pencil className="h-5 w-5 text-accent"/> Editar Questão</h3>
              <Button variant="ghost" onClick={() => setQuestaoEditandoId(null)}><X/></Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Matéria</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={editMateria} onChange={e => setEditMateria(e.target.value)}>
                   <option value="DADM">DADM</option><option value="DPEN">DPEN</option><option value="DTRI">DTRI</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background" value={editTipo} onChange={e => setEditTipo(e.target.value)}>
                   <option value="Discursiva">Questão Discursiva</option><option value="Peça">Peça Prática</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
               <Label>Enunciado Oficial</Label>
               <Textarea className="min-h-[150px]" value={editEnunciado} onChange={e => setEditEnunciado(e.target.value)} />
            </div>
            <div className="space-y-1">
               <Label>Padrão de Resposta (Gabarito)</Label>
               <Textarea className="min-h-[150px]" value={editGabarito} onChange={e => setEditGabarito(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setQuestaoEditandoId(null)}>Cancelar</Button>
              <Button variant="hero" onClick={salvarEdicaoQuestao}>Salvar Alterações</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BancoQuestoes;