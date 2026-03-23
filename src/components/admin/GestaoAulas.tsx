// src/components/admin/GestaoAulas.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { Trash2, PlayCircle, Plus, LayoutList, Youtube, Pencil, Filter, X, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AulaGlobal } from "@/lib/aulas";
import { toast } from "sonner";

const mapDocToAula = (docSnap: { id: string; data: () => Record<string, unknown> }): AulaGlobal => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    titulo: typeof data.titulo === "string" ? data.titulo : "",
    materia: typeof data.materia === "string" ? data.materia : "",
    desc: typeof data.desc === "string" ? data.desc : "",
    youtubeId: typeof data.youtubeId === "string" ? data.youtubeId : "",
    data_publicacao:
      data.data_publicacao && typeof data.data_publicacao === "object"
        ? (data.data_publicacao as AulaGlobal["data_publicacao"])
        : null,
  };
};

const GestaoAulas = () => {
  const [aulas, setAulas] = useState<AulaGlobal[]>([]);
  const [filtroMateria, setFiltroMateria] = useState("");
  const [erroCarregamento, setErroCarregamento] = useState("");
  
  // Campos do formulário
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Busca as aulas no banco de dados
  useEffect(() => {
    const q = query(collection(db, "aulas_globais"), orderBy("data_publicacao", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setErroCarregamento("");
        setAulas(snap.docs.map(mapDocToAula));
      },
      (error) => {
        console.error("Erro ao carregar aulas globais:", error);
        setAulas([]);
        setErroCarregamento("Nao foi possivel carregar as videoaulas agora. Verifique permissao ou conexao.");
        toast.error("Erro ao carregar videoaulas.");
      }
    );
  }, []);

  // --- EXTRATOR DE FORÇA BRUTA (100% à prova de falhas) ---
  const extrairYoutubeId = (urlOuId: string) => {
    if (!urlOuId) return "";
    const str = String(urlOuId).trim();

    // Se o professor já colou apenas os 11 caracteres limpos
    if (str.length === 11 && !str.includes("/") && !str.includes("?")) return str;

    // Tática de Força Bruta 1: Formato "youtu.be/"
    if (str.includes("youtu.be/")) {
        const partes = str.split("youtu.be/");
        if (partes.length > 1) return partes[1].substring(0, 11);
    }

    // Tática de Força Bruta 2: Formato "watch?v="
    if (str.includes("v=")) {
        const partes = str.split("v=");
        if (partes.length > 1) return partes[1].substring(0, 11);
    }

    // Tática de Força Bruta 3: Formato "live/"
    if (str.includes("live/")) {
        const partes = str.split("live/");
        if (partes.length > 1) return partes[1].substring(0, 11);
    }

    // Regex de segurança caso seja um formato super obscuro
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/);
    if (match?.[1]) return match[1];

    return "";
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setTitulo("");
    setMateria("");
    setYoutubeInput("");
    setDesc("");
  };

  const handleSalvarAula = async () => {
    if (!titulo || !materia || !youtubeInput) return toast.error("Preencha Título, Matéria e o Link/ID do YouTube.");
    
    setIsPublishing(true);
    try {
      const youtubeIdFinal = extrairYoutubeId(youtubeInput);

      if (youtubeIdFinal.length !== 11) {
        toast.error("Não foi possível extrair um ID válido do YouTube. Cole a URL completa ou o ID de 11 caracteres.");
        return;
      }
      
      const dadosAula = {
        titulo,
        materia,
        desc: desc || "",
        youtubeId: String(youtubeIdFinal) // Garante que é sempre texto simples
      };

      if (editandoId) {
        await updateDoc(doc(db, "aulas_globais", editandoId), dadosAula);
        toast.success("Aula atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "aulas_globais"), {
          ...dadosAula,
          data_publicacao: serverTimestamp()
        });
        toast.success("Nova videoaula publicada para os alunos!");
      }
      
      limparFormulario();
    } catch (e) {
      toast.error("Erro ao salvar a aula.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditar = (aula: AulaGlobal) => {
    setEditandoId(aula.id);
    setTitulo(aula.titulo || "");
    setMateria(aula.materia || "");
    setDesc(aula.desc || "");

    setYoutubeInput(String(aula.youtubeId || ""));
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleExcluir = async (id: string) => {
    if (window.confirm("Atenção: Tem certeza que deseja apagar esta aula? Ela sumirá imediatamente da plataforma dos alunos.")) {
      try {
        await deleteDoc(doc(db, "aulas_globais", id));
        toast.success("Aula removida do sistema!");
        if (editandoId === id) limparFormulario();
      } catch (error) {
        toast.error("Erro ao excluir aula.");
      }
    }
  };

  const aulasFiltradas = aulas.filter((aula) => filtroMateria ? aula.materia === filtroMateria : true);

  return (
    <div className="space-y-6">
      
      {/* PAINEL DE CRIAÇÃO / EDIÇÃO */}
      <div className={`p-6 rounded-xl border shadow-sm transition-colors ${editandoId ? 'bg-accent/5 border-accent' : 'bg-card border-border'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-display font-bold flex items-center gap-2 ${editandoId ? 'text-accent' : 'text-primary'}`}>
            {editandoId ? <Pencil className="h-5 w-5" /> : <PlayCircle className="h-5 w-5 text-accent"/>} 
            {editandoId ? "Modo de Edição de Aula" : "Adicionar Nova Aula no Acervo"}
          </h3>
          {editandoId && (
            <Button variant="ghost" size="sm" onClick={limparFormulario} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-2"/> Cancelar Edição
            </Button>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-black text-muted-foreground">Disciplina</Label>
            <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={materia} onChange={e => setMateria(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="DADM">DADM</option>
              <option value="DPEN">DPEN</option>
              <option value="DTRI">DTRI</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs uppercase font-black text-muted-foreground">Título da Aula</Label>
            <Input placeholder="Ex: Resposta à Acusação (Completo)" value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs uppercase font-black text-muted-foreground">Descrição / Dicas (Opcional)</Label>
            <Textarea 
              placeholder="Digite o resumo da aula, base legal, artigos importantes..." 
              className="min-h-[100px]"
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
            />
          </div>

          <div className="space-y-2 flex flex-col h-full justify-between">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-black text-muted-foreground flex items-center gap-1">
                <Youtube className="h-4 w-4 text-destructive" /> Link ou ID do YouTube
              </Label>
              <Input placeholder="Cole o link ou apenas o código" value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">O sistema extrai o ID automaticamente.</p>
            </div>
            
            <Button variant={editandoId ? "accent" : "hero"} className="w-full mt-auto h-12" onClick={handleSalvarAula} disabled={isPublishing}>
              {isPublishing ? "A gravar..." : (editandoId ? <><Save className="h-4 w-4 mr-2"/> Salvar Alterações</> : <><Plus className="h-4 w-4 mr-2"/> Publicar Aula</>)}
            </Button>
          </div>
        </div>
      </div>

      {/* LISTAGEM E FILTRO */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 bg-muted/10 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary"/>
            <h3 className="font-bold text-primary">Acervo de Aulas Globais</h3>
            <span className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded ml-2">{aulasFiltradas.length} VÍDEOS</span>
          </div>
          
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              className="bg-transparent border-none text-sm outline-none w-full sm:w-auto font-bold text-primary cursor-pointer"
              value={filtroMateria}
              onChange={(e) => setFiltroMateria(e.target.value)}
            >
              <option value="">Todas as Matérias</option>
              <option value="DADM">DADM</option>
              <option value="DPEN">DPEN</option>
              <option value="DTRI">DTRI</option>
            </select>
          </div>
        </div>
        
        <div className="w-full">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="hidden sm:table-cell px-6 py-4">Data/Hora</th>
                <th className="hidden sm:table-cell px-6 py-4">Disciplina</th>
                <th className="px-4 sm:px-6 py-4">Aula / Detalhes</th>
                <th className="hidden sm:table-cell px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {erroCarregamento && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-destructive font-medium bg-destructive/5 border-b border-border">
                    {erroCarregamento}
                  </td>
                </tr>
              )}
              {aulasFiltradas.map((aula) => {
                const idParaMostrar = String(aula.youtubeId);
                const idSuspeito = idParaMostrar.length !== 11;

                return (
                  <tr key={aula.id} className={`border-b border-border hover:bg-muted/5 transition-colors ${idSuspeito ? 'bg-destructive/5' : ''}`}>
                    
                    {/* COLUNA 1: Data/Hora (Apenas PC) */}
                    <td className="hidden sm:table-cell px-6 py-4 text-xs text-muted-foreground align-top">
                      {aula.data_publicacao?.toDate?.().toLocaleString('pt-BR') || "Recente"}
                    </td>
                    
                    {/* COLUNA 2: Disciplina (Apenas PC) */}
                    <td className="hidden sm:table-cell px-6 py-4 align-top">
                      <span className="font-black text-[10px] uppercase bg-accent/20 text-accent px-2 py-1 rounded tracking-widest">
                        {aula.materia}
                      </span>
                    </td>
                    
                    {/* COLUNA 3: Detalhes da Aula (Mobile e PC) */}
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="font-bold text-primary mb-1 text-base sm:text-sm">{aula.titulo}</div>
                      
                      {/* INFO MOBILE: Disciplina e Data */}
                      <div className="sm:hidden flex flex-wrap gap-2 items-center mt-2 mb-3">
                        <span className="font-black text-[10px] uppercase bg-accent/20 text-accent px-2 py-1 rounded tracking-widest">
                          {aula.materia}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {aula.data_publicacao?.toDate?.().toLocaleDateString('pt-BR') || "Recente"}
                        </span>
                      </div>

                      {/* ID YouTube (Ambos) */}
                      <div className={`text-[10px] flex items-center gap-1 font-bold ${idSuspeito ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {idSuspeito ? <AlertTriangle className="h-3 w-3" /> : <Youtube className="h-3 w-3" />} 
                        ID: {idParaMostrar}
                      </div>

                      {/* BOTÕES DE AÇÃO MOBILE */}
                      <div className="flex sm:hidden items-center gap-2 mt-4 w-full">
                        <Button size="sm" variant="outline" className="h-9 flex-1 text-xs border-accent/30 text-accent hover:bg-accent/10" onClick={() => handleEditar(aula)}>
                          <Pencil className="h-4 w-4 mr-1.5" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 px-4 text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive/10" onClick={() => handleExcluir(aula.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    
                    {/* COLUNA 4: Ação (Apenas PC) */}
                    <td className="hidden sm:table-cell px-6 py-4 text-right align-top">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="border hover:bg-accent/10 hover:text-accent" onClick={() => handleEditar(aula)} title="Editar Aula">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30" onClick={() => handleExcluir(aula.id)} title="Excluir Aula">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!erroCarregamento && aulasFiltradas.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">Nenhuma aula encontrada para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GestaoAulas;