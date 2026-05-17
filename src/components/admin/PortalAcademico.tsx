import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  ArrowLeft,
  Download,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FileText,
  Presentation,
  ClipboardList,
  Star,
  Users,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { toast } from "sonner";
import { Disciplina, MaterialAcademico } from "@/lib/academico";

interface PortalAcademicoProps {
  setShowAuthModal?: (value: boolean) => void;
}

type MaterialComData = MaterialAcademico & {
  dataCriacaoFormatada: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const getIconByTipo = (tipo: string) => {
  switch (tipo) {
    case "slide":
      return <Presentation className="w-4 h-4" />;
    case "prova":
      return <ClipboardList className="w-4 h-4" />;
    case "resumo":
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getTituloTipo = (tipo: string) => {
  switch (tipo) {
    case "slide":
      return "Slide";
    case "prova":
      return "Prova";
    case "resumo":
      return "Resumo";
    default:
      return tipo;
  }
};

export const PortalAcademico = ({ setShowAuthModal }: PortalAcademicoProps) => {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [materiais, setMateriais] = useState<Map<string, MaterialComData[]>>(new Map());
  const [usuarioLogado, setUsuarioLogado] = useState<FirebaseUser | null>(null);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMateriais, setExpandedMateriais] = useState<Set<string>>(new Set());

  // --- MONITORA O ESTADO DE AUTENTICAÇÃO ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioLogado(user);
    });
    return unsubscribe;
  }, []);

  // --- BUSCA AS DISCIPLINAS DO FIRESTORE ---
  useEffect(() => {
    setLoading(true);
    try {
      const constraints: QueryConstraint[] = [where("status", "==", "ativa"), orderBy("nome")];
      const q = query(collection(db, "disciplinas"), ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const discs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Disciplina[];
        setDisciplinas(discs);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Erro ao buscar disciplinas:", error);
      toast.error("Erro ao carregar disciplinas");
      setLoading(false);
    }
  }, []);

  // --- BUSCA OS MATERIAIS PARA CADA DISCIPLINA ---
  useEffect(() => {
    if (disciplinas.length === 0) return;

    const novosMateriais = new Map<string, MaterialComData[]>();
    let unsubscribes: (() => void)[] = [];

    disciplinas.forEach((disc) => {
      const q = query(
        collection(db, "materiaisAcademicos"),
        where("disciplinaId", "==", disc.id),
        orderBy("dataCriacao", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const mats = snapshot.docs.map((doc) => {
          const data = doc.data();
          const date = data.dataCriacao instanceof Timestamp
            ? data.dataCriacao.toDate()
            : data.dataCriacao instanceof Date
            ? data.dataCriacao
            : new Date();

          return {
            id: doc.id,
            ...data,
            dataCriacaoFormatada: date.toLocaleDateString("pt-BR"),
          } as MaterialComData;
        });

        novosMateriais.set(disc.id, mats);
        setMateriais(new Map(novosMateriais));
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [disciplinas]);

  // --- LÓGICA DE ABERTURA DE MATERIAL ---
  const handleAbrirMaterial = (material: MaterialComData) => {
    if (!usuarioLogado) {
      setShowAuthModal?.(true);
      toast.info("Faça login para acessar o material");
      return;
    }

    if (material.isPremium && !usuarioLogado?.email) {
      setShowAuthModal?.(true);
      toast.info("Material exclusivo para mentorados");
      return;
    }

    if (material.conteudoTexto) {
      // TODO: Abrir visualizador de conteúdo/modal
      toast.success("Abrindo resumo...");
    } else if (material.urlDownload) {
      window.open(material.urlDownload, "_blank");
      toast.success("Download iniciado");
    }
  };

  // --- TOGGLE PARA EXPANDIR/RECOLHER MATERIAIS ---
  const toggleExpandMateriais = (materialId: string) => {
    const novo = new Set(expandedMateriais);
    if (novo.has(materialId)) {
      novo.delete(materialId);
    } else {
      novo.add(materialId);
    }
    setExpandedMateriais(novo);
  };

  // --- RENDERIZAR CARD DA DISCIPLINA ---
  const renderCartaoDisciplina = (disc: Disciplina) => {
    const isOutroProfessor = disc.isOutroProfessor;
    const maisAcademicos = materiais.get(disc.id) || [];
    const temConteudo = maisAcademicos.length > 0;

    return (
      <motion.div key={disc.id} variants={itemVariants}>
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            isOutroProfessor
              ? "border-gray-300 bg-muted/50 hover:border-gray-400"
              : "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/60"
          }`}
          onClick={() => setDisciplinaSelecionada(disc)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-2">{disc.nome}</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {disc.professor}
                  {isOutroProfessor && " (Outro professor)"}
                </CardDescription>
              </div>
              <Badge variant={isOutroProfessor ? "secondary" : "default"} className="shrink-0">
                {temConteudo ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {maisAcademicos.length}
                  </div>
                ) : (
                  "Em breve"
                )}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{disc.semestre}</span>
              <div className={`flex items-center gap-1 ${isOutroProfessor ? "text-gray-500" : "text-primary"}`}>
                <BookOpen className="w-4 h-4" />
                Ver mais
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // --- RENDERIZAR MODAL/DETALHE DA DISCIPLINA ---
  const renderDetalhesDisciplina = () => {
    if (!disciplinaSelecionada) return null;

    const maisAcademicos = materiais.get(disciplinaSelecionada.id) || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setDisciplinaSelecionada(null)}
      >
        <motion.div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER DO DETALHE */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{disciplinaSelecionada.nome}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Prof. {disciplinaSelecionada.professor}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisciplinaSelecionada(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* CONTEÚDO DO DETALHE */}
          <div className="p-6">
            {maisAcademicos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
                <p className="font-medium">Nenhum material disponível no momento</p>
                <p className="text-sm text-muted-foreground">
                  Em breve, mais conteúdos serão adicionados a esta disciplina.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Materiais Disponíveis</h3>
                {maisAcademicos.map((mat) => {
                  const isExpanded = expandedMateriais.has(mat.id);
                  return (
                    <motion.div
                      key={mat.id}
                      className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-transparent p-4 transition-all hover:shadow-md"
                      layout
                    >
                      <button
                        onClick={() => toggleExpandMateriais(mat.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {getIconByTipo(mat.tipo)}
                              <div>
                                <h4 className="font-semibold text-sm leading-tight">
                                  {mat.titulo}
                                </h4>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {mat.dataCriacaoFormatada}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {mat.isPremium && (
                              <Badge variant="outline" className="bg-amber-50">
                                <Star className="w-3 h-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {getTituloTipo(mat.tipo)}
                            </Badge>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 border-t pt-4"
                          >
                            {mat.conteudoTexto && (
                              <p className="text-sm leading-relaxed text-gray-700 line-clamp-3">
                                {mat.conteudoTexto}
                              </p>
                            )}
                            <div className="mt-4 flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAbrirMaterial(mat)}
                                className={
                                  mat.isPremium && !usuarioLogado
                                    ? "w-full bg-amber-600 hover:bg-amber-700"
                                    : "w-full"
                                }
                              >
                                {mat.isPremium && !usuarioLogado ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Acessar (Login necessário)
                                  </>
                                ) : (
                                  <>
                                    {mat.urlDownload ? (
                                      <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Visualizar
                                      </>
                                    )}
                                  </>
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // --- BANNER DE CROSS-SELLING ---
  const renderBannerMentoria = () => {
    return (
      <motion.div
        variants={itemVariants}
        className="col-span-full mt-8 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8"
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          {/* CONTEÚDO */}
          <div className="flex flex-col justify-center">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Próximo Passo
              </span>
            </div>
            <h3 className="text-3xl font-bold leading-tight">
              Mentoria Artesanal para a 2ª Fase da OAB
            </h3>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Você já tem o conhecimento. Agora precisa da prática cirúrgica. Nossas mentorias são
              artesanais: cada peça sua é corrigida com atenção personalizada, mostrando
              exatamente onde melhorar.
            </p>

            {/* DESTAQUES */}
            <div className="mt-6 space-y-2">
              {[
                "Correção de peças com devolutiva detalhada",
                "Cronograma adaptativo para sua rotina",
                "Comunicação direta com o mentor",
                "Dossiê de evolução em tempo real",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 w-5 h-5 flex-shrink-0 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2">
                <Users className="w-5 h-5" />
                Conheça a Mentoria
              </Button>
              <Button size="lg" variant="outline">
                Fale com o Mentor
              </Button>
            </div>
          </div>

          {/* IMAGEM/VISUAL */}
          <div className="hidden flex-col items-center justify-center md:flex">
            <div className="relative h-64 w-64 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-6 shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="mx-auto w-16 h-16 text-primary/40" />
                  <p className="mt-4 font-semibold text-primary/60">Artesanal & Personalizada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // --- RENDER PRINCIPAL ---
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5">
      {/* HEADER */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Portal da Graduação</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesse resumos, slides e materiais exclusivos das aulas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : disciplinas.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Nenhuma disciplina ativa no momento</h2>
            <p className="mt-2 text-muted-foreground">
              Em breve, disciplinas e materiais estarão disponíveis nesta plataforma.
            </p>
          </div>
        ) : (
          <>
            {/* GRID DE DISCIPLINAS */}
            <motion.div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {disciplinas.map((disc) => renderCartaoDisciplina(disc))}
            </motion.div>

            <Separator className="my-12" />

            {/* BANNER DE CROSS-SELLING */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              variants={containerVariants}
              viewport={{ once: true }}
            >
              {renderBannerMentoria()}
            </motion.div>
          </>
        )}
      </div>

      {/* DETALHE DA DISCIPLINA (OVERLAY) */}
      <AnimatePresence>{renderDetalhesDisciplina()}</AnimatePresence>
    </div>
  );
};
