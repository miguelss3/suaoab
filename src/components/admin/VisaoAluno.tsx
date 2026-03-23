// src/components/admin/VisaoAluno.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, setDoc, updateDoc } from "firebase/firestore";
import { Eye, BookOpen, Clock, Briefcase, PenTool, Timer, PlayCircle, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Importamos os mesmos componentes que o aluno real utiliza
import { GestorMetas } from "@/components/aluno/GestorMetas";
import { GestorPecas } from "@/components/aluno/GestorPecas";

const UID_SANDBOX = "admin_sandbox_uid";

interface PerfilAluno {
  uid: string;
  nome?: string;
  email?: string;
  materia?: string;
  status?: string;
  matricula?: string;
  metaZeroConcluida?: boolean;
  metas?: any[];
  [key: string]: any;
}

const VisaoAluno = () => {
  const [disciplinaAtiva, setDisciplinaAtiva] = useState("DADM");
  const [perfilFantasma, setPerfilFantasma] = useState<PerfilAluno | null>(null);
  
  // Estados para os conteúdos da disciplina
  const [metas, setMetas] = useState<any[]>([]);
  const [cadernos, setCadernos] = useState<any[]>([]);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [laboratorio, setLaboratorio] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal da Sala de Aula (Sandbox)
  const [aulaSandboxVisivel, setAulaSandboxVisivel] = useState(false);
  const [aulaAtiva, setAulaAtiva] = useState<any>(null);

  // 1. Inicializa ou Ouve o Perfil Fantasma no Firestore
  useEffect(() => {
    const docRef = doc(db, "alunos", UID_SANDBOX);
    
    const inicializarSandbox = async () => {
      try {
        await setDoc(docRef, {
          nome: "Modo Sandbox (Professor)",
          email: "sandbox@suaoab.com.br",
          materia: disciplinaAtiva,
          status: "premium",
          matricula: "000000",
          metaZeroConcluida: true,
          metas: []
        }, { merge: true });
      } catch (error) {
        console.error("Erro ao inicializar sandbox", error);
      }
    };

    inicializarSandbox();

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { uid: docSnap.id, ...docSnap.data() } as PerfilAluno;
        setPerfilFantasma(data);
        setMetas(data.metas || []);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [disciplinaAtiva]);

  // 2. Ouve os Materiais, Aulas e Histórico da Disciplina Selecionada
  useEffect(() => {
    if (!disciplinaAtiva) return;

    // Atualiza a matéria no perfil fantasma para garantir sincronia
    updateDoc(doc(db, "alunos", UID_SANDBOX), { materia: disciplinaAtiva }).catch(() => {});

    // Puxa Materiais
    const qMateriais = query(collection(db, "materiais_publicados"), where("materia", "==", disciplinaAtiva));
    const unsubMateriais = onSnapshot(qMateriais, (snap) => {
      let docs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.data_publicacao?.toMillis?.() || 0) - (a.data_publicacao?.toMillis?.() || 0));
      setCadernos(docs.filter((d: any) => d.tipo === "Caderno"));
      setSimulados(docs.filter((d: any) => d.tipo === "Simulado"));
    });

    // Puxa Laboratório de Peças
    const unsubLab = onSnapshot(doc(db, "disciplinas", disciplinaAtiva), (docSnap) => {
      if (docSnap.exists()) setLaboratorio(docSnap.data().pecas || []); 
      else setLaboratorio([]);
    });

    // Puxa Histórico de Envios
    const qHist = query(collection(db, "historico_pecas"), where("aluno_id", "==", UID_SANDBOX));
    const unsubHist = onSnapshot(qHist, (snap) => {
      const hist: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistorico(hist.sort((a, b) => (b.data_envio?.toMillis?.() || 0) - (a.data_envio?.toMillis?.() || 0)));
    });

    // Puxa as Videoaulas reais da disciplina
    const qAulas = query(collection(db, "aulas_globais"), where("materia", "==", disciplinaAtiva));
    const unsubAulas = onSnapshot(qAulas, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a: any, b: any) => (a.data_publicacao?.toMillis?.() || 0) - (b.data_publicacao?.toMillis?.() || 0));
      setAulas(lista);
      if (lista.length > 0) {
        setAulaAtiva((prev: any) => prev ? prev : lista);
      } else {
        setAulaAtiva(null);
      }
    });

    return () => { unsubMateriais(); unsubLab(); unsubHist(); unsubAulas(); };
  }, [disciplinaAtiva]);

  if (loading) return <div className="p-8 text-center text-muted-foreground font-bold">A carregar Ambiente Seguro...</div>;

  return (
    <div className="space-y-6">
      
      {/* SELETOR DE DISCIPLINA */}
      <div className="bg-accent/10 border-2 border-accent/20 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/20 rounded-full"><Eye className="h-6 w-6 text-accent" /></div>
          <div>
            <h3 className="font-bold text-accent text-lg leading-tight">Simulador de Visão do Aluno</h3>
            <p className="text-xs text-muted-foreground">Teste como o seu conteúdo aparece para os alunos em tempo real.</p>
          </div>
        </div>
        <div className="w-full md:w-64">
          <Label className="text-[10px] uppercase font-black text-muted-foreground mb-1 block">Escolher Disciplina de Teste</Label>
          <select 
            className="w-full h-10 border-2 border-accent/40 rounded-lg px-3 bg-background text-sm font-bold text-primary focus:ring-accent cursor-pointer" 
            value={disciplinaAtiva} 
            onChange={e => setDisciplinaAtiva(e.target.value)}
          >
            <option value="DADM">Direito Administrativo</option>
            <option value="DPEN">Direito Penal</option>
            <option value="DTRI">Direito Tributário</option>
          </select>
        </div>
      </div>

      {/* CLONE DO PORTAL DO ALUNO */}
      <div className="bg-background border border-border p-6 rounded-2xl shadow-inner">
        <div className="grid lg:grid-cols-3 gap-8 opacity-95">
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="metas" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="metas">Cronograma</TabsTrigger>
                <TabsTrigger value="laboratorio">Laboratório</TabsTrigger>
                <TabsTrigger value="cadernos">Discursivas</TabsTrigger>
                <TabsTrigger value="simulados">Simulados</TabsTrigger>
              </TabsList>

              <TabsContent value="metas" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Minhas Metas</h3>
                <GestorMetas perfilAluno={perfilFantasma} setPerfilAluno={setPerfilFantasma} metas={metas} setMetas={setMetas} />
              </TabsContent>

              <TabsContent value="laboratorio" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Briefcase className="h-5 w-5 text-accent" /> Laboratório</h3>
                <div className="grid gap-3">
                  {laboratorio.length === 0 && <p className="text-sm italic text-muted-foreground">Nenhuma peça cadastrada.</p>}
                  {laboratorio.map((l, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-border flex justify-between items-center bg-muted/5">
                      <span className="font-bold text-sm block text-primary">{l.nome}</span>
                      <Button variant="outline" size="sm" onClick={() => window.open(l.url_pdf, "_blank")}>Abrir Peça</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cadernos" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><PenTool className="h-5 w-5 text-accent" /> Discursivas</h3>
                <div className="grid gap-3">
                  {cadernos.length === 0 && <p className="text-sm italic text-muted-foreground">Nenhum caderno cadastrado.</p>}
                  {cadernos.map((c: any) => (
                    <div key={c.id} className="p-4 rounded-lg border border-border flex justify-between items-center bg-muted/5">
                      <span className="font-bold text-sm block text-primary">{c.titulo}</span>
                      <Button variant="outline" size="sm" onClick={() => window.open(c.url_pdf, "_blank")}>Abrir Caderno</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="simulados" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Timer className="h-5 w-5 text-accent" /> Simulados</h3>
                <div className="grid gap-3">
                  {simulados.length === 0 && <p className="text-sm italic text-muted-foreground">Nenhum simulado cadastrado.</p>}
                  {simulados.map((s: any) => (
                    <div key={s.id} className="p-4 rounded-lg border border-border flex justify-between items-center bg-muted/5">
                      <span className="font-bold text-sm block text-primary">{s.titulo}</span>
                      <Button variant="accent" size="sm" onClick={() => window.open(s.url_pdf, "_blank")}>Acessar Simulado</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-8">
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-primary italic flex items-center gap-2"><BookOpen className="h-5 w-5 text-accent"/> Videoaulas</h3>
                <span className="text-xs font-black bg-accent/10 text-accent px-2 py-1 rounded">{aulas.length} AULAS</span>
              </div>
              <Button 
                className="w-full h-12 font-bold" 
                variant="hero" 
                onClick={() => setAulaSandboxVisivel(true)} 
                disabled={aulas.length === 0}
              >
                {aulas.length === 0 ? "Nenhuma Aula Publicada" : "▶ Entrar na Sala de Aula"}
              </Button>
            </div>
            
            <GestorPecas perfilAluno={perfilFantasma} historico={historico} />
          </div>
        </div>
      </div>

      {/* MODAL SALA DE AULA (SANDBOX) */}
      {aulaSandboxVisivel && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-accent"/> Sala de Aula
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setAulaSandboxVisivel(false)} className="hover:bg-destructive/10 hover:text-destructive">
                <X className="h-5 w-5"/>
              </Button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Vídeo e Descrição */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
                {aulaAtiva ? (
                  <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
                    <div className="relative w-full aspect-video bg-black">
                      <iframe 
                        src={`https://www.youtube.com/embed/${aulaAtiva.youtubeId}?rel=0&modestbranding=1`} 
                        className="absolute top-0 left-0 w-full h-full border-0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="p-6">
                      <span className="bg-accent/20 text-accent font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-widest mb-3 inline-block">
                        {aulaAtiva.materia}
                      </span>
                      <h2 className="text-2xl font-bold text-primary mb-2">{aulaAtiva.titulo}</h2>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aulaAtiva.desc || "Sem descrição adicional."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-bold italic">
                    Nenhuma aula selecionada.
                  </div>
                )}
              </div>
              
              {/* Playlist Lateral */}
              <div className="w-full lg:w-80 border-l border-border bg-card flex flex-col shrink-0">
                <div className="p-4 font-bold border-b bg-muted/10 text-sm">Playlist da Disciplina</div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {aulas.map((aula, idx) => (
                    <button 
                      key={aula.id} 
                      onClick={() => setAulaAtiva(aula)} 
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${aulaAtiva?.id === aula.id ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-muted/10'}`}
                    >
                      <div className="text-[10px] uppercase font-black text-muted-foreground mb-1">
                        AULA {idx + 1}
                      </div>
                      <h4 className={`font-bold text-sm ${aulaAtiva?.id === aula.id ? 'text-primary' : 'text-muted-foreground'}`}>
                        {aula.titulo}
                      </h4>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default VisaoAluno;