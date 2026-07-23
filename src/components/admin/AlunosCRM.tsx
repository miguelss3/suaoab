// src/components/admin/AlunosCRM.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc, deleteDoc } from "firebase/firestore";
import { Search, AlertCircle, Ban, Trash2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { calcularVagasVisiveis, classificarAluno, countAlunosPremium, MOTIVOS_INATIVIDADE, paraData } from "@/lib/ciclo";
import { AlunoParaRepescagem } from "@/lib/repescagem";
import ModalEnvioRepescagem from "./ModalEnvioRepescagem";
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
  faseEstudo?: string;
  materia: string;
  matricula?: string;
  status?: string;
  data_cadastro?: Date | { toDate: () => Date } | string;
  data_expiracao?: Date | { toDate: () => Date } | string;
  data_conversao_premium?: Date | { toDate: () => Date } | string;
  acessoVitalicio?: boolean;
  metas?: Meta[];
  motivo_inatividade?: string;
  ultimo_envio_repescagem?: Date | { toDate: () => Date } | string;
}

const AlunosCRM = () => {
  const [alunos, setAlunos] = useState<AlunoCRM[]>([]);
  const [busca, setBusca] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoCRM | null>(null);
  const [linkRepescagem, setLinkRepescagem] = useState("");
  const [extensaoEmailAtiva, setExtensaoEmailAtiva] = useState(false);
  const [filaRepescagem, setFilaRepescagem] = useState<AlunoParaRepescagem[] | null>(null);

  useEffect(() => {
    const qAlunos = query(collection(db, "alunos"), orderBy("data_cadastro", "desc"));
    const unsub = onSnapshot(qAlunos, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AlunoCRM, 'id'>) })) as AlunoCRM[];
      setAlunos(data);
      setAlunoSelecionado((atual) => {
        if (!atual) return atual;
        return data.find(a => a.id === atual.id) ?? atual;
      });
    });
    return () => unsub();
  }, []);

  // Link de repescagem (50% OFF) e status da extensão de e-mail vêm das mesmas
  // configurações usadas em Ciclos e Prazos.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "configuracoes", "oferta_atual"), (snap) => {
      const data = snap.data();
      setLinkRepescagem(typeof data?.link_repescagem === "string" ? data.link_repescagem : "");
      setExtensaoEmailAtiva(data?.extensao_email_ativa === true);
    });
    return () => unsub();
  }, []);

  const calcularProgresso = (metas: Meta[] | undefined) => {
    if (!metas || metas.length === 0) return 0;
    const concluidas = metas.filter(m => m.status === "concluida" || m.concluida === true).length;
    return Math.round((concluidas / metas.length) * 100);
  };

  const renderPerfilBadge = (faseEstudo?: string) => {
    const faseNormalizada = faseEstudo?.trim().toLowerCase();

    if (faseNormalizada === "estudante de graduação" || faseNormalizada === "graduacao") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-blue-100 text-blue-800">
          Graduação
        </span>
      );
    }

    if (faseNormalizada?.includes("1ª fase") || faseNormalizada?.includes("1a fase") || faseNormalizada === "primeira_fase") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-emerald-100 text-emerald-800">
          1ª Fase
        </span>
      );
    }

    if (faseNormalizada?.includes("2ª fase") || faseNormalizada?.includes("2a fase") || faseNormalizada === "segunda_fase") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-orange-100 text-orange-800">
          2ª Fase
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-gray-100 text-gray-800">
        Perfil não informado
      </span>
    );
  };

// src/components/admin/AlunosCRM.tsx (Trecho da função handleMudarStatus)
  const handleMudarStatus = (id: string, novoStatus: string) => {
    const executarMudanca = async () => {
      try {
        const dadosAtualizacao: any = { status: novoStatus };
        
        // AJUSTE: Ao reativar, dá 90 dias de prazo para o aluno não ser bloqueado de novo
        if (novoStatus === "premium") {
          const novaData = new Date();
          novaData.setDate(novaData.getDate() + 90);
          dadosAtualizacao.data_expiracao = novaData.toISOString().split('T')[0];
          // Usado pelo Painel de Vendas para o gráfico de evolução de matrículas Premium.
          dadosAtualizacao.data_conversao_premium = new Date();
        }

        await updateDoc(doc(db, "alunos", id), dadosAtualizacao);
        toast.success(`Aluno ${novoStatus === 'premium' ? 'Reativado' : 'Inativado'} com sucesso!`);
      } catch (e) { toast.error("Erro ao atualizar status."); }
    };
    executarMudanca();
  };

  const handleExcluirAluno = async (alunoId: string, nomeAluno: string) => {
    const confirmouExclusao = window.confirm(
      `Tem certeza que deseja excluir o cadastro de ${nomeAluno}? Esta ação removerá o perfil do banco de dados e não pode ser desfeita.`
    );

    if (!confirmouExclusao) {
      return;
    }

    try {
      await deleteDoc(doc(db, "alunos", alunoId));
      setAlunos((alunosAtuais) => alunosAtuais.filter((aluno) => aluno.id !== alunoId));
      setAlunoSelecionado((alunoAtual) => (alunoAtual?.id === alunoId ? null : alunoAtual));
      toast.success("Aluno excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
      toast.error("Erro ao excluir aluno. Tente novamente.");
    }
  };

  const handleMudarMotivoInatividade = async (id: string, motivo: string) => {
    try {
      await updateDoc(doc(db, "alunos", id), { motivo_inatividade: motivo });
    } catch (e) {
      toast.error("Erro ao salvar o motivo de inatividade.");
    }
  };

  const paraAlunoRepescagem = (aluno: AlunoCRM) => ({
    id: aluno.id,
    nome: aluno.nome,
    email: aluno.email,
    motivo_inatividade: aluno.motivo_inatividade,
    ultimoEnvio: paraData(aluno.ultimo_envio_repescagem),
  });

  const formatarUltimoEnvio = (aluno: AlunoCRM) => {
    const data = paraData(aluno.ultimo_envio_repescagem);
    return data ? data.toLocaleDateString("pt-BR") : "Nunca enviado";
  };

  const filtrarAlunos = (filtro: 'premium' | 'leads' | 'inativos' | 'graduacao') => {
    const buscaNormalizada = busca.trim().toLowerCase();
    const lista = alunos.filter(a => {
      // Sem termo de busca, todo mundo passa (inclusive cadastros incompletos sem
      // nome/e-mail, que antes ficavam invisíveis em todas as abas por engano).
      const matchesSearch =
        !buscaNormalizada ||
        (a.nome?.toLowerCase().includes(buscaNormalizada) ?? false) ||
        (a.email?.toLowerCase().includes(buscaNormalizada) ?? false);

      // Fonte única de classificação — a mesma usada no Painel de Vendas — para
      // os contadores nunca divergirem entre telas. A conta de simulação do
      // professor ("sandbox") nunca aparece em nenhuma aba do CRM.
      const categoria = classificarAluno(a);
      if (categoria === "sandbox") return false;

      const matchesStatus =
        filtro === 'graduacao' ? categoria === 'graduacao' :
        filtro === 'premium' ? categoria === 'premium' :
        filtro === 'inativos' ? categoria === 'inativo' :
        categoria === 'em_teste';

      return matchesSearch && matchesStatus;
    });

    if (filtro === 'graduacao') {
      // Ordenar por disciplina (matéria) e depois por nome
      return [...lista].sort((a, b) => {
        const ma = (a.materia ?? "").toLowerCase();
        const mb = (b.materia ?? "").toLowerCase();
        if (ma !== mb) return ma.localeCompare(mb, 'pt-BR');
        return (a.nome ?? "").localeCompare(b.nome ?? "", 'pt-BR');
      });
    }

    return lista;
  };

  const calcularExpiracaoLead = (aluno: AlunoCRM) => {
    let d: Date;

    if (aluno.data_expiracao) {
      if (typeof aluno.data_expiracao === "string") {
        d = new Date(aluno.data_expiracao);
      } else if (Array.isArray(aluno.data_expiracao)) {
        // AJUSTE: Proteção extra para ler a data mesmo se o bug do array persistir
        d = new Date(aluno.data_expiracao[0]);
      } else if (aluno.data_expiracao instanceof Date) {
        d = aluno.data_expiracao;
      } else {
        d = (aluno.data_expiracao as any).toDate();
      }
    } else if (aluno.data_cadastro) {
      if (typeof aluno.data_cadastro === "string") {
        d = new Date(aluno.data_cadastro);
      } else if (aluno.data_cadastro instanceof Date) {
        d = aluno.data_cadastro;
      } else {
        d = (aluno.data_cadastro as any).toDate();
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

  // --- Sincroniza vagas exibidas na landing sempre que a lista de alunos muda ---
  // A inativação por expiração roda na Cloud Function agendada `manutencaoDiariaAlunos`
  // (servidor, uma vez por dia) — não mais aqui. Antes, ela só acontecia quando um
  // admin tinha esta aba aberta no navegador, o que fazia o contador de Inativos
  // "pular" de forma imprevisível dependendo de quem estava com o painel aberto.
  useEffect(() => {
    const sincronizarVagasVisiveis = async () => {
      if (alunos.length === 0) return;

      try {
        const docRef = doc(db, "configuracoes", "ciclo_atual");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const config = docSnap.data();
          // Já desconta quem tecnicamente expirou mas ainda não foi flagado pelo
          // job diário, para a contagem pública não ficar defasada até 24h.
          const alunosVigentes = alunos.filter((aluno) => !calcularExpiracaoLead(aluno).expirado);
          const matriculados = countAlunosPremium(alunosVigentes);
          const vagasVisiveis = calcularVagasVisiveis(config.vagas_totais, matriculados, config.teto_vagas_exibidas);

          if (
            Number(config.matriculados) !== matriculados ||
            Number(config.vagas_restantes) !== vagasVisiveis
          ) {
            await updateDoc(docRef, {
              matriculados,
              vagas_restantes: vagasVisiveis,
            });
          }
        }
      } catch (error) {
        console.error("Erro ao sincronizar vagas exibidas:", error);
      }
    };

    sincronizarVagasVisiveis();
  }, [alunos]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <h3 className="font-display font-bold text-primary italic">Dossiês Acadêmicos</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." className="pl-9 w-full" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="premium" className="bg-card rounded-xl border border-border overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/10 h-auto sm:h-12 px-2 sm:px-6 gap-2 sm:gap-6 overflow-x-auto flex-nowrap py-2 sm:py-0 custom-scrollbar">
          <TabsTrigger value="premium" className="font-bold whitespace-nowrap">Premium ({filtrarAlunos('premium').length})</TabsTrigger>
          <TabsTrigger value="graduacao" className="font-bold whitespace-nowrap">Graduação ({filtrarAlunos('graduacao').length})</TabsTrigger>
          <TabsTrigger value="leads" className="font-bold whitespace-nowrap">Em Teste ({filtrarAlunos('leads').length})</TabsTrigger>
          <TabsTrigger value="inativos" className="font-bold text-muted-foreground whitespace-nowrap">Inativos ({filtrarAlunos('inativos').length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="premium" className="p-0">
          <div className="w-full">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left">Aluno</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left">Matéria</th>
                  <th className="px-4 sm:px-6 py-4 text-left">Progresso</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrarAlunos('premium').map(aluno => (
                  <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="font-bold text-primary">{aluno.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{aluno.email}</div>
                      {renderPerfilBadge(aluno.faseEstudo)}
                      <div className="text-[10px] font-black text-accent tracking-widest uppercase mt-0.5 mb-2">Matrícula: {aluno.matricula || "S/N"}</div>
                      
                      <div className="sm:hidden text-[10px] font-bold text-muted-foreground mb-2">
                        Matéria: {aluno.materia}
                      </div>
                      <div className="flex sm:hidden items-center gap-2 mt-2 w-full">
                        <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-destructive border border-transparent hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")} title="Desativar Aluno"><Ban className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                    
                    <td className="hidden sm:table-cell px-6 py-4 font-bold align-top">{aluno.materia}</td>
                    
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                        <Progress value={calcularProgresso(aluno.metas)} className="h-1.5 w-12" />
                        <span className="text-[10px] font-bold">{calcularProgresso(aluno.metas)}%</span>
                      </div>
                    </td>
                    
                    <td className="hidden sm:table-cell px-6 py-4 text-right space-x-2 align-top">
                      <Button variant="outline" size="sm" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")} title="Desativar Aluno"><Ban className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="graduacao" className="p-0">
          <div className="w-full">
            {(() => {
              const lista = filtrarAlunos('graduacao');
              if (lista.length === 0) {
                return (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Nenhum aluno de Graduação cadastrado ainda.
                  </div>
                );
              }
              // Agrupar por disciplina (materia)
              const grupos = lista.reduce<Record<string, AlunoCRM[]>>((acc, a) => {
                const chave = (a.materia?.trim() || "Disciplina não informada");
                if (!acc[chave]) acc[chave] = [];
                acc[chave].push(a);
                return acc;
              }, {});
              const chaves = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
              return (
                <div className="divide-y divide-border">
                  {chaves.map((disciplina) => (
                    <div key={disciplina}>
                      <div className="bg-muted/30 px-4 sm:px-6 py-2 text-[11px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                        <span>{disciplina}</span>
                        <span className="text-muted-foreground">{grupos[disciplina].length} {grupos[disciplina].length === 1 ? 'aluno' : 'alunos'}</span>
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          {grupos[disciplina].map((aluno) => (
                            <tr key={aluno.id} className="border-b border-border last:border-0 hover:bg-muted/5 transition-colors">
                              <td className="px-4 sm:px-6 py-4 align-top">
                                <div className="font-bold text-primary">{aluno.nome}</div>
                                <div className="text-[10px] text-muted-foreground">{aluno.email}</div>
                                {renderPerfilBadge(aluno.faseEstudo)}
                                <div className="text-[10px] font-black text-accent tracking-widest uppercase mt-0.5 mb-2">Matrícula: {aluno.matricula || "S/N"}</div>
                                <div className="flex sm:hidden items-center gap-2 mt-2 w-full">
                                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                                  <Button variant="ghost" size="sm" className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-6 py-4 text-right space-x-2 align-top w-px whitespace-nowrap">
                                <Button variant="outline" size="sm" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="p-0">
          <div className="w-full">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left">Aluno</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left">Matéria</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left">Expira em</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrarAlunos('leads').map(aluno => {
                  const expiracao = calcularExpiracaoLead(aluno);
                  return (
                    <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="px-4 sm:px-6 py-4 align-top">
                        <div className="font-bold text-primary">{aluno.nome}</div>
                        <div className="text-[10px] text-muted-foreground mb-2">{aluno.email}</div>
                        {renderPerfilBadge(aluno.faseEstudo)}
                        
                        <div className="sm:hidden flex flex-col gap-1.5 mb-3">
                          <span className="text-[10px] font-bold text-muted-foreground">Matéria: {aluno.materia}</span>
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center w-max gap-1 ${expiracao.expirado ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{expiracao.expirado && <AlertCircle className="h-3 w-3" />} {expiracao.texto}</span>
                        </div>
                        <div className="flex sm:hidden items-center gap-2 mt-2 w-full">
                          <Button variant="accent" size="sm" className="h-8 text-xs flex-1" onClick={() => handleMudarStatus(aluno.id, "premium")}>Ativar</Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-destructive border border-transparent hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")}><Ban className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-muted-foreground border border-transparent hover:bg-destructive/10 hover:text-destructive" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                      
                      <td className="hidden sm:table-cell px-6 py-4 font-bold align-top">{aluno.materia}</td>
                      
                      <td className="hidden sm:table-cell px-6 py-4 align-top">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center w-max gap-1 ${expiracao.expirado ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{expiracao.expirado && <AlertCircle className="h-3 w-3" />} {expiracao.texto}</span>
                      </td>
                      
                      <td className="hidden sm:table-cell px-6 py-4 text-right space-x-2 align-top">
                        <Button variant="accent" size="sm" onClick={() => handleMudarStatus(aluno.id, "premium")}>Ativar</Button>
                        <Button variant="outline" size="sm" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")}><Ban className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="inativos" className="p-0">
          <div className="w-full">
            {(() => {
              const inativos = filtrarAlunos('inativos');
              const elegiveisEnvioMassa = inativos.filter((a) => !!a.email);
              return (
                <div className="border-b border-border bg-muted/10">
                  {!extensaoEmailAtiva && (
                    <div className="flex items-start gap-2 px-4 sm:px-6 pt-3 text-xs text-accent">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        A extensão de e-mail ainda não foi confirmada em Ciclos e Prazos. O pedido de repescagem fica
                        registrado, mas nenhum e-mail sai de fato até isso ser configurado.
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6">
                    <p className="text-xs text-muted-foreground">
                      {inativos.length} {inativos.length === 1 ? 'aluno inativo' : 'alunos inativos'}. Use a repescagem para tentar reverter a saída.
                    </p>
                    <Button
                      variant="hero"
                      size="sm"
                      className="font-bold gap-2"
                      disabled={elegiveisEnvioMassa.length === 0}
                      onClick={() => setFilaRepescagem(inativos.map(paraAlunoRepescagem))}
                    >
                      <Mail className="h-4 w-4" /> Enviar para todos os inativos ({elegiveisEnvioMassa.length})
                    </Button>
                  </div>
                </div>
              );
            })()}
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left">Aluno</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left">Matéria</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left">Motivo</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left">Repescagem</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrarAlunos('inativos').map(aluno => (
                    <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors opacity-60 grayscale hover:grayscale-0 hover:opacity-100">
                      <td className="px-4 sm:px-6 py-4 align-top">
                        <div className="font-bold text-primary">{aluno.nome}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 mb-2">{aluno.email}</div>
                        {renderPerfilBadge(aluno.faseEstudo)}

                        <div className="sm:hidden text-[10px] font-bold text-muted-foreground mb-2">
                          Matéria: {aluno.materia}
                        </div>
                        <div className="sm:hidden mb-3 space-y-2">
                          <select
                            className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background"
                            value={aluno.motivo_inatividade || ""}
                            onChange={(e) => handleMudarMotivoInatividade(aluno.id, e.target.value)}
                          >
                            <option value="">Motivo não informado</option>
                            {MOTIVOS_INATIVIDADE.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-muted-foreground">Última oferta: {formatarUltimoEnvio(aluno)}</p>
                        </div>
                        <div className="flex sm:hidden mt-2 w-full gap-2 flex-wrap">
                          <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => handleMudarStatus(aluno.id, "premium")}>Reativar Aluno</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-accent hover:bg-accent/10"
                            disabled={!aluno.email}
                            onClick={() => setFilaRepescagem([paraAlunoRepescagem(aluno)])}
                            title="Enviar oferta de repescagem"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>

                      <td className="hidden sm:table-cell px-6 py-4 font-bold align-top">{aluno.materia}</td>

                      <td className="hidden sm:table-cell px-6 py-4 align-top">
                        <select
                          className="h-8 text-xs border border-input rounded-md px-2 bg-background"
                          value={aluno.motivo_inatividade || ""}
                          onChange={(e) => handleMudarMotivoInatividade(aluno.id, e.target.value)}
                        >
                          <option value="">Não informado</option>
                          {MOTIVOS_INATIVIDADE.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="hidden sm:table-cell px-6 py-4 align-top text-[11px] text-muted-foreground">
                        {formatarUltimoEnvio(aluno)}
                      </td>

                      <td className="hidden sm:table-cell px-6 py-4 text-right space-x-2 align-top">
                        <Button variant="outline" size="sm" onClick={() => handleMudarStatus(aluno.id, "premium")}>Reativar</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-accent hover:bg-accent/10"
                          disabled={!aluno.email}
                          onClick={() => setFilaRepescagem([paraAlunoRepescagem(aluno)])}
                          title="Enviar oferta de repescagem"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcluirAluno(aluno.id, aluno.nome)} title="Excluir Aluno"><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {filaRepescagem && (
        <ModalEnvioRepescagem
          alunos={filaRepescagem}
          linkRepescagem={linkRepescagem}
          extensaoEmailAtiva={extensaoEmailAtiva}
          onClose={() => setFilaRepescagem(null)}
        />
      )}

      {alunoSelecionado && (
        <DossieAluno 
          aluno={alunoSelecionado} 
          onClose={() => setAlunoSelecionado(null)} 
        />
      )}
    </div>
  );
};

export default AlunosCRM;