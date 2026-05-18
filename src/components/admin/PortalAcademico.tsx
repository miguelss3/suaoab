import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { downloadProtectedPDF } from "@/lib/pdfService";

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
  const [disciplinaUsuarioId, setDisciplinaUsuarioId] = useState("");
  const [materiaUsuario, setMateriaUsuario] = useState("");
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null);
  const [materialLeituraSelecionado, setMaterialLeituraSelecionado] = useState<MaterialComData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMateriais, setExpandedMateriais] = useState<Set<string>>(new Set());

  const nomeExibicao =
    nomeUsuario.trim() || usuarioLogado?.displayName?.trim() || usuarioLogado?.email?.split("@")[0] || "Aluno";

  const handleProtectedDownload = async (material: MaterialComData) => {
    if (!material.urlDownload) {
      toast.info("Este material ainda nao possui arquivo para download.");
      return;
    }

    try {
      await downloadProtectedPDF({
        originalPdfUrl: material.urlDownload,
        alunoNome: nomeExibicao,
        alunoCpfOuEmail: usuarioLogado?.email || usuarioLogado?.uid,
        fileName: material.titulo || "material-academico.pdf",
      });
      toast.success("Baixando material protegido...");
    } catch {
      toast.error("Nao foi possivel preparar o PDF protegido.");
    }
  };

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
      setDisciplinaUsuarioId("");
      setMateriaUsuario("");
      return;
    }

    const alunoRef = doc(db, "alunos", usuarioLogado.uid);
    const unsubscribe = onSnapshot(alunoRef, (snapshot) => {
      const data = snapshot.data();
      const fase = data?.faseEstudo;
      const nome = data?.nome;
      const disciplinaId = data?.disciplinaId;
      const materia = data?.materia;
      setNomeUsuario(typeof nome === "string" ? nome : "");
      setFaseEstudoUsuario(typeof fase === "string" ? fase : "");
      setDisciplinaUsuarioId(typeof disciplinaId === "string" ? disciplinaId : "");
      setMateriaUsuario(typeof materia === "string" ? materia : "");
    });

    return unsubscribe;
  }, [usuarioLogado]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUsuarioLogado(null);
      setNomeUsuario("");
      setFaseEstudoUsuario("");
      setDisciplinaUsuarioId("");
      setMateriaUsuario("");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Não foi possível sair no momento.");
    }
  };

  // --- BUSCA AS DISCIPLINAS DO FIRESTORE ---
  useEffect(() => {
    setLoading(true);
    try {
      const constraints: QueryConstraint[] = [orderBy("nome")];
      const q = query(collection(db, "disciplinas"), ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const discs = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((disciplina) => String((disciplina as Partial<Disciplina>).status ?? "").toLowerCase() === "ativa") as Disciplina[];
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
          const filtrados = listaMateriais
            .filter((material) => materialPertenceADisciplina(material, disc))
            .sort((a: any, b: any) => {
              // Ordena pelo campo `ordem` definido pelo professor no Painel Admin.
              // Itens sem `ordem` vão pro final (mantém ordem por data desc como fallback).
              const oa = typeof a.ordem === "number" ? a.ordem : Number.POSITIVE_INFINITY;
              const ob = typeof b.ordem === "number" ? b.ordem : Number.POSITIVE_INFINITY;
              return oa - ob;
            });
          novosMateriais.set(disc.id, filtrados);
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

  const usuarioEhGraduacao =
    faseEstudoUsuario === "Estudante de Graduação" || faseEstudoUsuario === "graduacao";

  const disciplinaGraduacaoVinculada = usuarioEhGraduacao
    ? disciplinas.find((disciplina) => {
        const materiaNormalizada = materiaUsuario.trim().toLowerCase();
        return (
          disciplina.id === disciplinaUsuarioId ||
          (materiaNormalizada.length > 0 && disciplina.nome.trim().toLowerCase() === materiaNormalizada)
        );
      }) ?? null
    : null;

  // --- LÓGICA DE ABERTURA DE MATERIAL ---
  const handleAbrirMaterial = async (material: MaterialComData) => {
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
      await handleProtectedDownload(material);
      return;
    }

    if (temTexto) {
      setMaterialLeituraSelecionado(material);
      toast.success(temAnexo ? "Acessando material..." : "Abrindo resumo...");
    } else if (material.urlDownload) {
      await handleProtectedDownload(material);
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
    const isBloqueada =
      Boolean(usuarioLogado) &&
      usuarioEhGraduacao &&
      (!disciplinaGraduacaoVinculada || disc.id !== disciplinaGraduacaoVinculada.id);

    const handleClickDisciplina = () => {
      if (isBloqueada) {
        toast.info("Esta disciplina está restrita para os alunos matriculados nesta turma neste semestre.");
        return;
      }

      setDisciplinaSelecionada(disc);
    };

    return (
      <motion.div key={disc.id} variants={itemVariants}>
        <Card
          className={`transition-all ${
            isBloqueada ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:shadow-lg"
          } ${
            isOutroProfessor
              ? isBloqueada
                ? "border-gray-300 bg-muted/50"
                : "border-gray-300 bg-muted/50 hover:border-gray-400"
              : isBloqueada
                ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
                : "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/60"
          }`}
          onClick={handleClickDisciplina}
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
              {isBloqueada ? (
                <Badge variant="secondary" className="shrink-0 border border-border bg-muted text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Outra Turma
                  </div>
                </Badge>
              ) : (
                <Badge variant={isOutroProfessor ? "secondary" : "default"} className="shrink-0">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {temConteudo ? `${maisAcademicos.length} materiais` : "Ativa"}
                  </div>
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm md:text-base">
                <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 font-semibold text-primary">
                  Semestre: {disc.semestre}
                </span>
                {isBloqueada ? (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Conteúdo Restrito
                  </div>
                ) : (
                  <div className={`flex items-center gap-1 ${isOutroProfessor ? "text-gray-500" : "text-primary"}`}>
                    <BookOpen className="w-4 h-4" />
                    Ver mais
                  </div>
                )}
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
                <h3 className="font-semibold text-xl sm:text-2xl">Materiais Disponíveis</h3>
                {maisAcademicos.map((mat) => {
                  const isExpanded = expandedMateriais.has(mat.id);
                  return (
                    <motion.div
                      key={mat.id}
                      className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-transparent p-3 sm:p-5 transition-all hover:shadow-md"
                      layout
                    >
                      <button
                        onClick={() => toggleExpandMateriais(mat.id)}
                        className="w-full text-left"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="shrink-0 mt-0.5">
                                {getIconByTipo(mat.tipo)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm sm:text-lg leading-snug break-words">
                                  {mat.titulo}
                                </h4>
                                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-muted-foreground">
                                  {mat.dataCriacaoFormatada}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap sm:shrink-0 pl-7 sm:pl-0">
                            {mat.isPremium && (
                              <Badge variant="outline" className="bg-amber-50 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                                <Star className="w-3 h-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                              {getTituloTipo(mat.tipo)}
                            </Badge>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ml-auto sm:ml-0 ${
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
                  onClick={() => void handleProtectedDownload(materialLeituraSelecionado)}
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
    const instagramHandle = "prof.luizmiguel";
    const linkInstagram = `https://instagram.com/${instagramHandle}`;
    const nomePrimeiro = nomeUsuario.trim().split(/\s+/)[0] || "aluno";
    const mensagemGraduacao = encodeURIComponent(
      `Olá Professor! Eu sou ${nomePrimeiro}, aluno da graduação, acabei de me cadastrar no portal e gostaria de validar meu desconto especial para a Mentoria da 2ª Fase`
    );
    const mensagemPadrao = encodeURIComponent(
      `Olá Professor! Gostaria de saber mais sobre a Mentoria da 2ª Fase da OAB.`
    );
    const linkWhatsAppGraduacao = `https://wa.me/${meuWhatsApp}?text=${mensagemGraduacao}`;
    const linkWhatsAppPadrao = `https://wa.me/${meuWhatsApp}?text=${mensagemPadrao}`;

    return (
      <motion.div
        variants={itemVariants}
        className="col-span-full mt-6 sm:mt-8 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-8"
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          {/* CONTEÚDO */}
          <div className="flex flex-col justify-center">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-[11px] sm:text-sm font-semibold uppercase tracking-wider text-primary">
                {usuarioEhGraduacao ? "Vagas Limitadas para esta Turma" : "Próximo Passo"}
              </span>
            </div>
            <h3 className="text-lg sm:text-3xl font-bold leading-tight">
              {usuarioEhGraduacao
                ? "⚠️ Condição Exclusiva para Alunos do Presencial"
                : "Mentoria Artesanal para a 2ª Fase da OAB"}
            </h3>
            <p className="mt-2 sm:mt-4 text-xs sm:text-base leading-relaxed text-gray-600">
              {usuarioEhGraduacao
                ? "Professor Luiz Miguel liberou um lote de vagas na Mentoria da 2ª Fase com um Desconto Especial de Aluno da Graduação. Não espere o edital sair para blindar a sua aprovação de forma artesanal."
                : "Você já tem o conhecimento. Agora precisa da prática cirúrgica. Nossas mentorias são artesanais: cada peça sua é corrigida com atenção personalizada, mostrando exatamente onde melhorar."}
            </p>

            {/* DESTAQUES */}
            <div className="mt-3 sm:mt-6 space-y-1.5 sm:space-y-2">
              {[
                "Correção de peças com devolutiva detalhada",
                "Cronograma adaptativo para sua rotina",
                "Comunicação direta com o mentor",
                "Dossiê de evolução em tempo real",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-primary" />
                  <span className="text-xs sm:text-sm">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA + Instagram lado a lado */}
            <div className="mt-4 sm:mt-6 flex flex-row flex-nowrap items-center gap-2 sm:gap-3">
              {usuarioEhGraduacao ? (
                <Button asChild size="lg" className="gap-2 flex-1 sm:flex-initial min-w-0 h-11 sm:h-11 text-xs sm:text-base px-3 sm:px-6">
                  <a href={linkWhatsAppGraduacao} target="_blank" rel="noreferrer">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Garantir Meu Desconto de Aluno</span>
                  </a>
                </Button>
              ) : (
                <Button size="lg" className="gap-2 flex-1 sm:flex-initial min-w-0 h-11 text-xs sm:text-base px-3 sm:px-6">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate">Conheça a Mentoria</span>
                </Button>
              )}

              <a
                href={linkInstagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Instagram @prof.luizmiguel"
                title="Instagram @prof.luizmiguel"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all hover:scale-105"
              >
                <img
                  src="https://raw.githubusercontent.com/miguelss3/suaoab/7720736cf004090c7a0d66f33b0060358abca74c/Instagram_icon.png"
                  alt="Instagram"
                  className="h-10 w-10 object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>

          {/* IMAGEM/VISUAL */}
          <div className="hidden flex-col items-center justify-center md:flex">
            <img
              src="https://raw.githubusercontent.com/miguelss3/suaoab/8a53302fe24efc4cc5b67e65927b2c7028614709/oab%20carteira.png"
              alt="Solenidade de entrega de carteiras da OAB"
              className="w-full max-w-[560px] object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </motion.div>
    );
  };

  // --- RENDER PRINCIPAL ---
  
  // --- LÓGICA DE SEPARAÇÃO: Disciplina Principal vs Outras ---
  const disciplinaPrincipal = usuarioEhGraduacao && disciplinaGraduacaoVinculada 
    ? disciplinaGraduacaoVinculada 
    : null;
  
  const outrasDisc = disciplinaPrincipal 
    ? disciplinas.filter((disc) => disc.id !== disciplinaPrincipal.id)
    : disciplinas;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      {/* HEADER */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <img
                  src="https://raw.githubusercontent.com/miguelss3/suaoab/e807c98a9df0bd4326f0f7d2f1db69ab8e82808f/suaoabnovosemfundo.png"
                  alt="SuaOAB"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-3xl font-bold leading-tight truncate">Portal da Graduação</h1>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-none">
                  Acesse resumos, slides e materiais exclusivos das aulas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-sm">
                <Link to="/">
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sm:hidden">Início</span>
                  <span className="hidden sm:inline">Voltar para o Início</span>
                </Link>
              </Button>

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
                  className="gap-2 h-8 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-sm whitespace-nowrap"
                >
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Entrar / Cadastrar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
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
          <motion.div
            className="space-y-6 sm:space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 1️⃣ MATÉRIA DO ALUNO (SE FOR GRADUAÇÃO) */}
            {disciplinaPrincipal && (
              <motion.div variants={itemVariants} className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-bold text-primary">Sua Disciplina</h2>
                </div>
                {renderCartaoDisciplina(disciplinaPrincipal)}
              </motion.div>
            )}

            {/* 2️⃣ BANNER DE VENDAS (MENTORIA OAB) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              variants={containerVariants}
              viewport={{ once: true }}
              className="my-6 sm:my-8"
            >
              {renderBannerMentoria()}
            </motion.div>

            {/* 3️⃣ OUTRAS DISCIPLINAS - MENU SANFONA (ACCORDION) */}
            {outrasDisc.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3 mt-8 sm:mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Explorar Outras Disciplinas</h2>
                </div>

                {/* ACCORDION RESPONSIVO - Fechado por padrão no mobile */}
                <Accordion type="single" collapsible className="w-full space-y-2 sm:space-y-3">
                  {outrasDisc.map((disc) => {
                    const isBloqueada =
                      Boolean(usuarioLogado) &&
                      usuarioEhGraduacao &&
                      (!disciplinaGraduacaoVinculada || disc.id !== disciplinaGraduacaoVinculada.id);

                    return (
                      <motion.div key={disc.id} variants={itemVariants}>
                        <AccordionItem 
                          value={disc.id}
                          className={`border rounded-lg px-3 sm:px-4 transition-all ${
                            isBloqueada 
                              ? "border-gray-200 bg-muted/30 opacity-60 cursor-not-allowed" 
                              : "border-primary/20 hover:border-primary/40 bg-gradient-to-r from-primary/5 to-transparent"
                          }`}
                        >
                          <AccordionTrigger 
                            className={`py-3 sm:py-4 hover:no-underline text-sm sm:text-base ${isBloqueada ? "cursor-not-allowed" : ""}`}
                            onClick={(e) => {
                              if (isBloqueada) {
                                e.preventDefault();
                                toast.info("Esta disciplina está restrita para os alunos matriculados nesta turma neste semestre.");
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3 sm:gap-4 w-full text-left">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-foreground line-clamp-1 text-sm sm:text-base">
                                  {disc.nome}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                                  Prof. {disc.professor}
                                </p>
                              </div>

                              {isBloqueada ? (
                                <Badge variant="secondary" className="shrink-0 border border-border bg-muted text-muted-foreground text-xs py-1 px-2">
                                  <Lock className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Outra Turma</span>
                                  <span className="sm:hidden">Bloqueada</span>
                                </Badge>
                              ) : (
                                <Badge variant="default" className="shrink-0 text-xs py-1 px-2">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Ativa
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>

                          {!isBloqueada && (
                            <AccordionContent className="pb-3 sm:pb-4 pt-3 sm:pt-4">
                              <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3 sm:space-y-4 border-t border-primary/10 pt-3 sm:pt-4"
                              >
                                {/* Preview de materiais */}
                                {(materiais.get(disc.id) || []).length > 0 ? (
                                  <div className="space-y-2 sm:space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      Materiais ({(materiais.get(disc.id) || []).length})
                                    </p>
                                    <div className="space-y-1.5 sm:space-y-2">
                                      {(materiais.get(disc.id) || []).slice(0, 3).map((material) => (
                                        <div key={material.id} className="flex items-start gap-2 text-xs sm:text-sm">
                                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-foreground">{material.titulo}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {getTituloTipo(material.tipo)} • {material.dataCriacaoFormatada}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                      {(materiais.get(disc.id) || []).length > 3 && (
                                        <p className="text-xs text-muted-foreground font-medium pt-2">
                                          +{(materiais.get(disc.id) || []).length - 3} materiais adicionais
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground">
                                    Disciplina ativa com materiais em atualização.
                                  </div>
                                )}

                                {/* Botão de ação */}
                                <Button
                                  size="sm"
                                  className="w-full gap-2 text-xs sm:text-sm h-9 sm:h-10"
                                  onClick={() => setDisciplinaSelecionada(disc)}
                                >
                                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  Ver Detalhes
                                </Button>
                              </motion.div>
                            </AccordionContent>
                          )}
                        </AccordionItem>
                      </motion.div>
                    );
                  })}
                </Accordion>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* DETALHE DA DISCIPLINA (OVERLAY) */}
      <AnimatePresence>{renderDetalhesDisciplina()}</AnimatePresence>

      {/* MODAL DE LEITURA DO RESUMO */}
      <AnimatePresence>{renderModalLeitura()}</AnimatePresence>
    </div>
  );
};
