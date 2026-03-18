// src/pages/Aluno.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, CheckCircle2, BookOpen, Clock, Target, 
  PenTool, Timer, Briefcase, Lock, FastForward,
  MessageSquare, Mic, Trash2, X, AlertTriangle, Play, AlertCircle,
  Link as LinkIcon, FileText 
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  doc, onSnapshot, updateDoc, collection, 
  query, where, addDoc, deleteDoc, serverTimestamp, getDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner"; 

const Aluno = () => {
  const navigate = useNavigate();
  const [perfilAluno, setPerfilAluno] = useState<any>(null);
  const [metas, setMetas] = useState<any[]>([]);
  const [cadernos, setCadernos] = useState<any[]>([]);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [laboratorio, setLaboratorio] = useState<any[]>([]); 
  const [historico, setHistorico] = useState<any[]>([]);
  const [progresso, setProgresso] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Feedback
  const [feedbackSelecionado, setFeedbackSelecionado] = useState<any>(null);

  // Estados do Cronômetro de Simulado
  const [modalPreparacao, setModalPreparacao] = useState<any>(null);
  const [simuladoAtivo, setSimuladoAtivo] = useState<any>(null);
  const [tempoRestante, setTempoRestante] = useState(18000);

  // ESTADOS DO MOTOR DE CICLOS (BARREIRA TEMPORAL)
  const [isExpirado, setIsExpirado] = useState(false);
  const [dataCorteVisual, setDataCorteVisual] = useState("");

  useEffect(() => {
    const verificarCiclo = async () => {
      try {
        const docRef = doc(db, "configuracoes", "ciclo_atual");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dataExp = docSnap.data().data_expiracao;
          if (dataExp) {
            const [ano, mes, dia] = dataExp.split('-');
            setDataCorteVisual(`${dia}/${mes}/${ano}`);

            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const corte = new Date(dataExp + "T00:00:00");

            if (hoje > corte) {
              setIsExpirado(true);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao ler o relógio do sistema", error);
      }
    };
    verificarCiclo();
  }, []);

  useEffect(() => {
    let intervalo: any;
    if (simuladoAtivo && tempoRestante > 0) {
      intervalo = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (simuladoAtivo && tempoRestante === 0) {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
      audio.play().catch(e => console.log("O navegador bloqueou o áudio automático."));
      toast.error("TEMPO ESGOTADO! Canetas pousadas.", { duration: 10000 });
      setSimuladoAtivo(null);
    }
    return () => clearInterval(intervalo);
  }, [simuladoAtivo, tempoRestante]);

  const formatarTempo = (segundosTotais: number) => {
    const h = Math.floor(segundosTotais / 3600);
    const m = Math.floor((segundosTotais % 3600) / 60);
    const s = segundosTotais % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const iniciarSimulado = () => {
    setSimuladoAtivo(modalPreparacao);
    setTempoRestante(18000);
    setModalPreparacao(null);
    window.open(modalPreparacao.url_pdf || modalPreparacao.url || modalPreparacao.link, "_blank");
    toast.success("Cronômetro de 5 horas iniciado. Boa prova!");
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubDoc = onSnapshot(doc(db, "alunos", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            data.uid = user.uid;
            setPerfilAluno(data);
            setMetas(data.metas || []);
            
            if (data.metas && data.metas.length > 0) {
               const concluidas = data.metas.filter((m:any) => m.status === "concluida" || m.concluida === true).length;
               setProgresso(Math.round((concluidas / data.metas.length) * 100));
            } else {
               setProgresso(0);
            }
          }
          setLoading(false);
        });
        carregarHistorico(user.uid);
        return () => unsubDoc();
      } else {
        navigate("/");
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    const materiaAluno = perfilAluno?.materia || perfilAluno?.curso;
    if (!materiaAluno) return;

    const qMateriais = query(collection(db, "materiais_publicados"), where("materia", "==", materiaAluno));
    const unsubMateriais = onSnapshot(qMateriais, (snap) => {
      let docs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = a.data_publicacao?.toMillis ? a.data_publicacao.toMillis() : 0;
        const timeB = b.data_publicacao?.toMillis ? b.data_publicacao.toMillis() : 0;
        return timeB - timeA;
      });
      setCadernos(docs.filter((d: any) => d.tipo === "Caderno"));
      setSimulados(docs.filter((d: any) => d.tipo === "Simulado"));
    });

    const unsubLab = onSnapshot(doc(db, "disciplinas", materiaAluno), (docSnap) => {
      if (docSnap.exists()) {
        const dadosDisciplina = docSnap.data();
        setLaboratorio(dadosDisciplina.pecas || []); 
      } else {
        setLaboratorio([]);
      }
    });

    return () => { unsubMateriais(); unsubLab(); };
  }, [perfilAluno?.materia, perfilAluno?.curso]);

  const carregarHistorico = async (uid: string) => {
    const q = query(collection(db, "historico_pecas"), where("aluno_id", "==", uid));
    onSnapshot(q, (snap) => {
      const hist: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorico(hist.sort((a, b) => {
        const timeA = a.data_envio?.toMillis ? a.data_envio.toMillis() : 0;
        const timeB = b.data_envio?.toMillis ? b.data_envio.toMillis() : 0;
        return timeB - timeA;
      }));
    });
  };

  const handleUploadPeca = async () => {
    if (historico.length >= 5) {
      toast.error("Limite atingido. Você já enviou suas 5 peças.");
      return;
    }

    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file || !perfilAluno) {
      toast.error("Selecione um arquivo primeiro.");
      return;
    }
    setUploading(true);
    try {
      const storageRef = ref(storage, `pecas_alunos/${perfilAluno.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, "historico_pecas"), {
        aluno_id: perfilAluno.uid,
        aluno_nome: perfilAluno.nome || "Aluno",
        nome_documento: file.name,
        url_documento: downloadURL,
        status: "Pendente",
        data_envio: serverTimestamp()
      });
      toast.success("Peça enviada para correção!");
      fileInput.value = "";
    } catch (error) { toast.error("Erro no upload."); } 
    finally { setUploading(false); }
  };

  const handleExcluirPeca = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este envio? Você poderá reenviar uma nova versão.")) return;
    try {
      await deleteDoc(doc(db, "historico_pecas", id));
      toast.success("Envio apagado com sucesso.");
    } catch (error) { toast.error("Erro ao apagar a peça."); }
  };

  const handleStatusMeta = async (index: number, novoStatus: string) => {
    if (!perfilAluno) return;
    let novasMetas = [...metas];
    novasMetas[index].status = novoStatus;
    novasMetas[index].concluida = (novoStatus === "concluida"); 
    setMetas(novasMetas);
    await updateDoc(doc(db, "alunos", perfilAluno.uid), { metas: novasMetas });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleSolicitarRepescagem = () => {
    toast.success("Solicitação enviada ao seu mentor! A nossa equipa entrará em contacto em breve.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-display text-primary italic">Carregando Dossiê...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-body relative pb-24">
      <header className="bg-primary border-b-4 border-accent py-4 sticky top-0 z-40">
        <div className="container flex justify-between items-center">
          <h1 className="text-primary-foreground text-2xl font-display font-bold italic">SUA<span className="text-accent italic">OAB</span></h1>
          <button onClick={handleLogout} className="text-destructive font-bold flex items-center gap-2"><LogOut className="h-5 w-5" /> Sair</button>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-display font-bold text-primary italic">Portal do Aluno</h2>
            <p className="text-muted-foreground">Logado como: <span className="font-bold">{perfilAluno?.nome || perfilAluno?.email}</span> | Matrícula: {perfilAluno?.matricula || "S/N"}</p>
          </div>
          {(perfilAluno?.materia || perfilAluno?.curso) && (
            <span className="bg-accent/20 text-accent font-bold px-4 py-1.5 rounded-full text-sm uppercase tracking-wider border border-accent/30">
              {perfilAluno?.materia || perfilAluno?.curso}
            </span>
          )}
        </div>

        {isExpirado ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-destructive/10 p-6 rounded-full mb-6 border-4 border-destructive/20">
              <Lock className="h-16 w-16 text-destructive" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary italic mb-3">Ciclo Encerrado</h2>
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              O ciclo de estudos para o Exame atual foi oficialmente encerrado no dia <span className="font-bold text-foreground">{dataCorteVisual}</span>. 
              Esperamos que tenha feito uma excelente prova e conquistado a sua aprovação!
            </p>
            
            <div className="bg-card p-8 border border-border shadow-elevated rounded-2xl max-w-md w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
              <h3 className="font-bold text-xl mb-3 flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" /> Precisa de Repescagem?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Caso tenha havido algum imprevisto e necessite continuar os estudos para o próximo exame, 
                você tem direito à nossa garantia de atualização de ciclo.
              </p>
              <Button variant="hero" size="lg" className="w-full h-14 text-base" onClick={handleSolicitarRepescagem}>
                Quero ativar a minha Repescagem
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-bold text-primary italic">Meu Progresso</h3>
                  <span className="text-2xl font-bold text-primary">{progresso}%</span>
                </div>
                <Progress value={progresso} className="h-3" />
              </div>

              <Tabs defaultValue="metas" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="metas">Cronograma</TabsTrigger>
                  <TabsTrigger value="laboratorio">Laboratório</TabsTrigger>
                  <TabsTrigger value="cadernos">Discursivas</TabsTrigger>
                  <TabsTrigger value="simulados">Simulados</TabsTrigger>
                </TabsList>

                <TabsContent value="metas" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Minhas Metas</h3>
                  <div className="space-y-4">

                    <div className={`flex flex-col sm:flex-row justify-between gap-4 p-5 rounded-xl border-2 transition-all ${perfilAluno?.metaZeroConcluida ? "border-border bg-background shadow-sm" : "border-accent shadow-sm bg-accent/5"}`}>
                      <div className="flex gap-4 items-start flex-1">
                        <input 
                          type="checkbox" 
                          className="h-5 w-5 accent-success mt-1 shrink-0 cursor-pointer" 
                          checked={!!perfilAluno?.metaZeroConcluida} 
                          onChange={async (e) => {
                            const isChecked = e.target.checked;
                            setPerfilAluno({...perfilAluno, metaZeroConcluida: isChecked});
                            await updateDoc(doc(db, "alunos", perfilAluno.uid), { metaZeroConcluida: isChecked });
                          }} 
                        />
                        <div className="flex-1">
                          {!perfilAluno?.metaZeroConcluida && (
                            <span className="bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                              Comece por aqui
                            </span>
                          )}
                          <h4 className={`font-bold text-lg flex items-center gap-2 ${perfilAluno?.metaZeroConcluida ? "line-through opacity-50 text-muted-foreground" : "text-primary"}`}>
                            Meta 0: Boas-Vindas e Ambientação
                          </h4>
                          <p className={`text-sm mt-1 leading-relaxed ${perfilAluno?.metaZeroConcluida ? "opacity-50" : "text-muted-foreground"}`}>
                            Parabéns por chegar à 2ª Fase! Você está a um passo da sua aprovação e fez a escolha certa ao procurar uma mentoria direcionada. Hoje, o seu único objetivo é respirar fundo, preparar o seu ambiente de estudos e assistir à aula inaugural na Sala de Aula Virtual.
                          </p>
                          {!perfilAluno?.metaZeroConcluida && (
                            <Button variant="hero" size="sm" className="mt-3 font-bold" asChild>
                              <Link to="/aula">Assistir Aula Inaugural</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* LÓGICA DO CONTADOR CORRIGIDA AQUI */}
                    {metas.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">Nenhuma meta adicional definida pelo professor.</p>
                    ) : (
                      (() => {
                        let metaCounter = 1; // Contador visual independente
                        return metas.map((m, i) => {
                          if (m.atividade?.includes("Boas-Vindas")) return null;

                          const currentMetaNum = metaCounter++;
                          const isBloqueada = m.status === "bloqueada";
                          const isPulada = m.status === "pulada";
                          const isConcluida = m.status === "concluida" || m.concluida;

                          if (isBloqueada) {
                            return (
                               <div key={i} className="flex gap-4 p-4 rounded-lg border border-dashed border-border bg-muted/20 opacity-50">
                                 <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                                 <div><h4 className="font-bold text-muted-foreground">Meta {currentMetaNum}: Bloqueada</h4><p className="text-xs text-muted-foreground">Aguarde a liberação do seu mentor para aceder a esta etapa.</p></div>
                               </div>
                            )
                          }

                          return (
                            <div key={i} className={`flex flex-col sm:flex-row justify-between gap-4 p-5 rounded-xl border-2 transition-all ${isPulada ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-background shadow-sm"}`}>
                              <div className="flex gap-4 items-start flex-1">
                                <input type="checkbox" className="h-5 w-5 accent-success mt-1 shrink-0 cursor-pointer" checked={isConcluida} onChange={(e) => handleStatusMeta(i, e.target.checked ? "concluida" : "liberada")} />
                                <div className="flex-1">
                                  <h4 className={`font-bold text-lg flex items-center gap-2 ${isConcluida ? "line-through opacity-50 text-muted-foreground" : "text-primary"} ${isPulada ? "text-yellow-600" : ""}`}>
                                    Meta {currentMetaNum}: {m.atividade}
                                  </h4>
                                  <p className={`text-sm mt-1 leading-relaxed ${isConcluida ? "opacity-50" : "text-muted-foreground"}`}>{m.orientacoes}</p>
                                  
                                  {(m.link || m.arquivo_url) && !isConcluida && (
                                    <div className="flex flex-wrap gap-3 mt-4">
                                      {m.link && (
                                        <Button variant="outline" size="sm" className="font-bold text-accent border-accent/30 hover:bg-accent/10" asChild>
                                          <a href={m.link} target="_blank" rel="noreferrer"><LinkIcon className="h-4 w-4 mr-2" /> Acessar Link</a>
                                        </Button>
                                      )}
                                      {m.arquivo_url && (
                                        <Button variant="outline" size="sm" className="font-bold text-success border-success/30 hover:bg-success/10" asChild>
                                          <a href={m.arquivo_url} target="_blank" rel="noreferrer"><FileText className="h-4 w-4 mr-2" /> {m.arquivo_nome || "Baixar Anexo"}</a>
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isConcluida && (
                                <div className="shrink-0 flex items-center mt-4 sm:mt-0">
                                  {isPulada ? (
                                    <Button size="sm" variant="default" className="w-full sm:w-auto font-bold" onClick={() => handleStatusMeta(i, "liberada")}>Retomar Meta</Button>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="w-full sm:w-auto text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10 font-bold" onClick={() => handleStatusMeta(i, "pulada")}>
                                      <FastForward className="h-4 w-4 mr-2" /> Pular
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="laboratorio" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Briefcase className="h-5 w-5 text-accent" /> Laboratório de Peças</h3>
                  <div className="grid gap-3">
                    {laboratorio.length === 0 ? <p className="text-sm italic text-muted-foreground">Nenhuma peça cadastrada na disciplina.</p> : laboratorio.map((l, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-border bg-background flex justify-between items-center transition-colors">
                        <div><span className="font-bold text-sm block text-primary">{l.nome || "Peça sem nome"}</span><span className="text-[10px] text-muted-foreground uppercase">Material Prático</span></div>
                        <Button variant="outline" size="sm" onClick={() => window.open(l.url_pdf || "#", "_blank")}>Abrir Peça</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="cadernos" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><PenTool className="h-5 w-5 text-accent" /> Cadernos de Discursivas</h3>
                  <div className="grid gap-3">
                    {cadernos.length === 0 ? <p className="text-sm italic text-muted-foreground">Nenhum caderno publicado para a sua matéria.</p> : cadernos.map((c: any) => (
                      <div key={c.id} className="p-4 rounded-lg border border-border bg-background flex justify-between items-center transition-colors">
                        <div><span className="font-bold text-sm block text-primary">{c.titulo}</span>{c.data_publicacao && typeof c.data_publicacao.toDate === 'function' && <span className="text-[10px] text-muted-foreground">Publicado em: {c.data_publicacao.toDate().toLocaleDateString('pt-BR')}</span>}</div>
                        <Button variant="outline" size="sm" onClick={() => window.open(c.url_pdf, "_blank")}>Abrir Caderno</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="simulados" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Timer className="h-5 w-5 text-accent" /> Área de Simulados</h3>
                  <div className="grid gap-3">
                    {simulados.length === 0 ? <p className="text-sm italic text-muted-foreground">Nenhum simulado publicado para a sua matéria.</p> : simulados.map((s: any) => (
                      <div key={s.id} className="p-4 rounded-lg border border-border bg-background flex justify-between items-center transition-colors">
                        <div><span className="font-bold text-sm block text-primary">{s.titulo}</span>{s.data_publicacao && typeof s.data_publicacao.toDate === 'function' && <span className="text-[10px] text-muted-foreground">Publicado em: {s.data_publicacao.toDate().toLocaleDateString('pt-BR')}</span>}</div>
                        <Button variant="accent" size="sm" onClick={() => setModalPreparacao(s)}>Acessar Simulado</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-8">
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-bold text-primary mb-4 italic">Videoaulas</h3>
                <Button asChild className="w-full h-12" variant="hero"><Link to="/aula">▶ Acessar Sala</Link></Button>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-dashed border-accent/50 bg-accent/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-primary italic">Upload de Peça</h3>
                </div>
                <input type="file" id="fileUpload" className="block w-full text-xs mb-4 cursor-pointer" disabled={historico.length >= 5} />
                <Button className="w-full" onClick={handleUploadPeca} disabled={uploading || historico.length >= 5}>
                  {uploading ? "Aguarde..." : historico.length >= 5 ? "Limite Atingido" : "Submeter Peça"}
                </Button>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-primary italic">Histórico de Envios</h3>
                  <span className="text-xs font-bold bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/30">
                    {historico.length} de 5 peças
                  </span>
                </div>
                <div className="space-y-4">
                  {historico.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma peça submetida.</p> : historico.map((h, i) => (
                    <div key={i} className="border-b pb-4 border-border last:border-0 last:pb-0">
                      <div className="text-[11px] flex justify-between items-center mb-2">
                        <span className="font-bold truncate max-w-[120px]" title={h.nome_documento}>{h.nome_documento}</span>
                        <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase ${h.status === "Corrigido" ? "bg-success/20 text-success" : "bg-accent/20 text-accent"}`}>
                          {h.status || "Pendente"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {h.status === "Corrigido" && h.observacao_professor && (
                          <>
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 border-accent/30 text-accent hover:bg-accent/10" onClick={() => setFeedbackSelecionado(h)}>
                              <MessageSquare className="h-3 w-3 mr-1" /> Feedback
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 opacity-50 cursor-not-allowed" title="Em breve: Áudio do Mentor">
                              <Mic className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        
                        {h.status !== "Corrigido" && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:bg-destructive/10" onClick={() => handleExcluirPeca(h.id)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Apagar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {modalPreparacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-8 relative">
            <button onClick={() => setModalPreparacao(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="bg-accent/20 p-4 rounded-full">
                <AlertTriangle className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-primary italic">Modo Simulado Real</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nós do <strong className="text-primary">SUAOAB</strong> buscamos sempre o melhor preparo dos nossos alunos. 
                A chave para a aprovação na 2ª Fase não é apenas o conhecimento, mas a gestão rigorosa do tempo e o controle emocional.
              </p>
              <div className="bg-muted/30 p-4 rounded-lg text-sm text-left w-full border border-border">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Isole-se num ambiente silencioso.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Separe água e o seu Vade Mecum físico.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Sem telemóvel ou consultas à internet.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> O tempo limite é cravado em 5 horas.</li>
                </ul>
              </div>
            </div>
            <Button variant="hero" className="w-full h-14 text-lg font-bold" onClick={iniciarSimulado}>
              <Play className="mr-2 h-5 w-5" /> Estou Pronto. Iniciar (5h)
            </Button>
          </div>
        </div>
      )}

      {simuladoAtivo && (
        <div className="fixed bottom-6 right-6 bg-card border-2 border-accent shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-5 rounded-2xl z-50 flex flex-col items-center w-64 animate-in slide-in-from-bottom-8">
          <h4 className="text-primary font-bold text-sm mb-1 text-center truncate w-full">{simuladoAtivo.titulo}</h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Tempo Restante</p>
          
          <div className={`text-4xl font-display font-black tabular-nums tracking-tight ${tempoRestante < 1800 ? 'text-destructive animate-pulse' : 'text-accent'}`}>
            {formatarTempo(tempoRestante)}
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setSimuladoAtivo(null)} className="mt-4 w-full text-xs font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
            Encerrar Antecipadamente
          </Button>
        </div>
      )}

      {feedbackSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setFeedbackSelecionado(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-success/20 text-success p-2 rounded-full">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary leading-tight">Avaliação do Mentor</h3>
                <p className="text-xs text-muted-foreground">Peça: {feedbackSelecionado.nome_documento}</p>
              </div>
            </div>
            <div className="bg-muted/20 border border-border p-4 rounded-xl">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{feedbackSelecionado.observacao_professor}</p>
            </div>
            <Button className="w-full mt-6" variant="hero" onClick={() => setFeedbackSelecionado(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aluno;