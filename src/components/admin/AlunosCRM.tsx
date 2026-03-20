// src/components/admin/AlunosCRM.tsx
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Search, ChevronLeft, Plus, Trash2, Unlock, Lock, 
  Target, Link as LinkIcon, FileText, UploadCloud, Wand2, Calendar, CheckCircle2, Pencil, X, AlertCircle, Ban 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const AlunosCRM = () => {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  
  // NOVO ESTADO: O nosso escudo contra bloqueios do navegador
  const [modalConfirmacao, setModalConfirmacao] = useState({
    isOpen: false,
    titulo: "",
    mensagem: "",
    acao: () => {}
  });
  
  // Estados - Meta Manual
  const [novaMetaTitulo, setNovaMetaTitulo] = useState("");
  const [novaMetaDescricao, setNovaMetaDescricao] = useState("");
  const [novaMetaLink, setNovaMetaLink] = useState("");
  const [novaMetaArquivo, setNovaMetaArquivo] = useState<File | null>(null);
  const [novaMetaPrazo, setNovaMetaPrazo] = useState("");
  const [isUploadingMeta, setIsUploadingMeta] = useState(false);

  // Estados - Edição de Meta
  const [metaEditandoIdx, setMetaEditandoIdx] = useState<number | null>(null);
  const [editMetaTitulo, setEditMetaTitulo] = useState("");
  const [editMetaDescricao, setEditMetaDescricao] = useState("");
  const [editMetaLink, setEditMetaLink] = useState("");
  const [editMetaArquivo, setEditMetaArquivo] = useState<File | null>(null);
  const [editMetaPrazo, setEditMetaPrazo] = useState("");
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  // Estados - Motor Adaptativo (ROTA)
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMetas, setPreviewMetas] = useState<any[]>([]);
  const [tipoDataRota, setTipoDataRota] = useState("oficial");
  const [dataProva, setDataProva] = useState("");
  const [globalDataProva, setGlobalDataProva] = useState(""); 
  const [isApplyingRota, setIsApplyingRota] = useState(false);
  const [qtdMetasPersonalizadas, setQtdMetasPersonalizadas] = useState("10"); 

  useEffect(() => {
    const qAlunos = query(collection(db, "alunos"), orderBy("data_cadastro", "desc"));
    const unsub = onSnapshot(qAlunos, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlunos(data);
      if (alunoSelecionado) {
        const atualizado = data.find(a => a.id === alunoSelecionado.id);
        if (atualizado) setAlunoSelecionado(atualizado);
      }
    });
    return () => unsub();
  }, [alunoSelecionado?.id]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracoes", "ciclo_atual"));
        if (snap.exists() && snap.data().data_prova) {
          setGlobalDataProva(snap.data().data_prova);
        }
      } catch (error) {
        console.error("Erro ao buscar ciclo atual", error);
      }
    };
    fetchConfig();
  }, []);

  const calcularProgresso = (metas: any[]) => {
    if (!metas || metas.length === 0) return 0;
    const concluidas = metas.filter(m => m.status === "concluida" || m.concluida === true).length;
    return Math.round((concluidas / metas.length) * 100);
  };

  // NOVA FUNÇÃO: Atualizada para usar o nosso Modal ao invés do window.confirm
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
        acao: () => {
          setModalConfirmacao(prev => ({ ...prev, isOpen: false }));
          executarMudanca();
        }
      });
    } else {
      executarMudanca();
    }
  };

  const handleAdicionarMeta = async () => {
    if (!novaMetaTitulo || !novaMetaDescricao) return toast.error("Preencha título e orientações.");
    setIsUploadingMeta(true);
    try {
      let arquivoUrl = ""; let arquivoNome = "";
      if (novaMetaArquivo) {
        const safeName = novaMetaArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `materiais_alunos/${alunoSelecionado.materia}/metas_anexos/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, novaMetaArquivo);
        arquivoUrl = await getDownloadURL(snapshot.ref);
        arquivoNome = novaMetaArquivo.name;
      }
      
      const prazoIso = novaMetaPrazo ? new Date(novaMetaPrazo + "T12:00:00").toISOString() : "";

      const novasMetas = [...(alunoSelecionado.metas || []), {
        atividade: novaMetaTitulo, orientacoes: novaMetaDescricao, link: novaMetaLink, 
        arquivo_url: arquivoUrl, arquivo_nome: arquivoNome, status: "bloqueada", concluida: false,
        data_sugerida: prazoIso
      }];
      await updateDoc(doc(db, "alunos", alunoSelecionado.id), { metas: novasMetas });
      
      setNovaMetaTitulo(""); setNovaMetaDescricao(""); setNovaMetaLink(""); setNovaMetaArquivo(null); setNovaMetaPrazo("");
      toast.success("Meta adicionada com sucesso!");
    } catch (e) { toast.error("Erro ao salvar."); } finally { setIsUploadingMeta(false); }
  };

  const abrirEdicaoMeta = (idx: number, meta: any) => {
    setMetaEditandoIdx(idx);
    setEditMetaTitulo(meta.atividade || "");
    setEditMetaDescricao(meta.orientacoes || "");
    setEditMetaLink(meta.link || "");
    setEditMetaArquivo(null);
    setEditMetaPrazo(meta.data_sugerida ? new Date(meta.data_sugerida).toISOString().split('T')[0] : "");
  };

  const handleSalvarEdicao = async () => {
    if (metaEditandoIdx === null) return;
    if (!editMetaTitulo || !editMetaDescricao) return toast.error("O título e orientações não podem ficar vazios.");
    
    setIsEditingMeta(true);
    try {
      let arquivoUrl = alunoSelecionado.metas[metaEditandoIdx].arquivo_url || "";
      let arquivoNome = alunoSelecionado.metas[metaEditandoIdx].arquivo_nome || "";

      if (editMetaArquivo) {
        const safeName = editMetaArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `materiais_alunos/${alunoSelecionado.materia}/metas_anexos/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, editMetaArquivo);
        arquivoUrl = await getDownloadURL(snapshot.ref);
        arquivoNome = editMetaArquivo.name;
      }

      const novasMetas = [...alunoSelecionado.metas];
      novasMetas[metaEditandoIdx] = {
        ...novasMetas[metaEditandoIdx],
        atividade: editMetaTitulo,
        orientacoes: editMetaDescricao,
        link: editMetaLink,
        arquivo_url: arquivoUrl,
        arquivo_nome: arquivoNome,
        data_sugerida: editMetaPrazo ? new Date(editMetaPrazo + "T12:00:00").toISOString() : novasMetas[metaEditandoIdx].data_sugerida
      };

      await updateDoc(doc(db, "alunos", alunoSelecionado.id), { metas: novasMetas });
      toast.success("Meta atualizada!");
      setMetaEditandoIdx(null);
    } catch (e) { toast.error("Erro ao atualizar a meta."); } finally { setIsEditingMeta(false); }
  };

  const calcularRotaPreview = () => {
    const alvo = tipoDataRota === "oficial" ? globalDataProva : dataProva;

    if (!alvo) return toast.error("Por favor, defina ou escolha uma data alvo.");

    const hoje = new Date();
    const prova = new Date(alvo + "T12:00:00");
    const diffTime = prova.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return toast.error("A data limite deve ser no futuro.");

    let qtdMetasNovas = parseInt(qtdMetasPersonalizadas);
    if (isNaN(qtdMetasNovas) || qtdMetasNovas <= 0) {
      return toast.error("Por favor, insira uma quantidade válida de metas.");
    }

    const metasAtuais = alunoSelecionado.metas || [];
    const metasPreservadas = metasAtuais.filter((m: any, idx: number) => 
      idx === 0 || m.status === 'concluida' || m.status === 'pulada'
    );

    const ciclosMentor = [
      { titulo: "Identificação de Peça e Esqueleto Estrutural", texto: "O primeiro passo para o sucesso é não errar a peça! Leia os enunciados propostos e treine apenas a identificação da medida cabível e o rascunho do esqueleto. Estruture os tópicos no rascunho antes de começar a escrever definitivamente." },
      { titulo: "Leitura Dirigida e Expansão de Marcações", texto: "Vamos reforçar a base teórica. Dedique esta sessão à leitura atenta da doutrina indicada e aproveite para enriquecer as marcações do seu Vade Mecum com as remissões permitidas pelo edital. Um Vade Mecum bem marcado é metade da prova!" },
      { titulo: "Laboratório Prático: Redação Completa", texto: "É o momento de colocar a teoria no papel. Redija a peça proposta do início ao fim, prestando atenção à estética, caligrafia e endereçamento. Lembre-se: o examinador da FGV precisa de facilidade para encontrar as suas teses na folha de resposta." },
      { titulo: "Bateria de Discursivas: Foco no Espelho", texto: "A banca pontua com base em palavras-chave. Ao responder às questões de hoje, treine a técnica de ir direto à resposta, indicando o fundamento legal ou a súmula com precisão. Nada de introduções longas ou floreados: seja cirúrgico." },
      { titulo: "Revisão Cirúrgica e Caderno de Erros", texto: "Aprender com os próprios erros é o caminho mais rápido para a aprovação. Analise o feedback das suas últimas peças. Anote os artigos que esqueceu de citar e garanta que não volta a falhar na estruturação desses pontos." },
      { titulo: "Mapeamento de Jurisprudência e Súmulas", texto: "Muitas teses vencedoras e pontos fáceis estão escondidos nas Súmulas! Dedique esta meta exclusivamente à leitura das Súmulas Vinculantes e da jurisprudência dominante relacionada com a nossa disciplina. Domine o índice remissivo." },
      { titulo: "Treino de Agilidade sob Pressão", texto: "O tempo é o seu maior adversário na 2ª Fase. Tente resolver o bloco de questões de hoje controlando o cronómetro. Treine a rapidez na consulta ao índice do Vade Mecum sem perder a qualidade da sua fundamentação legal." },
      { titulo: "Estruturação de Preliminares e Mérito", texto: "Uma peça excelente começa a ganhar pontos logo nas preliminares. Estude os casos práticos de hoje focando em identificar todas as teses processuais (nulidades, tempestividade, legitimidade) antes de mergulhar no mérito da causa." },
      { titulo: "Simulação de Resgate: Teses Subsidiárias", texto: "A FGV adora esconder pontos preciosos em pedidos subsidiários e teses secundárias. Treine a sua atenção aos detalhes do enunciado para garantir que absolutamente nenhuma alínea do espelho de correção fica de fora da sua peça." },
      { titulo: "Revisão Ativa e Fixação de Roteiros", texto: "Dia de consolidar o conhecimento! Faça uma revisão mental dos roteiros das principais peças (endereçamento, qualificação, do direito e dos pedidos) e fortaleça a sua confiança. A repetição exaustiva é a mãe da excelência na OAB." }
    ];

    const metasGeradas = [];
    const intervaloMs = diffTime / qtdMetasNovas;

    for (let i = 0; i < qtdMetasNovas; i++) {
      let metaDate = new Date(hoje.getTime() + (intervaloMs * (i + 1)));
      if (metaDate > prova) metaDate = new Date(prova);

      let cicloAtual = ciclosMentor[i % ciclosMentor.length];
      let tituloAtividade = cicloAtual.titulo;
      let textoOrientacao = cicloAtual.texto;

      if (i === qtdMetasNovas - 1) {
         tituloAtividade = "Simulado Final e Preparação de Véspera";
         textoOrientacao = "O grande momento está a chegar! Faça este simulado nas mesmas condições da prova real: isole-se, controle rigorosamente as 5 horas e não utilize o telemóvel. Confie no processo, você está pronto para a vermelhinha!";
      }

      metasGeradas.push({
        atividade: tituloAtividade,
        orientacoes: textoOrientacao,
        link: "", 
        arquivo_url: "",
        arquivo_nome: "",
        arquivo_file: null, 
        status: i < 2 ? "liberada" : "bloqueada",
        concluida: false,
        data_sugerida: metaDate.toISOString()
      });
    }

    setPreviewMetas([...metasPreservadas, ...metasGeradas]);
    setShowRotaModal(false);
    setShowPreviewModal(true);
  };

  const handleEditPreviewMeta = (index: number, campo: string, valor: any) => {
    const metasAtualizadas = [...previewMetas];
    metasAtualizadas[index] = { ...metasAtualizadas[index], [campo]: valor };
    setPreviewMetas(metasAtualizadas);
  };

  const confirmarRotaAdaptativa = async () => {
    setIsApplyingRota(true);
    try {
      const metasFinalizadas = [...previewMetas];
      
      for (let i = 0; i < metasFinalizadas.length; i++) {
        let m = metasFinalizadas[i];
        if (m.arquivo_file) {
          const safeName = m.arquivo_file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const fileRef = ref(storage, `materiais_alunos/${alunoSelecionado.materia}/metas_anexos/${Date.now()}_${safeName}`);
          const snapshot = await uploadBytes(fileRef, m.arquivo_file);
          m.arquivo_url = await getDownloadURL(snapshot.ref);
          m.arquivo_nome = m.arquivo_file.name;
          delete m.arquivo_file; 
        }
      }

      await updateDoc(doc(db, "alunos", alunoSelecionado.id), { metas: metasFinalizadas });
      toast.success("Rota Adaptativa Aplicada com sucesso!");
      setShowPreviewModal(false);
      setPreviewMetas([]);
    } catch (e) { 
      toast.error("Erro ao aplicar rota."); 
    } finally {
      setIsApplyingRota(false);
    }
  };

  const handleToggleLiberarMeta = async (index: number, statusAtual: string) => {
    const novasMetas = [...alunoSelecionado.metas];
    novasMetas[index].status = statusAtual === "bloqueada" ? "liberada" : "bloqueada";
    if (novasMetas[index].status === "bloqueada") novasMetas[index].concluida = false;
    await updateDoc(doc(db, "alunos", alunoSelecionado.id), { metas: novasMetas });
  };

  // NOVA FUNÇÃO: Atualizada para usar o nosso Modal ao invés do window.confirm
  const handleExcluirMeta = (index: number) => {
    setModalConfirmacao({
      isOpen: true,
      titulo: "Apagar Meta?",
      mensagem: "Tem a certeza que deseja apagar esta meta? O aluno deixará de ter acesso a este conteúdo e esta ação não pode ser desfeita.",
      acao: async () => {
        setModalConfirmacao(prev => ({ ...prev, isOpen: false })); // Fecha o modal primeiro
        const novasMetas = [...alunoSelecionado.metas];
        novasMetas.splice(index, 1);
        await updateDoc(doc(db, "alunos", alunoSelecionado.id), { metas: novasMetas });
        toast.success("Meta apagada com sucesso!");
      }
    });
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

  const verificarAtraso = (dataIso: string, status: string) => {
    if (!dataIso || status === 'concluida' || status === 'pulada') return false;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const prazo = new Date(dataIso); prazo.setHours(0,0,0,0);
    return prazo < hoje;
  };

  const calcularExpiracaoLead = (aluno: any) => {
    let d;
    if (aluno.data_expiracao) {
      d = aluno.data_expiracao?.toDate ? aluno.data_expiracao.toDate() : new Date(aluno.data_expiracao);
    } else if (aluno.data_cadastro) {
      d = aluno.data_cadastro?.toDate ? aluno.data_cadastro.toDate() : new Date(aluno.data_cadastro);
      d.setDate(d.getDate() + 3); 
    } else {
      return { texto: "Desconhecido", expirado: false };
    }
    
    const diffMs = d.getTime() - new Date().getTime();
    const diffHoras = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHoras <= 0) {
      return { texto: "EXPIRADO", expirado: true };
    }
    return { texto: `${diffHoras}h restantes`, expirado: false };
  };

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
        
        {/* PREMIUM */}
        <TabsContent value="premium" className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground"><tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">Matéria</th><th className="px-6 py-4 text-left">Progresso</th><th className="px-6 py-4 text-right">Ação</th></tr></thead>
            <tbody>
              {filtrarAlunos('premium').map(aluno => (
                <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-primary">{aluno.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{aluno.email}</div>
                    <div className="text-[10px] font-black text-accent tracking-widest uppercase mt-0.5">Matrícula: {aluno.matricula || "S/N"}</div>
                  </td>
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

        {/* LEADS */}
        <TabsContent value="leads" className="p-0">
           <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
              <tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">Matéria</th><th className="px-6 py-4 text-left">Expira em</th><th className="px-6 py-4 text-right">Ação</th></tr>
            </thead>
            <tbody>
              {filtrarAlunos('leads').map(aluno => {
                const expiracao = calcularExpiracaoLead(aluno);
                return (
                  <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">{aluno.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{aluno.email}</div>
                      <div className="text-[10px] font-black text-accent tracking-widest uppercase mt-0.5">Matrícula: {aluno.matricula || "S/N"}</div>
                    </td>
                    <td className="px-6 py-4 font-bold">{aluno.materia}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center w-max gap-1 ${expiracao.expirado ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                        {expiracao.expirado && <AlertCircle className="h-3 w-3" />} {expiracao.texto}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="accent" size="sm" onClick={() => handleMudarStatus(aluno.id, "premium")}>Ativar</Button>
                      <Button variant="outline" size="sm" onClick={() => setAlunoSelecionado(aluno)}>Dossiê</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleMudarStatus(aluno.id, "inativo")} title="Bloquear"><Ban className="h-4 w-4"/></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabsContent>

        {/* INATIVOS */}
        <TabsContent value="inativos" className="p-0">
           <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
              <tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">Matéria</th><th className="px-6 py-4 text-right">Ação</th></tr>
            </thead>
            <tbody>
              {filtrarAlunos('inativos').map(aluno => (
                  <tr key={aluno.id} className="border-b border-border hover:bg-muted/5 transition-colors opacity-60 grayscale">
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">{aluno.nome}</div>
                      <div className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-0.5">Matrícula: {aluno.matricula || "S/N"}</div>
                    </td>
                    <td className="px-6 py-4 font-bold">{aluno.materia}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleMudarStatus(aluno.id, "premium")}>Reativar (Premium)</Button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>

      {/* MODAL DO DOSSIÊ DO ALUNO */}
      {alunoSelecionado && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-5xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
             <div className="p-6 border-b bg-muted/10 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-display font-bold text-primary italic">{alunoSelecionado.nome}</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Disciplina: {alunoSelecionado.materia}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowRotaModal(true)} variant="hero" className="font-bold shadow-md shadow-accent/20">
                    <Wand2 className="h-4 w-4 mr-2" /> Gerar Rota
                  </Button>
                  <Button onClick={() => setAlunoSelecionado(null)} variant="outline"><ChevronLeft className="h-4 w-4 mr-2" /> FECHAR</Button>
                </div>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="grid lg:grid-cols-5 gap-6">
                   <div className="lg:col-span-2 bg-muted/10 p-6 rounded-xl border border-border flex flex-col justify-center">
                      <div className="flex justify-between items-end mb-3">
                         <h3 className="font-bold text-primary">Evolução</h3>
                         <span className="text-3xl font-black text-primary">{calcularProgresso(alunoSelecionado.metas)}%</span>
                      </div>
                      <Progress value={calcularProgresso(alunoSelecionado.metas)} className="h-4" />
                   </div>

                   <div className="lg:col-span-3 bg-muted/10 p-5 rounded-xl border border-border">
                      <Label className="font-bold flex items-center gap-2 mb-4"><Plus className="h-4 w-4 text-accent"/> Inserção Manual de Meta</Label>
                      
                      <div className="space-y-4 mb-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Título</Label>
                            <Input placeholder="Ex: Fazer Questões" value={novaMetaTitulo} onChange={e => setNovaMetaTitulo(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">URL (Opcional)</Label>
                            <Input placeholder="Link de apoio" value={novaMetaLink} onChange={e => setNovaMetaLink(e.target.value)} />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-[1fr_150px] gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Orientações</Label>
                            <Input placeholder="Instruções para o aluno..." value={novaMetaDescricao} onChange={e => setNovaMetaDescricao(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Prazo Limite</Label>
                            <Input type="date" value={novaMetaPrazo} onChange={e => setNovaMetaPrazo(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <div className="flex-1 relative">
                          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setNovaMetaArquivo(e.target.files?.[0] || null)} />
                          <div className={`h-10 border rounded-md flex items-center px-3 text-sm ${novaMetaArquivo ? 'bg-success/10 border-success/30 text-success font-bold' : 'bg-background text-muted-foreground'}`}>
                            <UploadCloud className="h-4 w-4 mr-2"/> <span className="truncate">{novaMetaArquivo ? novaMetaArquivo.name : "Anexar PDF (Opcional)"}</span>
                          </div>
                        </div>
                        <Button variant="accent" onClick={handleAdicionarMeta} disabled={isUploadingMeta}>{isUploadingMeta ? "A guardar..." : "Publicar"}</Button>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   {(() => {
                      let metaCounter = 1;
                      return (alunoSelecionado.metas || []).map((m: any, idx: number) => {
                         const estaAtrasada = verificarAtraso(m.data_sugerida, m.status);
                         const isBoasVindas = m.atividade?.includes("Boas-Vindas");
                         const currentMetaNum = isBoasVindas ? 0 : metaCounter++;
                         
                         let style = { bg: "bg-background", border: "border-border", text: "text-primary", badge: "PENDENTE", lockClass: "text-success", icon: null as any };
                         
                         if (m.status === 'concluida') {
                           style = { bg: "bg-green-500/5", border: "border-green-500/20", text: "text-green-600 line-through", badge: "CONCLUÍDA", lockClass: "text-muted-foreground", icon: null };
                         } else if (m.status === 'pulada') {
                           style = { bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-600", badge: "PULADA", lockClass: "text-muted-foreground", icon: null };
                         } else if (estaAtrasada) {
                           style = { bg: "bg-destructive/5", border: "border-destructive/40", text: "text-destructive", badge: "ATRASADA", lockClass: "text-destructive", icon: <AlertCircle className="h-3 w-3 inline mr-1"/> };
                         } else if (m.status === 'bloqueada') {
                           style = { bg: "bg-muted/50", border: "border-border", text: "text-muted-foreground", badge: "BLOQUEADA", lockClass: "text-muted-foreground", icon: null };
                         }

                         return (
                            <div key={idx} className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${style.bg} ${style.border}`}>
                               <div className="flex-1">
                                  <span className={`text-[10px] font-black uppercase tracking-wider flex items-center ${estaAtrasada ? 'text-destructive' : m.status === 'pulada' ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                    {style.icon} Meta {currentMetaNum} • {style.badge} 
                                    {m.data_sugerida && <span className="ml-2 font-bold opacity-70 border-l pl-2 border-current"><Calendar className="h-3 w-3 inline mr-1 mb-0.5"/>{new Date(m.data_sugerida).toLocaleDateString('pt-BR')}</span>}
                                  </span>
                                  <h4 className={`font-bold mt-1 ${style.text}`}>{m.atividade}</h4>
                                  <p className="text-xs mt-1 opacity-70 whitespace-pre-line">{m.orientacoes}</p>
                                  
                                  {(m.link || m.arquivo_url) && (
                                    <div className="flex gap-3 mt-3">
                                      {m.link && <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded"><LinkIcon className="h-3 w-3"/> Link Anexado</a>}
                                      {m.arquivo_url && <a href={m.arquivo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded"><FileText className="h-3 w-3"/> {m.arquivo_nome || "Anexo"}</a>}
                                    </div>
                                  )}
                               </div>
                               <div className="flex gap-2 shrink-0">
                                  <Button size="sm" variant="ghost" className="border hover:bg-accent/10 hover:text-accent" onClick={() => abrirEdicaoMeta(idx, m)}><Pencil className="h-4 w-4" /></Button>
                                  {!isBoasVindas && (
                                    <Button size="sm" variant="ghost" className="border" onClick={() => handleToggleLiberarMeta(idx, m.status)}>
                                       {m.status === 'bloqueada' ? <Lock className={`h-4 w-4 ${style.lockClass}`} /> : <Unlock className={`h-4 w-4 ${style.lockClass}`} />}
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleExcluirMeta(idx)}><Trash2 className="h-4 w-4" /></Button>
                               </div>
                            </div>
                         );
                      });
                   })()}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE META COM DATA CORRIGIDA */}
      {metaEditandoIdx !== null && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Pencil className="h-5 w-5 text-accent"/> Editar Meta</h3>
              <Button variant="ghost" size="sm" onClick={() => setMetaEditandoIdx(null)}><X className="h-5 w-5"/></Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_150px] gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={editMetaTitulo} onChange={e => setEditMetaTitulo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo Limite</Label>
                  <Input type="date" value={editMetaPrazo} onChange={e => setEditMetaPrazo(e.target.value)} />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Orientações</Label>
                <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editMetaDescricao} onChange={e => setEditMetaDescricao(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Link (Opcional)</Label>
                <Input value={editMetaLink} onChange={e => setEditMetaLink(e.target.value)} />
              </div>

              <div className="space-y-2 bg-muted/10 p-4 rounded-lg border border-border">
                <Label className="block mb-2 text-xs">Anexo (Opcional)</Label>
                <div className="relative w-full">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setEditMetaArquivo(e.target.files?.[0] || null)} />
                  <div className={`h-10 border rounded-md flex items-center px-3 text-sm ${editMetaArquivo ? 'bg-success/10 text-success' : 'bg-background text-muted-foreground'}`}>
                    <UploadCloud className="h-4 w-4 mr-2"/> <span className="truncate">{editMetaArquivo ? editMetaArquivo.name : "Substituir anexo existente"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => setMetaEditandoIdx(null)}>Cancelar</Button>
              <Button variant="accent" onClick={handleSalvarEdicao} disabled={isEditingMeta}>{isEditingMeta ? "Salvando..." : "Salvar Alterações"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- NOVOS MODAIS DA ROTA ADAPTATIVA COM CONTROLE DE QUANTIDADE --- */}
      {showRotaModal && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setShowRotaModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5"/>
            </button>
            <h3 className="text-xl font-display font-bold text-primary mb-6 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-accent"/> Gerar Rota Adaptativa
            </h3>
            
            <div className="space-y-4">
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer flex items-start gap-3 transition-colors ${tipoDataRota === "oficial" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`} 
                onClick={() => setTipoDataRota("oficial")}
              >
                <input type="radio" checked={tipoDataRota === "oficial"} onChange={() => {}} className="mt-1 accent-accent" />
                <div>
                  <h4 className="font-bold text-sm text-primary">Data Oficial do Exame</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {globalDataProva ? `Exame configurado para: ${new Date(globalDataProva + "T12:00:00").toLocaleDateString('pt-BR')}` : "Nenhuma data configurada no Motor de Ciclos"}
                  </p>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer flex items-start gap-3 transition-colors ${tipoDataRota === "personalizada" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`} 
                onClick={() => setTipoDataRota("personalizada")}
              >
                <input type="radio" checked={tipoDataRota === "personalizada"} onChange={() => {}} className="mt-1 accent-accent" />
                <div className="w-full">
                  <h4 className="font-bold text-sm text-primary mb-2">Data Personalizada</h4>
                  {tipoDataRota === "personalizada" && (
                     <Input type="date" className="mt-2" value={dataProva} onChange={e => setDataProva(e.target.value)} />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 border-2 border-border rounded-xl bg-muted/10">
              <h4 className="font-bold text-sm text-primary mb-1">Volume de Metas</h4>
              <p className="text-xs text-muted-foreground mb-3">Quantas missões o sistema deve distribuir até a data limite para este aluno?</p>
              <Input 
                type="number" 
                min="1" 
                max="50" 
                value={qtdMetasPersonalizadas} 
                onChange={e => setQtdMetasPersonalizadas(e.target.value)} 
                className="font-bold text-lg h-12"
              />
            </div>

            <Button variant="hero" className="w-full mt-8 h-12" onClick={calcularRotaPreview}>
              Avançar para Edição
            </Button>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom-4">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
             <div className="p-6 border-b bg-muted/10 flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-bold text-primary">Edição de Rota (Pré-visualização)</h3>
                 <p className="text-xs text-muted-foreground mt-1">Altere os títulos, textos, adicione links ou PDFs antes de confirmar.</p>
               </div>
               <button onClick={() => setShowPreviewModal(false)} className="text-muted-foreground hover:text-foreground" disabled={isApplyingRota}>
                 <X className="h-5 w-5"/>
               </button>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {(() => {
                   let previewCounter = 1;
                   return previewMetas.map((m, i) => {
                      const isBoasVindas = m.atividade?.includes("Boas-Vindas");
                      const currentPreviewNum = isBoasVindas ? 0 : previewCounter++;
                      
                      if (m.status === 'concluida' || isBoasVindas) {
                         return (
                            <div key={i} className="p-4 rounded-xl border-l-4 border-l-success border-border bg-success/5 opacity-60 flex justify-between items-center">
                               <div>
                                 <span className="text-xs font-black uppercase text-success tracking-wider mb-1 block">Meta {currentPreviewNum} (Já Concluída)</span>
                                 <h4 className="font-bold text-foreground text-sm">{m.atividade}</h4>
                               </div>
                            </div>
                         );
                      }

                      return (
                         <div key={i} className="p-5 rounded-xl border-2 border-border bg-background shadow-sm space-y-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black uppercase text-accent tracking-wider bg-accent/10 px-2 py-1 rounded">
                                Meta {currentPreviewNum}
                              </span>
                            </div>

                            <div className="grid md:grid-cols-[1fr_150px] gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Título da Missão</Label>
                                <Input value={m.atividade} onChange={(e) => handleEditPreviewMeta(i, 'atividade', e.target.value)} className="font-bold text-primary" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Prazo Final</Label>
                                <Input 
                                  type="date" 
                                  value={m.data_sugerida ? m.data_sugerida.split('T') : ''} 
                                  onChange={(e) => {
                                    const val = e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : "";
                                    handleEditPreviewMeta(i, 'data_sugerida', val);
                                  }} 
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-black text-muted-foreground">Orientações do Mentor</Label>
                              <textarea 
                                value={m.orientacoes} 
                                onChange={(e) => handleEditPreviewMeta(i, 'orientacoes', e.target.value)} 
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                              />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mt-2 p-3 bg-muted/10 rounded-lg border border-dashed border-border">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Link (Opcional)</Label>
                                <Input placeholder="https://..." value={m.link || ""} onChange={(e) => handleEditPreviewMeta(i, 'link', e.target.value)} className="h-9 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Anexo (Opcional)</Label>
                                <div className="relative w-full">
                                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    handleEditPreviewMeta(i, 'arquivo_file', file);
                                  }} />
                                  <div className={`h-9 border rounded-md flex items-center px-3 text-xs ${m.arquivo_file || m.arquivo_url ? 'bg-success/10 border-success/30 text-success font-bold' : 'bg-background border-input text-muted-foreground'}`}>
                                    <UploadCloud className="h-4 w-4 mr-2"/>
                                    <span className="truncate">{m.arquivo_file ? m.arquivo_file.name : (m.arquivo_nome || "Anexar PDF")}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                         </div>
                      );
                   });
                })()}
             </div>
             
             <div className="p-6 border-t bg-background flex gap-4">
               <Button variant="outline" className="flex-1 h-12" onClick={() => setShowPreviewModal(false)} disabled={isApplyingRota}>Cancelar</Button>
               <Button variant="accent" className="flex-1 h-12 text-lg" onClick={confirmarRotaAdaptativa} disabled={isApplyingRota}>
                 <Wand2 className={`h-5 w-5 mr-2 ${isApplyingRota ? 'animate-spin' : ''}`} /> 
                 {isApplyingRota ? "Processando e Enviando Arquivos..." : "Gravar Rota no Perfil"}
               </Button>
             </div>
          </div>
        </div>
      )}

      {/* --- NOVO MODAL: ESCUDO DE CONFIRMAÇÃO SEGURO CONTRA BLOQUEIOS --- */}
      {modalConfirmacao.isOpen && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-display font-bold text-primary mb-2">{modalConfirmacao.titulo}</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {modalConfirmacao.mensagem}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setModalConfirmacao({ ...modalConfirmacao, isOpen: false })}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 font-bold" 
                onClick={modalConfirmacao.acao}
              >
                Sim, Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AlunosCRM;