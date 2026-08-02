// src/components/admin/GestaoCronograma.tsx
// Cronograma-modelo por disciplina: o professor monta manualmente, uma vez, a
// lista de metas padrão de uma disciplina inteira. Serve de referência/base ao
// montar o cronograma real de cada aluno (Dossiê → Gerar Rota), em vez de
// depender só do gerador automático.
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";
import { AlertTriangle, CalendarRange, GripVertical, Plus, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CodigoDisciplinaSegundaFase, disciplinasSegundaFaseDisponiveis, useDisciplinasSegundaFaseAtivas } from "@/lib/disciplinasSegundaFase";
import { isAlunoSandbox } from "@/lib/ciclo";
import { DOC_CRONOGRAMA_TEMPLATES, gerarMetasDoTemplate, MetaTemplateItem } from "@/lib/cronograma";

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
    atualizarMetas([...metasAtuais, metaVazia()]);
  };

  const editarMeta = (indice: number, campo: keyof MetaTemplate, valor: string | number) => {
    const novasMetas = metasAtuais.map((meta, i) => (i === indice ? { ...meta, [campo]: valor } : meta));
    atualizarMetas(novasMetas);
  };

  const removerMeta = (indice: number) => {
    atualizarMetas(metasAtuais.filter((_, i) => i !== indice));
  };

  const moverMeta = (indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao;
    if (destino < 0 || destino >= metasAtuais.length) return;
    const novasMetas = [...metasAtuais];
    [novasMetas[indice], novasMetas[destino]] = [novasMetas[destino], novasMetas[indice]];
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

            <div className="space-y-4">
              {metasAtuais.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-6">
                  Nenhuma meta no cronograma-modelo desta disciplina ainda.
                </p>
              )}

              {metasAtuais.map((meta, indice) => (
            <div key={indice} className="p-4 rounded-xl border-2 border-border bg-background space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded">
                  Meta {indice + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moverMeta(indice, -1)} disabled={indice === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                  <button type="button" onClick={() => moverMeta(indice, 1)} disabled={indice === metasAtuais.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </button>
                  <button type="button" onClick={() => removerMeta(indice)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Título da Atividade</Label>
                  <Input value={meta.atividade} onChange={(e) => editarMeta(indice, "atividade", e.target.value)} placeholder="Ex: Leitura dirigida — Preliminares" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Dia (a partir do início)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={meta.diaRelativo}
                    onChange={(e) => editarMeta(indice, "diaRelativo", Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-muted-foreground">Orientações</Label>
                <textarea
                  value={meta.orientacoes}
                  onChange={(e) => editarMeta(indice, "orientacoes", e.target.value)}
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                  placeholder="Instruções para o aluno..."
                />
              </div>
            </div>
          ))}

              <Button type="button" variant="outline" className="w-full gap-2" onClick={adicionarMeta}>
                <Plus className="h-4 w-4" /> Adicionar Meta ao Cronograma-Modelo
              </Button>

              <Button variant="hero" size="lg" className="w-full h-12" onClick={handleSalvar} disabled={salvando}>
                <Save className="h-5 w-5 mr-2" />
                {salvando ? "Salvando..." : "Salvar Cronograma-Modelo"}
              </Button>

              <div className="pt-4 mt-2 border-t border-border space-y-3">
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GestaoCronograma;
