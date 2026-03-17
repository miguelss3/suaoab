// src/pages/Aula.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, updateDoc, arrayUnion, arrayRemove, orderBy } from "firebase/firestore";
import { ChevronLeft, PlayCircle, CheckCircle2, LogOut, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Aula = () => {
  const navigate = useNavigate();
  const [aluno, setAluno] = useState<any>(null);
  const [aulas, setAulas] = useState<any[]>([]);
  const [aulaAtiva, setAulaAtiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Autenticação e Carregamento do Aluno
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubAluno = onSnapshot(doc(db, "alunos", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const dadosAluno: any = { id: docSnap.id, ...docSnap.data() };
            // Garante que o array existe
            if (!dadosAluno.aulas_assistidas) dadosAluno.aulas_assistidas = [];
            setAluno(dadosAluno);
          }
          setLoading(false);
        });
        return () => unsubAluno();
      } else {
        navigate("/");
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // 2. Carregamento da Playlist da Matéria do Aluno
  useEffect(() => {
    if (!aluno?.materia) return;

    const qAulas = query(
      collection(db, "aulas_globais"), 
      where("materia", "==", aluno.materia)
      // Nota: Se quiser ordenar, adicione orderBy("data_publicacao", "asc") e crie o índice no Firebase
    );

    const unsubAulas = onSnapshot(qAulas, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenação local por data caso não tenha o índice no Firestore
      lista.sort((a: any, b: any) => {
        const timeA = a.data_publicacao?.toMillis ? a.data_publicacao.toMillis() : 0;
        const timeB = b.data_publicacao?.toMillis ? b.data_publicacao.toMillis() : 0;
        return timeA - timeB; // Ordem cronológica (mais antigas primeiro)
      });
      
      setAulas(lista);
      if (lista.length > 0 && !aulaAtiva) {
        setAulaAtiva(lista[0]); // Carrega o primeiro vídeo automaticamente
      }
    });

    return () => unsubAulas();
  }, [aluno?.materia]);

  // 3. Função para Marcar/Desmarcar Aula (Não afeta o progresso geral)
  const toggleAulaAssistida = async (aulaId: string) => {
    if (!aluno) return;
    
    const jaAssistida = aluno.aulas_assistidas?.includes(aulaId);
    
    try {
      await updateDoc(doc(db, "alunos", aluno.id), {
        aulas_assistidas: jaAssistida ? arrayRemove(aulaId) : arrayUnion(aulaId)
      });
      
      if (!jaAssistida) {
        toast.success("Aula marcada como concluída!");
      }
    } catch (error) {
      toast.error("Erro ao atualizar o estado da aula.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-display text-primary italic">A carregar a Sala de Aula...</div>;

  const isAtivaAssistida = aulaAtiva ? aluno?.aulas_assistidas?.includes(aulaAtiva.id) : false;

  return (
    <div className="min-h-screen bg-background text-foreground font-body pb-24 flex flex-col">
      {/* CABEÇALHO */}
      <header className="bg-primary border-b-4 border-accent py-4 sticky top-0 z-40">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-primary-foreground text-2xl font-display font-bold italic hidden md:block">SUA<span className="text-accent italic">OAB</span></h1>
            <Button variant="outline" size="sm" asChild className="font-bold border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent">
              <Link to="/aluno"><ChevronLeft className="h-4 w-4 mr-1" /> Voltar ao Painel</Link>
            </Button>
          </div>
          <button onClick={handleLogout} className="text-destructive font-bold flex items-center gap-2"><LogOut className="h-5 w-5" /> Sair</button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DA SALA DE AULA */}
      <main className="container py-8 flex-1">
        <div className="grid lg:grid-cols-3 gap-8 h-full">
          
          {/* COLUNA ESQUERDA: PLAYER E INFORMAÇÕES (Ocupa 2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {aulaAtiva ? (
              <>
                <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden flex flex-col">
                  {/* Player de Vídeo Responsivo (16:9) */}
                  <div className="relative w-full aspect-video bg-black">
                    <iframe 
                      src={`https://www.youtube.com/embed/${aulaAtiva.youtubeId}?rel=0&modestbranding=1`} 
                      title={aulaAtiva.titulo}
                      className="absolute top-0 left-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                  
                  {/* Informações da Aula e Botão de Conclusão */}
                  <div className="p-6 md:p-8 bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <span className="bg-accent/20 text-accent font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-widest mb-3 inline-block">
                        {aulaAtiva.materia}
                      </span>
                      <h2 className="text-2xl font-display font-bold text-primary mb-2">{aulaAtiva.titulo}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">{aulaAtiva.desc || "Sem descrição adicional para esta aula."}</p>
                    </div>
                    
                    {/* BOTÃO DE CHECK (ISOLADO DO PROGRESSO GERAL) */}
                    <div className="shrink-0 w-full md:w-auto">
                      <Button 
                        onClick={() => toggleAulaAssistida(aulaAtiva.id)}
                        variant={isAtivaAssistida ? "outline" : "hero"}
                        className={`w-full h-12 font-bold text-sm ${isAtivaAssistida ? "border-success text-success hover:bg-success/10" : ""}`}
                      >
                        {isAtivaAssistida ? (
                          <><CheckCircle2 className="h-5 w-5 mr-2" /> Aula Concluída</>
                        ) : (
                          <><PlayCircle className="h-5 w-5 mr-2" /> Marcar como Vista</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-card rounded-xl border-2 border-dashed border-border p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <Play className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-xl font-bold text-primary mb-2">Sala de Aula Vazia</h3>
                <p className="text-muted-foreground">O professor ainda não publicou nenhuma videoaula para a sua disciplina de {aluno?.materia}.</p>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: PLAYLIST (Ocupa 1/3) */}
          <div className="bg-card rounded-xl shadow-sm border border-border flex flex-col h-[600px] lg:h-auto overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/10 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-primary italic flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-accent" />
                Conteúdo Programático
              </h3>
              <span className="text-xs font-black text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                {aulas.length} AULAS
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {aulas.length === 0 ? (
                <p className="text-sm italic text-muted-foreground text-center p-4">Nenhuma aula disponível.</p>
              ) : (
                aulas.map((aula, idx) => {
                  const isAssistida = aluno?.aulas_assistidas?.includes(aula.id);
                  const isAtiva = aulaAtiva?.id === aula.id;
                  
                  return (
                    <button 
                      key={aula.id}
                      onClick={() => setAulaAtiva(aula)}
                      className={`w-full text-left p-4 rounded-xl transition-all border-2 flex items-start gap-3 group
                        ${isAtiva 
                          ? 'border-accent bg-accent/5 shadow-sm' 
                          : 'border-transparent hover:border-border hover:bg-muted/5'
                        }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isAssistida ? (
                          <CheckCircle2 className={`h-5 w-5 ${isAtiva ? 'text-accent' : 'text-success'}`} />
                        ) : (
                          <PlayCircle className={`h-5 w-5 ${isAtiva ? 'text-accent' : 'text-muted-foreground opacity-50 group-hover:opacity-100'}`} />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">
                          AULA {idx + 1}
                        </div>
                        <h4 className={`font-bold text-sm leading-tight mb-1 ${isAssistida && !isAtiva ? 'text-muted-foreground' : 'text-primary'}`}>
                          {aula.titulo}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Vídeo</span>
                          {isAssistida && <span className="text-success uppercase">Vista</span>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Aula;