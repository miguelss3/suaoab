// src/components/admin/AlunosCRM.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { Search, AlertCircle, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import DossieAluno from "./DossieAluno"; 

type MetaStatus = "bloqueada" | "liberada" | "concluida" | "pulada";

interface Meta {
  atividade: string;
  orientacoes: string;
  link?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  status: MetaStatus;
  concluida: boolean;
  data_sugerida?: string;
  arquivo_file?: File | null;
}

interface AlunoCRM {
  id: string;
  nome: string;
  email?: string;
  materia: string;
  matricula?: string;
  status?: string;
  data_cadastro?: Date | { toDate: () => Date } | string;
  data_expiracao?: Date | { toDate: () => Date } | string;
  metas?: Meta[];
}

const AlunosCRM = () => {
  const [alunos, setAlunos] = useState<AlunoCRM[]>([]);
  const [busca, setBusca] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoCRM | null>(null);
  const [modalConfirmacao, setModalConfirmacao] = useState({ isOpen: false, titulo: "", mensagem: "", acao: () => {} });

  useEffect(() => {
    const qAlunos = query(collection(db, "alunos"), orderBy("data_cadastro", "desc"));
    const unsub = onSnapshot(qAlunos, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AlunoCRM, 'id'>) })) as AlunoCRM[];
      setAlunos(data);
      if (alunoSelecionado) {
        const atualizado = data.find(a => a.id === alunoSelecionado.id);
        if (atualizado) setAlunoSelecionado(atualizado);
      }
    });
    return () => unsub();
  }, [alunoSelecionado]);

  const calcularProgresso = (metas: Meta[] | undefined) => {
    if (!metas || metas.length === 0) return 0;
    const concluidas = metas.filter(m => m.status === "concluida" || m.concluida === true).length;
    return Math.round((concluidas / metas.length) * 100);
  };

  const handleMudarStatus = (id: string, novoStatus: string) => {
    const executarMudanca = async () => {
      try {
        await updateDoc(doc(db, "alunos", id), { status: novoStatus });
        toast.success(`Status alterado para ${novoStatus.toUpperCase()}!`);
      } catch (e) { toast.error("Erro ao atualizar status."); }
    };

    if (novoStatus === "inativo") {
      setModalConfirmacao({
        isOpen: true,
        titulo: "Desativar Aluno?",
        mensagem: "Desativar este aluno bloqueará imediatamente o seu acesso à plataforma. Tem a certeza que deseja continuar?",
        acao: () => { setModalConfirmacao(prev => ({ ...prev, isOpen: false })); executarMudanca(); }
      });
    } else {
      executarMudanca();
    }
  };

  const filtrarAlunos = (filtro: 'premium' | 'leads' | 'inativos') => {
    return alunos.filter(a => {
      const matchesSearch = a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
      const status = a.status?.toLowerCase() || "";
      let matchesStatus = false;
      if (filtro === 'premium') matchesStatus = status === "premium";
      else if (filtro === 'inativos') matchesStatus = status === "inativo";
      else matchesStatus = status !== "premium" && status !== "inativo"; 
      return matchesSearch && matchesStatus;
    });
  };

  const calcularExpiracaoLead = (aluno: AlunoCRM) => {
    let d: Date;

    if (aluno.data_expiracao) {
      if (typeof aluno.data_expiracao === "string") {
        d = new Date(aluno.data_expiracao);
      } else if (aluno.data_expiracao instanceof Date) {
        d = aluno.data_expiracao;
      } else {
        d = aluno.data_expiracao.toDate();
      }
    } else if (aluno.data_cadastro) {
      if (typeof aluno.data_cadastro === "string") {
        d = new Date(aluno.data_cadastro);
      } else if (aluno.data_cadastro instanceof Date) {
        d = aluno.data_cadastro;
      } else {
        d = aluno.data_cadastro.toDate();
      }
    } else {
      d = new Date();
    }

    if (!aluno.data_expiracao) {
      d = new Date(d.getTime());
      d.setDate(d.getDate() + 3);
    }

    const diffHoras = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60));
    return diffHoras <= 0 ? { texto: "EXPIRADO", expirado: true } : { texto: `${diffHoras}h restantes`, expirado: false };
  };

  useEffect(() => {
    const varrerExpirados = async () => {
      const alunosEmTeste = alunos.filter(a => a.status !== "premium" && a.status !== "inativo");
      
      for (const aluno of alunosEmTeste) {
        const expiracao = calcularExpiracaoLead(aluno);
        if (expiracao.expirado) {
          try {
            await updateDoc(doc(db, "alunos", aluno.id), { status: "inativo" });
            console.log(`[AUTOMAÇÃO] Aluno ${aluno.nome} foi inativado por expiração.`);
          } catch (e) {
            console.error("Erro ao inativar aluno", e);
          }
        }
      }
    };

    if (alunos.length > 0) {
      varrerExpirados();
    }
  }, [alunos]);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
        <h3 className="font-display font-bold text-primary italic">Dossiês Acadêmicos</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="premium" className="bg-card rounded-xl border border-border overflow-hidden">
         <TabsList className="w-full justify-start rounded-none border-b bg-muted/10 h-12 px-6 gap-6">
          <TabsTrigger value="premium" className="font-bold">Premium ({filtrarAlunos('premium').length})</TabsTrigger>
          <TabsTrigger value="leads" className="font-bold">Em Teste ({filtrarAlunos('leads').length})</TabsTrigger>
          <TabsTrigger value="inativos" className="font-bold text-muted-foreground">Inativos ({filtrarAlunos('inativos').length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="premium" className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground"><tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">Matéria</th><th className="px-6 py-4 text-left">Progresso</th><th className="px-6 py-4 text-right">Ação</th></tr></thead>
            <tbody>
              {filtrarAlunos('premium').map(aluno => (
                <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                  <td className="px-6 py-4"><div className="font-bold text-primary">{aluno.nome}</div><div className="text-[10px] text-muted-foreground">{aluno.email}</div><div className="text-[10px] font-black text-accent tracking-widest uppercase mt-0.5">Matrícula: {aluno.matricula || "S/N"}</div></td>
                  <td className="px-6 py-4 font-bold">{aluno.materia}</td>
                  <td className="px-6 py-4"><div className="flex items-center gap-2"><Progress value={calcularProgresso(aluno.metas)} className="h-1.5 w-12" /><span className="text-[10px] font-bold">{calcularProgresso(aluno.metas)}%</span></div></td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")} title="Desativar Aluno"><Ban className="h-4 w-4"/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="leads" className="p-0">
           <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground"><tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">Matéria</th><th className="px-6 py-4 text-left">Expira em</th><th className="px-6 py-4 text-right">Ação</th></tr></thead>
            <tbody>
              {filtrarAlunos('leads').map(aluno => {
                const expiracao = calcularExpiracaoLead(aluno);
                return (
                  <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4"><div className="font-bold text-primary">{aluno.nome}</div><div className="text-[10px] text-muted-foreground">{aluno.email}</div></td>
                    <td className="px-6 py-4 font-bold">{aluno.materia}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center w-max gap-1 ${expiracao.expirado ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{expiracao.expirado && <AlertCircle className="h-3 w-3" />} {expiracao.texto}</span></td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="accent" size="sm" onClick={() => handleMudarStatus(aluno.id, "premium")}>Ativar</Button>
                      <Button variant="outline" size="sm" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")}><Ban className="h-4 w-4"/></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="inativos" className="p-0">
           <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground"><tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">Matéria</th><th className="px-6 py-4 text-right">Ação</th></tr></thead>
            <tbody>
              {filtrarAlunos('inativos').map(aluno => (
                  <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors opacity-60 grayscale">
                    <td className="px-6 py-4">
                      {/* CIRURGIA DO EMAIL NOS INATIVOS */}
                      <div className="font-bold text-primary">{aluno.nome}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{aluno.email}</div>
                    </td>
                    <td className="px-6 py-4 font-bold">{aluno.materia}</td>
                    <td className="px-6 py-4 text-right space-x-2"><Button variant="outline" size="sm" onClick={() => handleMudarStatus(aluno.id, "premium")}>Reativar</Button></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>

      {alunoSelecionado && (
        <DossieAluno 
          aluno={alunoSelecionado} 
          onClose={() => setAlunoSelecionado(null)} 
        />
      )}

      {modalConfirmacao.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-destructive" /></div>
            <h3 className="text-xl font-display font-bold text-primary mb-2">{modalConfirmacao.titulo}</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{modalConfirmacao.mensagem}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModalConfirmacao({ ...modalConfirmacao, isOpen: false })}>Cancelar</Button>
              <Button variant="destructive" className="flex-1 font-bold" onClick={modalConfirmacao.acao}>Sim, Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlunosCRM;