// src/pages/Aluno.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Clock, PenTool, Timer, Briefcase, Lock, AlertCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDoc } from "firebase/firestore";
import { toast } from "sonner"; 

import { GestorMetas } from "@/components/aluno/GestorMetas";
import { TelaBloqueio, BannerDegustacao } from "@/components/aluno/TelasDegustacao";
import { GestorPecas } from "@/components/aluno/GestorPecas";
import { GestorSimulados } from "@/components/aluno/GestorSimulados";

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
  
  const [modalPreparacao, setModalPreparacao] = useState<any>(null);
  const [isExpirado, setIsExpirado] = useState(false);
  const [dataCorteVisual, setDataCorteVisual] = useState("");

  useEffect(() => {
    const verificarCiclo = async () => {
      try {
        const docSnap = await getDoc(doc(db, "configuracoes", "ciclo_atual"));
        if (docSnap.exists() && docSnap.data().data_expiracao) {
          const dataExp = docSnap.data().data_expiracao;
          const [ano, mes, dia] = dataExp.split('-');
          setDataCorteVisual(`${dia}/${mes}/${ano}`);
          const hoje = new Date();
          hoje.setHours(0,0,0,0);
          if (hoje > new Date(dataExp + "T00:00:00")) setIsExpirado(true);
        }
      } catch (error) { console.error(error); }
    };
    verificarCiclo();
  }, []);

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
            } else setProgresso(0);
          }
          setLoading(false);
        });
        
        const qHist = query(collection(db, "historico_pecas"), where("aluno_id", "==", user.uid));
        onSnapshot(qHist, (snap) => {
          const hist: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHistorico(hist.sort((a, b) => (b.data_envio?.toMillis?.() || 0) - (a.data_envio?.toMillis?.() || 0)));
        });

        return () => unsubDoc();
      } else navigate("/");
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    let materiaAluno = perfilAluno?.materia || perfilAluno?.curso;
    if (!materiaAluno) return;

    // --- TRADUTOR DE SEGURANÇA PARA ALUNOS ANTIGOS ---
    if (materiaAluno === "DTRIB") materiaAluno = "DTRI";
    
    const qMateriais = query(collection(db, "materiais_publicados"), where("materia", "==", materiaAluno));
    const unsubMateriais = onSnapshot(qMateriais, (snap) => {
      let docs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.data_publicacao?.toMillis?.() || 0) - (a.data_publicacao?.toMillis?.() || 0));
      setCadernos(docs.filter((d: any) => d.tipo === "Caderno"));
      setSimulados(docs.filter((d: any) => d.tipo === "Simulado"));
    });

    const unsubLab = onSnapshot(doc(db, "disciplinas", materiaAluno), (docSnap) => {
      if (docSnap.exists()) setLaboratorio(docSnap.data().pecas || []); 
      else setLaboratorio([]);
    });

    return () => { unsubMateriais(); unsubLab(); };
  }, [perfilAluno?.materia, perfilAluno?.curso]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  let isDegustacaoExpirada = false;
  let tempoRestanteTexto = "";

  if (perfilAluno?.status === "Lead" || perfilAluno?.status === "inativo") {
    let dataCorte: Date;
    
    if (perfilAluno?.data_expiracao) {
      dataCorte = perfilAluno.data_expiracao.toDate ? perfilAluno.data_expiracao.toDate() : new Date(perfilAluno.data_expiracao);
    } else if (perfilAluno?.data_cadastro) {
      dataCorte = perfilAluno.data_cadastro.toDate ? perfilAluno.data_cadastro.toDate() : new Date(perfilAluno.data_cadastro);
      dataCorte.setHours(dataCorte.getHours() + 72); 
    } else {
      dataCorte = new Date();
    }

    const diffMs = dataCorte.getTime() - new Date().getTime();
    
    if (diffMs <= 0 || perfilAluno?.status === "inativo") {
      isDegustacaoExpirada = true;
    } else {
      const diffHoras = diffMs / (1000 * 60 * 60);
      const diasFaltando = Math.floor(diffHoras / 24);
      const horasRestantes = Math.floor(diffHoras % 24);
      if (diasFaltando > 0) tempoRestanteTexto = `${diasFaltando} ${diasFaltando === 1 ? 'dia' : 'dias'} e ${horasRestantes}h`;
      else tempoRestanteTexto = `${Math.floor(diffHoras)} horas`;
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-display text-primary italic">Carregando Dossiê...</div>;

  if (perfilAluno?.status === "inativo" || (perfilAluno?.status === "Lead" && isDegustacaoExpirada)) {
    return <TelaBloqueio perfilAluno={perfilAluno} handleLogout={handleLogout} />;
  }

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

        {perfilAluno?.status === "Lead" && !isDegustacaoExpirada && (
          <BannerDegustacao tempoRestanteTexto={tempoRestanteTexto} perfilAluno={perfilAluno} />
        )}

        {isExpirado ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-destructive/10 p-6 rounded-full mb-6 border-4 border-destructive/20"><Lock className="h-16 w-16 text-destructive" /></div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary italic mb-3">Ciclo Encerrado</h2>
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">O ciclo de estudos foi encerrado no dia <span className="font-bold text-foreground">{dataCorteVisual}</span>.</p>
            <div className="bg-card p-8 border border-border shadow-elevated rounded-2xl max-w-md w-full relative overflow-hidden">
              <h3 className="font-bold text-xl mb-3 flex items-center justify-center gap-2"><AlertCircle className="h-5 w-5 text-accent" /> Precisa de Repescagem?</h3>
              <Button variant="hero" size="lg" className="w-full h-14 text-base" onClick={() => toast.success("Solicitação enviada ao seu mentor!")}>Solicitar Repescagem</Button>
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
                  <GestorMetas perfilAluno={perfilAluno} setPerfilAluno={setPerfilAluno} metas={metas} setMetas={setMetas} />
                </TabsContent>

                <TabsContent value="laboratorio" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Briefcase className="h-5 w-5 text-accent" /> Laboratório</h3>
                  <div className="grid gap-3">
                    {laboratorio.map((l, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-border flex justify-between items-center">
                        <div><span className="font-bold text-sm block text-primary">{l.nome}</span></div>
                        <Button variant="outline" size="sm" onClick={() => window.open(l.url_pdf, "_blank")}>Abrir Peça</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="cadernos" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><PenTool className="h-5 w-5 text-accent" /> Discursivas</h3>
                  <div className="grid gap-3">
                    {cadernos.map((c: any) => (
                      <div key={c.id} className="p-4 rounded-lg border border-border flex justify-between items-center">
                        <div><span className="font-bold text-sm block text-primary">{c.titulo}</span></div>
                        <Button variant="outline" size="sm" onClick={() => window.open(c.url_pdf, "_blank")}>Abrir Caderno</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="simulados" className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Timer className="h-5 w-5 text-accent" /> Simulados</h3>
                  <div className="grid gap-3">
                    {simulados.map((s: any) => (
                      <div key={s.id} className="p-4 rounded-lg border border-border flex justify-between items-center">
                        <div><span className="font-bold text-sm block text-primary">{s.titulo}</span></div>
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
              <GestorPecas perfilAluno={perfilAluno} historico={historico} />
            </div>
          </div>
        )}
      </main>

      <GestorSimulados modalPreparacao={modalPreparacao} setModalPreparacao={setModalPreparacao} />
    </div>
  );
};

export default Aluno;