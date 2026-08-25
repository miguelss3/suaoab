// src/components/admin/VisaoAluno.tsx
// "Clone" do Portal do Aluno, embutido no Dossiê — mostra e permite editar,
// ao vivo, exatamente o que um aluno específico vê na própria conta (metas,
// laboratório, discursivas, simulados, videoaulas). Só existe embutido no
// Dossiê agora; a aba avulsa no menu principal foi removida por ser redundante.
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { BookOpen, Clock, Briefcase, PenTool, Timer, PlayCircle, X, Scale, Landmark, Gavel } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AulaGlobal, DisciplinaCodigo, getTimestampMillis, HistoricoPeca, MaterialPublicado, MetaAluno, PecaLaboratorio } from "@/lib/aulas";
import { compararPorOrdem } from "@/lib/utils";

// Importamos os mesmos componentes que o aluno real utiliza
import { GestorMetas } from "@/components/aluno/GestorMetas";
import { GestorPecas } from "@/components/aluno/GestorPecas";

interface PerfilAluno {
  uid: string;
  nome?: string;
  email?: string;
  materia?: DisciplinaCodigo;
  status?: string;
  matricula?: string;
  metaZeroConcluida?: boolean;
  metas?: MetaAluno[];
  [key: string]: unknown;
}

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

const mapDocToMaterial = (docSnap: { id: string; data: () => Record<string, unknown> }): MaterialPublicado => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    titulo: typeof data.titulo === "string" ? data.titulo : "",
    tipo: typeof data.tipo === "string" ? data.tipo : undefined,
    materia: typeof data.materia === "string" ? data.materia : undefined,
    url_pdf: typeof data.url_pdf === "string" ? data.url_pdf : undefined,
    data_publicacao:
      data.data_publicacao && typeof data.data_publicacao === "object"
        ? (data.data_publicacao as MaterialPublicado["data_publicacao"])
        : null,
  };
};

const mapDocToHistorico = (docSnap: { id: string; data: () => Record<string, unknown> }): HistoricoPeca => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    aluno_id: typeof data.aluno_id === "string" ? data.aluno_id : undefined,
    nome_documento: typeof data.nome_documento === "string" ? data.nome_documento : "",
    status: typeof data.status === "string" ? data.status : undefined,
    data_envio:
      data.data_envio && typeof data.data_envio === "object"
        ? (data.data_envio as HistoricoPeca["data_envio"])
        : null,
    url_audio_feedback: typeof data.url_audio_feedback === "string" ? data.url_audio_feedback : undefined,
    url_arquivo_corrigido: typeof data.url_arquivo_corrigido === "string" ? data.url_arquivo_corrigido : undefined,
    url_corrigida: typeof data.url_corrigida === "string" ? data.url_corrigida : undefined,
    observacao_professor: typeof data.observacao_professor === "string" ? data.observacao_professor : undefined,
  };
};

type Props = {
  aluno: { id: string; materia: string };
};

const VisaoAluno = ({ aluno }: Props) => {
  const disciplinaAtiva = aluno.materia as DisciplinaCodigo;
  const uidAlvo = aluno.id;

  const [perfilFantasma, setPerfilFantasma] = useState<PerfilAluno | null>(null);
  const [metas, setMetas] = useState<MetaAluno[]>([]);
  const [cadernos, setCadernos] = useState<MaterialPublicado[]>([]);
  const [simulados, setSimulados] = useState<MaterialPublicado[]>([]);
  const [laboratorio, setLaboratorio] = useState<PecaLaboratorio[]>([]);
  const [materialTeorico, setMaterialTeorico] = useState<PecaLaboratorio[]>([]);
  const [processualTeorico, setProcessualTeorico] = useState<PecaLaboratorio[]>([]);
  const [categoriaTeorico, setCategoriaTeorico] = useState<"material" | "processual">("material");
  const [historico, setHistorico] = useState<HistoricoPeca[]>([]);
  const [aulas, setAulas] = useState<AulaGlobal[]>([]);
  const [erroAulas, setErroAulas] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados do Modal da Sala de Aula
  const [aulaSandboxVisivel, setAulaSandboxVisivel] = useState(false);
  const [aulaAtiva, setAulaAtiva] = useState<AulaGlobal | null>(null);

  // Ouve o perfil e as metas reais deste aluno.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "alunos", uidAlvo), (docSnap) => {
      if (docSnap.exists()) {
        const data = { uid: docSnap.id, ...docSnap.data() } as PerfilAluno;
        setPerfilFantasma(data);
        setMetas(data.metas || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [uidAlvo]);

  // Ouve os Materiais, Aulas e Histórico da Disciplina do Aluno
  useEffect(() => {
    if (!disciplinaAtiva) return;

    // Puxa Materiais
    const qMateriais = query(collection(db, "materiais_publicados"), where("materia", "==", disciplinaAtiva));
    const unsubMateriais = onSnapshot(qMateriais, (snap) => {
      const docs = snap.docs.map(mapDocToMaterial);
      docs.sort((a, b) => compararPorOrdem(a, b, (x, y) => getTimestampMillis(y.data_publicacao) - getTimestampMillis(x.data_publicacao)));
      setCadernos(docs.filter((docItem) => docItem.tipo === "Caderno"));
      setSimulados(docs.filter((docItem) => docItem.tipo === "Simulado"));
    });

    // Puxa Laboratório de Peças e o acervo de Direito Material e Processual
    const unsubLab = onSnapshot(doc(db, "disciplinas", disciplinaAtiva), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLaboratorio(Array.isArray(data.pecas) ? (data.pecas as PecaLaboratorio[]) : []);
        setMaterialTeorico(Array.isArray(data.materialTeorico) ? (data.materialTeorico as PecaLaboratorio[]) : []);
        setProcessualTeorico(Array.isArray(data.processualTeorico) ? (data.processualTeorico as PecaLaboratorio[]) : []);
      } else {
        setLaboratorio([]);
        setMaterialTeorico([]);
        setProcessualTeorico([]);
      }
    });

    // Puxa Histórico de Envios
    const qHist = query(collection(db, "historico_pecas"), where("aluno_id", "==", uidAlvo));
    const unsubHist = onSnapshot(qHist, (snap) => {
      const hist = snap.docs.map(mapDocToHistorico);
      setHistorico(hist.sort((a, b) => getTimestampMillis(b.data_envio) - getTimestampMillis(a.data_envio)));
    });

    // Puxa as Videoaulas reais da disciplina
    const qAulas = query(collection(db, "aulas_globais"), where("materia", "==", disciplinaAtiva));
    const unsubAulas = onSnapshot(
      qAulas,
      (snap) => {
        setErroAulas("");
        const lista = snap.docs.map(mapDocToAula);
        lista.sort((a, b) => getTimestampMillis(a.data_publicacao) - getTimestampMillis(b.data_publicacao));
        setAulas(lista);
        setAulaAtiva((prev) => {
          if (lista.length === 0) return null;
          if (prev && lista.some((aula) => aula.id === prev.id)) return prev;
          return lista[0];
        });
      },
      (error) => {
        console.error("Erro ao carregar videoaulas na Visão do Aluno:", error);
        setErroAulas("Nao foi possivel carregar as videoaulas da disciplina agora.");
        setAulas([]);
        setAulaAtiva(null);
      }
    );

    return () => { unsubMateriais(); unsubLab(); unsubHist(); unsubAulas(); };
  }, [disciplinaAtiva, uidAlvo]);

  if (loading) return <div className="p-8 text-center text-muted-foreground font-bold">A carregar...</div>;

  return (
    <div className="space-y-6">
      {/* CLONE DO PORTAL DO ALUNO */}
      <div className="bg-background border border-border p-6 rounded-2xl shadow-inner">
        <div className="grid lg:grid-cols-3 gap-8 opacity-95">
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="metas" className="w-full">
              <TabsList className="flex flex-wrap w-full h-auto gap-2 mb-4">
                <TabsTrigger value="metas">Cronograma</TabsTrigger>
                <TabsTrigger value="materialProcessual">Direito Material e Processual</TabsTrigger>
                <TabsTrigger value="laboratorio">Laboratório</TabsTrigger>
                <TabsTrigger value="cadernos">Discursivas</TabsTrigger>
                <TabsTrigger value="simulados">Simulados</TabsTrigger>
              </TabsList>

              <TabsContent value="metas" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Minhas Metas</h3>
                <GestorMetas perfilAluno={perfilFantasma} setPerfilAluno={setPerfilFantasma} metas={metas} setMetas={setMetas} />
              </TabsContent>

              <TabsContent value="materialProcessual" className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-primary mb-4 italic flex items-center gap-2"><Scale className="h-5 w-5 text-accent" /> Direito Material e Processual</h3>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setCategoriaTeorico("material")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border-2 flex items-center gap-2 transition-colors ${
                      categoriaTeorico === "material" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Landmark className="h-4 w-4" /> Direito Material
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoriaTeorico("processual")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border-2 flex items-center gap-2 transition-colors ${
                      categoriaTeorico === "processual" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Gavel className="h-4 w-4" /> Direito Processual
                  </button>
                </div>
                <div className="grid gap-3">
                  {(categoriaTeorico === "material" ? materialTeorico : processualTeorico).length === 0 && (
                    <p className="text-sm italic text-muted-foreground">Nenhum conteúdo cadastrado.</p>
                  )}
                  {(categoriaTeorico === "material" ? materialTeorico : processualTeorico).map((item, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-border flex justify-between items-center bg-muted/5">
                      <span className="font-bold text-sm block text-primary">{item.nome}</span>
                      <Button variant="outline" size="sm" onClick={() => window.open(item.url_pdf, "_blank")}>Abrir Material</Button>
                    </div>
                  ))}
                </div>
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
                  {cadernos.map((c) => (
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
                  {simulados.map((s) => (
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
              {erroAulas && <p className="mt-3 text-sm text-destructive">{erroAulas}</p>}
            </div>

            <GestorPecas perfilAluno={perfilFantasma} historico={historico} />
          </div>
        </div>
      </div>

      {/* MODAL SALA DE AULA */}
      {aulaSandboxVisivel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm animate-in zoom-in-95">
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
