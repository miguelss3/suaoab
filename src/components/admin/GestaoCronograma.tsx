// src/components/admin/GestaoCronograma.tsx
// Cronograma-modelo por disciplina: o professor monta manualmente, uma vez, a
// lista de metas padrão de uma disciplina inteira. Serve de referência/base ao
// montar o cronograma real de cada aluno (Dossiê → Gerar Rota), em vez de
// depender só do gerador automático.
import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { AlertTriangle, CalendarRange, ChevronDown, ChevronRight, Link as LinkIcon, Plus, Save, Trash2, UploadCloud, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { LinksEditor } from "@/components/admin/LinksEditor";
import { toast } from "sonner";
import { CodigoDisciplinaSegundaFase, disciplinasSegundaFaseDisponiveis, useDisciplinasSegundaFaseAtivas } from "@/lib/disciplinasSegundaFase";
import { isAlunoSandbox } from "@/lib/ciclo";
import { DOC_CRONOGRAMA_TEMPLATES, gerarMetasDoTemplate, LinkMeta, MetaTemplateItem } from "@/lib/cronograma";

type MetaTemplate = MetaTemplateItem;

// Limite de 500 operações por batch do Firestore.
const TAMANHO_LOTE = 400;

const metaVazia = (): MetaTemplate => ({ atividade: "", orientacoes: "", diaRelativo: 1 });

const GestaoCronograma = () => {
  const disciplinasAtivas = useDisciplinasSegundaFaseAtivas();
  const disciplinasDisponiveis = disciplinasSegundaFaseDisponiveis(disciplinasAtivas);

  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<CodigoDisciplinaSegundaFase | "">("");
  const [templates, setTemplates] = useState<Record<string, MetaTemplate[]>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [anexandoIdx, setAnexandoIdx] = useState<number | null>(null);
  const [metasAbertas, setMetasAbertas] = useState<Record<number, boolean>>({});

  // Data de referência só para exibir/editar o "dia relativo" num minicalendário
  // (fixada ao abrir a tela): as datas mostradas equivalem a "se o aluno
  // começasse hoje". O que é salvo continua sendo o dia relativo, não a data.
  const [dataReferencia] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const diaParaData = (dia: number) => {
    const d = new Date(dataReferencia);
    d.setDate(d.getDate() + dia);
    return d.toISOString().split("T")[0];
  };

  const dataParaDia = (dataStr: string) => {
    const d = new Date(dataStr + "T00:00:00");
    const diffMs = d.getTime() - dataReferencia.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  // Garante que a disciplina selecionada é sempre uma habilitada: se a atual foi
  // desligada (ou nenhuma foi escolhida ainda), cai para a primeira disponível.
  useEffect(() => {
    if (disciplinasDisponiveis.length === 0) {
      setDisciplinaSelecionada("");
      return;
    }
    setDisciplinaSelecionada((atual) =>
      disciplinasDisponiveis.some((d) => d.codigo === atual) ? atual : disciplinasDisponiveis[0].codigo
    );
  }, [disciplinasDisponiveis]);

  useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDoc(DOC_CRONOGRAMA_TEMPLATES);
        if (snap.exists()) {
          setTemplates(snap.data() as Record<string, MetaTemplate[]>);
        }
      } catch (error) {
        console.error("Erro ao carregar cronogramas-modelo:", error);
        toast.error("Erro ao carregar os cronogramas-modelo.");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const metasAtuais = templates[disciplinaSelecionada] ?? [];

  const atualizarMetas = (novasMetas: MetaTemplate[]) => {
    setTemplates((prev) => ({ ...prev, [disciplinaSelecionada]: novasMetas }));
  };

  const adicionarMeta = () => {
    const novoIndice = metasAtuais.length;
    atualizarMetas([...metasAtuais, metaVazia()]);
    setMetasAbertas((prev) => ({ ...prev, [novoIndice]: true }));
  };

  const toggleMetaAberta = (indice: number) => {
    setMetasAbertas((prev) => ({ ...prev, [indice]: !prev[indice] }));
  };

  const editarMeta = (indice: number, campo: keyof MetaTemplate, valor: string | number) => {
    const novasMetas = metasAtuais.map((meta, i) => (i === indice ? { ...meta, [campo]: valor } : meta));
    atualizarMetas(novasMetas);
  };

  const removerMeta = (indice: number) => {
    atualizarMetas(metasAtuais.filter((_, i) => i !== indice));
  };

  const atualizarLinksMeta = (indice: number, links: LinkMeta[]) => {
    const novasMetas = metasAtuais.map((meta, i) => (i === indice ? { ...meta, links } : meta));
    atualizarMetas(novasMetas);
  };

  const handleAnexarArquivo = async (indice: number, arquivo: File | null) => {
    if (!arquivo || !disciplinaSelecionada) return;
    setAnexandoIdx(indice);
    try {
      const safeName = arquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const fileRef = ref(storage, `materiais_alunos/${disciplinaSelecionada}/cronograma_templates/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(fileRef, arquivo);
      const url = await getDownloadURL(snapshot.ref);
      const novasMetas = metasAtuais.map((meta, i) =>
        i === indice ? { ...meta, arquivo_url: url, arquivo_nome: arquivo.name } : meta
      );
      atualizarMetas(novasMetas);
    } catch (error) {
      console.error("Erro ao anexar arquivo à meta-modelo:", error);
      toast.error("Erro ao anexar o arquivo.");
    } finally {
      setAnexandoIdx(null);
    }
  };

  const removerAnexoMeta = async (indice: number) => {
    const meta = metasAtuais[indice];
    if (meta.arquivo_url) {
      try {
        await deleteObject(ref(storage, meta.arquivo_url));
      } catch (error) {
        console.log("Ignorado: arquivo já não existia no storage.", error);
      }
    }
    const novasMetas = metasAtuais.map((m, i) => (i === indice ? { ...m, arquivo_url: "", arquivo_nome: "" } : m));
    atualizarMetas(novasMetas);
  };

  const handleSalvar = async () => {
    if (!disciplinaSelecionada) {
      toast.error("Nenhuma disciplina habilitada para montar cronograma.");
      return;
    }
    setSalvando(true);
    try {
      await setDoc(DOC_CRONOGRAMA_TEMPLATES, { [disciplinaSelecionada]: metasAtuais }, { merge: true });
      toast.success("Cronograma-modelo salvo com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar cronograma-modelo:", error);
      toast.error("Erro ao salvar o cronograma-modelo.");
    } finally {
      setSalvando(false);
    }
  };

  const handleAplicarAlunosAtivos = async () => {
    if (!disciplinaSelecionada) return;
    if (metasAtuais.length === 0) {
      toast.error("Monte o cronograma-modelo antes de aplicar aos alunos.");
      return;
    }

    setAplicando(true);
    try {
      const q = query(collection(db, "alunos"), where("materia", "==", disciplinaSelecionada));
      const snap = await getDocs(q);
      const alunosAlvo = snap.docs.filter((d) => !isAlunoSandbox({ id: d.id, email: d.data().email }));

      if (alunosAlvo.length === 0) {
        toast.error("Nenhum aluno encontrado nesta disciplina.");
        return;
      }

      const nomeDisciplina = disciplinasDisponiveis.find((d) => d.codigo === disciplinaSelecionada)?.nome ?? disciplinaSelecionada;
      const confirmou = window.confirm(
        `Isso vai SUBSTITUIR o cronograma atual de ${alunosAlvo.length} aluno(s) de ${nomeDisciplina} pelo cronograma-modelo, ` +
        `apagando o progresso de metas que eles já tinham marcado. Essa ação não pode ser desfeita. Confirmar?`
      );
      if (!confirmou) return;

      const hoje = new Date();
      const metasGeradas = gerarMetasDoTemplate(metasAtuais, hoje);

      for (let i = 0; i < alunosAlvo.length; i += TAMANHO_LOTE) {
        const lote = alunosAlvo.slice(i, i + TAMANHO_LOTE);
        const batch = writeBatch(db);
        lote.forEach((alunoDoc) => {
          batch.update(doc(db, "alunos", alunoDoc.id), { metas: metasGeradas });
        });
        await batch.commit();
      }

      toast.success(`Cronograma aplicado a ${alunosAlvo.length} aluno(s) de ${nomeDisciplina}.`);
    } catch (error) {
      console.error("Erro ao aplicar cronograma retroativamente:", error);
      toast.error("Erro ao aplicar o cronograma aos alunos.");
    } finally {
      setAplicando(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground font-bold">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary italic">Montagem de Cronograma</h2>
            <p className="text-sm text-muted-foreground">
              Este é o cronograma-modelo oficial de cada disciplina: todo aluno novo já entra com ele carregado
              automaticamente. Ajustes pontuais para um aluno específico continuam possíveis no Dossiê.
            </p>
          </div>
        </div>

        {disciplinasDisponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Nenhuma disciplina habilitada em Ciclos e Prazos ainda.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {disciplinasDisponiveis.map(({ codigo, nome }) => (
                <button
                  key={codigo}
                  type="button"
                  onClick={() => setDisciplinaSelecionada(codigo)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                    disciplinaSelecionada === codigo ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                  }`}
                >
                  {nome}
                </button>
              ))}
            </div>

            <div className="pb-6 mb-6 border-b border-border space-y-3">
              <div className="flex items-start gap-2 text-xs text-accent">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  A ação abaixo substitui o cronograma de alunos que já estão estudando esta disciplina — apaga o
                  progresso de metas que eles já tinham marcado. Não pode ser desfeita.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-2 border-accent/40 text-accent hover:bg-accent/10"
                onClick={handleAplicarAlunosAtivos}
                disabled={aplicando || metasAtuais.length === 0}
              >
                <Users className="h-4 w-4" />
                {aplicando ? "Aplicando..." : "Aplicar aos Alunos Ativos desta Disciplina"}
              </Button>
            </div>

            <div className="space-y-4">
              {metasAtuais.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-6">
                  Nenhuma meta no cronograma-modelo desta disciplina ainda.
                </p>
              )}

              {metasAtuais.map((meta, indice) => {
                const aberta = !!metasAbertas[indice];
                return (
                  <div key={indice} className="rounded-xl border-2 border-border bg-background overflow-hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleMetaAberta(indice)}
                      onKeyDown={(e) => { if (e.key === "Enter") toggleMetaAberta(indice); }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {aberta ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="text-xs font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded shrink-0">
                          Meta {indice + 1}
                        </span>
                        <span className="font-bold text-sm text-primary truncate">{meta.atividade || "(sem título)"}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{diaParaData(meta.diaRelativo).split("-").reverse().join("/")}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removerMeta(indice); }}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {aberta && (
                      <div className="p-4 pt-0 space-y-3 border-t border-border">
                        <div className="grid md:grid-cols-[1fr_120px] gap-3 pt-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Título da Atividade</Label>
                            <Input value={meta.atividade} onChange={(e) => editarMeta(indice, "atividade", e.target.value)} placeholder="Ex: Leitura dirigida — Preliminares" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Data da Meta</Label>
                            <Input
                              type="date"
                              value={diaParaData(meta.diaRelativo)}
                              onChange={(e) => e.target.value && editarMeta(indice, "diaRelativo", dataParaDia(e.target.value))}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground -mt-2">
                          Considerando início hoje ({dataReferencia.toLocaleDateString("pt-BR")}) — o que importa é o espaçamento entre as metas, não a data exata.
                        </p>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Orientações</Label>
                          <RichTextEditor
                            value={meta.orientacoes}
                            onChange={(html) => editarMeta(indice, "orientacoes", html)}
                            placeholder="Instruções para o aluno..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Links (Opcional)</Label>
                          <LinksEditor
                            materia={disciplinaSelecionada}
                            links={meta.links || []}
                            onChange={(links) => atualizarLinksMeta(indice, links)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Anexo (Opcional)</Label>
                          <div className="flex items-center gap-2">
                            <div className="relative w-full">
                              <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleAnexarArquivo(indice, e.target.files?.[0] || null)}
                              />
                              <div className={`h-10 border rounded-md flex items-center px-3 text-sm ${meta.arquivo_url ? "bg-success/10 border-success/30 text-success font-bold" : "bg-background text-muted-foreground"}`}>
                                <UploadCloud className="h-4 w-4 mr-2" />
                                <span className="truncate">
                                  {anexandoIdx === indice ? "Enviando..." : meta.arquivo_nome || meta.arquivo_url ? meta.arquivo_nome || "Anexo salvo" : "Anexar arquivo"}
                                </span>
                              </div>
                            </div>
                            {meta.arquivo_url && (
                              <Button type="button" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removerAnexoMeta(indice)} title="Remover anexo">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {meta.link && (
                          <a href={meta.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:underline">
                            <LinkIcon className="h-3 w-3" /> {meta.link}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button type="button" variant="outline" className="w-full gap-2" onClick={adicionarMeta}>
                <Plus className="h-4 w-4" /> Adicionar Meta ao Cronograma-Modelo
              </Button>

              <Button variant="hero" size="lg" className="w-full h-12" onClick={handleSalvar} disabled={salvando}>
                <Save className="h-5 w-5 mr-2" />
                {salvando ? "Salvando..." : "Salvar Cronograma-Modelo"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GestaoCronograma;
