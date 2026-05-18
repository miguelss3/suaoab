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
  LogOut,
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
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import {
  collection,
  doc,
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

const normalizarTexto = (valor: string) => valor.trim().toLowerCase();

const obterChavesDisciplina = (disciplina: Disciplina) => {
  const chaves = new Set<string>();
  const nomeNormalizado = normalizarTexto(disciplina.nome);

  chaves.add(normalizarTexto(disciplina.id));
  chaves.add(nomeNormalizado);

  if (nomeNormalizado.includes("penal")) chaves.add("dpen");
  if (nomeNormalizado.includes("administrativo")) chaves.add("dadm");
  if (nomeNormalizado.includes("tribut")) chaves.add("dtri");

  return Array.from(chaves);
};

const materialPertenceADisciplina = (material: MaterialComData, disciplina: Disciplina) => {
  const chavesDisciplina = obterChavesDisciplina(disciplina);
  const camposMaterial = [
    (material as MaterialComData & { disciplinaNome?: string; disciplina?: string; materia?: string }).disciplinaId,
    (material as MaterialComData & { disciplinaNome?: string; disciplina?: string; materia?: string }).disciplinaNome,
    (material as MaterialComData & { disciplinaNome?: string; disciplina?: string; materia?: string }).disciplina,
    (material as MaterialComData & { disciplinaNome?: string; disciplina?: string; materia?: string }).materia,
  ]
    .filter((valor): valor is string => typeof valor === "string")
    .map(normalizarTexto);

  return camposMaterial.some((campo) => chavesDisciplina.includes(campo));
};

export const PortalAcademico = ({ setShowAuthModal }: PortalAcademicoProps) => {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [materiais, setMateriais] = useState<Map<string, MaterialComData[]>>(new Map());
  const [usuarioLogado, setUsuarioLogado] = useState<FirebaseUser | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [faseEstudoUsuario, setFaseEstudoUsuario] = useState("");
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null);
  const [materialLeituraSelecionado, setMaterialLeituraSelecionado] = useState<MaterialComData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMateriais, setExpandedMateriais] = useState<Set<string>>(new Set());

  const nomeExibicao =
    nomeUsuario.trim() || usuarioLogado?.displayName?.trim() || usuarioLogado?.email?.split("@")[0] || "Aluno";

  // --- MONITORA O ESTADO DE AUTENTICAÇÃO ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioLogado(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!usuarioLogado) {
      setNomeUsuario("");
      setFaseEstudoUsuario("");
      return;
    }

    const alunoRef = doc(db, "alunos", usuarioLogado.uid);
    const unsubscribe = onSnapshot(alunoRef, (snapshot) => {
      const data = snapshot.data();
      const fase = data?.faseEstudo;
      const nome = data?.nome;
      setNomeUsuario(typeof nome === "string" ? nome : "");
      setFaseEstudoUsuario(typeof fase === "string" ? fase : "");
    });

    return unsubscribe;
  }, [usuarioLogado]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUsuarioLogado(null);
      setNomeUsuario("");
      setFaseEstudoUsuario("");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Não foi possível sair no momento.");
    }
  };

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

    const q = query(collection(db, "materiaisAcademicos"), orderBy("dataCriacao", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const listaMateriais = snapshot.docs.map((doc) => {
          const data = doc.data();
          const date =
            data.dataCriacao instanceof Timestamp
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

        const novosMateriais = new Map<string, MaterialComData[]>();
        disciplinas.forEach((disc) => {
          novosMateriais.set(
            disc.id,
            listaMateriais.filter((material) => materialPertenceADisciplina(material, disc))
          );
        });

        setMateriais(novosMateriais);
      },
      (error) => {
        console.error("Erro ao carregar materiais:", error);
        toast.error("Erro ao carregar materiais");
      }
    );

    return unsubscribe;
  }, [disciplinas]);

  useEffect(() => {
    if (!materialLeituraSelecionado) return;

    const handleKeydown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey && (key === "c" || key === "p" || key === "u")) || key === "f12") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [materialLeituraSelecionado]);

  // --- LÓGICA DE ABERTURA DE MATERIAL ---
  const handleAbrirMaterial = (material: MaterialComData) => {
    if (material.isPremium && !usuarioLogado) {
      setShowAuthModal?.(true);
      toast.info("Faça login para acessar este material premium");
      return;
    }

    const temTexto = Boolean(material.conteudoTexto?.trim());
    const temAnexo = Boolean(material.urlDownload?.trim());
    const ehDownloadDireto =
      temAnexo && !temTexto && (material.tipo === "slide" || material.tipo === "prova");

    if (ehDownloadDireto && material.urlDownload) {
      toast.success("Baixando material...");
      window.open(material.urlDownload, "_blank");
      return;
    }

    if (temTexto) {
      setMaterialLeituraSelecionado(material);
      toast.success(temAnexo ? "Acessando material..." : "Abrindo resumo...");
    } else if (material.urlDownload) {
      toast.success("Baixando material...");
      window.open(material.urlDownload, "_blank");
    } else {
      toast.info("Este material ainda não possui conteúdo disponível.");
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
    const materiaisPreview = maisAcademicos.slice(0, 2);

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
                <CardTitle className="text-xl md:text-2xl font-bold leading-snug line-clamp-2 text-primary">
                  {disc.nome}
                </CardTitle>
                <CardDescription className="mt-2 text-sm md:text-base">
                  Prof. {disc.professor}
                  {isOutroProfessor && " (Outro professor)"}
                </CardDescription>
              </div>
              <Badge variant={isOutroProfessor ? "secondary" : "default"} className="shrink-0">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {temConteudo ? `${maisAcademicos.length} materiais` : "Ativa"}
                </div>
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm md:text-base">
                <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 font-semibold text-primary">
                  Semestre: {disc.semestre}
                </span>
                <div className={`flex items-center gap-1 ${isOutroProfessor ? "text-gray-500" : "text-primary"}`}>
                  <BookOpen className="w-4 h-4" />
                  Ver mais
                </div>
              </div>

              {temConteudo ? (
                <div className="rounded-lg border border-border bg-white/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Materiais recentes
                  </p>
                  <div className="space-y-2">
                    {materiaisPreview.map((material) => (
                      <div key={material.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{material.titulo}</p>
                          <p className="text-xs">{getTituloTipo(material.tipo)} • {material.dataCriacaoFormatada}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Disciplina ativa com materiais em atualização no portal.
                </div>
              )}
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
          className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-lg bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER DO DETALHE */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-8 py-6">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">{disciplinaSelecionada.nome}</h2>
              <p className="mt-2 text-base md:text-lg text-muted-foreground">
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
          <div className="px-8 py-7">
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
                <h3 className="font-semibold text-2xl">Materiais Disponíveis</h3>
                {maisAcademicos.map((mat) => {
                  const isExpanded = expandedMateriais.has(mat.id);
                  return (
                    <motion.div
                      key={mat.id}
                      className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-transparent p-5 transition-all hover:shadow-md"
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
                                <h4 className="font-semibold text-lg leading-tight">
                                  {mat.titulo}
                                </h4>
                                <p className="mt-1 text-sm text-muted-foreground">
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
                            <Badge variant="secondary" className="text-sm px-3 py-1">
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
                              <p className="text-base md:text-lg leading-relaxed text-gray-700 line-clamp-3">
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

  const renderModalLeitura = () => {
    if (!materialLeituraSelecionado) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        onClick={() => setMaterialLeituraSelecionado(null)}
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-8 py-5">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold leading-snug text-primary">
                {materialLeituraSelecionado.titulo}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {getTituloTipo(materialLeituraSelecionado.tipo)} • {materialLeituraSelecionado.dataCriacaoFormatada}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMaterialLeituraSelecionado(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[76vh] overflow-y-auto px-8 py-6">
            <div className="space-y-5">
              <div
                className="max-w-none whitespace-pre-wrap leading-relaxed text-gray-700 select-none text-lg md:text-xl"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
                {materialLeituraSelecionado.conteudoTexto}
              </div>

              {materialLeituraSelecionado.urlDownload && (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => window.open(materialLeituraSelecionado.urlDownload, "_blank")}
                >
                  <Download className="h-4 w-4" />
                  Baixar Arquivo
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // --- BANNER DE CROSS-SELLING ---
  const renderBannerMentoria = () => {
    const usuarioEhGraduacao =
      faseEstudoUsuario === "Estudante de Graduação" || faseEstudoUsuario === "graduacao";
    const meuWhatsApp = "5592994742322";
    const nomePrimeiro = nomeUsuario.trim().split(/\s+/)[0] || "aluno";
    const mensagemGraduacao = encodeURIComponent(
      `Olá Professor! Eu sou ${nomePrimeiro}, aluno da graduação, acabei de me cadastrar no portal e gostaria de validar meu desconto especial para a Mentoria da 2ª Fase`
    );
    const linkWhatsAppGraduacao = `https://wa.me/${meuWhatsApp}?text=${mensagemGraduacao}`;

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
                {usuarioEhGraduacao ? "⚠️ Condição Exclusiva para Alunos do Presencial" : "Próximo Passo"}
              </span>
            </div>
            <h3 className="text-3xl font-bold leading-tight">
              {usuarioEhGraduacao
                ? "⚠️ Condição Exclusiva para Alunos do Presencial"
                : "Mentoria Artesanal para a 2ª Fase da OAB"}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              {usuarioEhGraduacao
                ? "Professor Luiz Miguel liberou um lote de vagas na Mentoria da 2ª Fase com um Desconto Especial de Aluno da Graduação. Não espere o edital sair para blindar a sua aprovação de forma artesanal."
                : "Você já tem o conhecimento. Agora precisa da prática cirúrgica. Nossas mentorias são artesanais: cada peça sua é corrigida com atenção personalizada, mostrando exatamente onde melhorar."}
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
              {usuarioEhGraduacao ? (
                <Button asChild size="lg" className="gap-2">
                  <a href={linkWhatsAppGraduacao} target="_blank" rel="noreferrer">
                    <Users className="w-5 h-5" />
                    Garantir Meu Desconto de Aluno
                  </a>
                </Button>
              ) : (
                <Button size="lg" className="gap-2">
                  <Users className="w-5 h-5" />
                  Conheça a Mentoria
                </Button>
              )}
              <Button size="lg" variant="outline">
                Fale com o Mentor
              </Button>
            </div>
          </div>

          {/* IMAGEM/VISUAL */}
          <div className="hidden flex-col items-center justify-center md:flex">
            <div className="relative h-72 w-72 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-4 shadow-lg flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="https://raw.githubusercontent.com/miguelss3/suaoab/8a53302fe24efc4cc5b67e65927b2c7028614709/oab%20carteira.png"
                  alt="Carteira da OAB"
                  className="h-full w-full max-h-48 object-contain p-2"
                />
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
          <div className="flex items-center justify-between gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Portal da Graduação</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesse resumos, slides e materiais exclusivos das aulas
              </p>
            </div>

            <div className="flex items-center gap-3">
              {usuarioLogado ? (
                <>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-primary">Olá, {nomeExibicao}</p>
                    <p className="text-xs text-muted-foreground">Bem-vindo ao Portal</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2 text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowAuthModal?.(true)}
                  className="gap-2"
                >
                  Entrar / Cadastrar
                </Button>
              )}
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

      {/* MODAL DE LEITURA DO RESUMO */}
      <AnimatePresence>{renderModalLeitura()}</AnimatePresence>
    </div>
  );
};
