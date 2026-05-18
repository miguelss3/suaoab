import { useEffect, useMemo, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Disciplina, MaterialAcademico } from "@/lib/academico";

type DisciplinaForm = {
  nome: string;
  professor: string;
  semestre: string;
  status: "ativa" | "arquivada";
  isOutroProfessor: boolean;
};

type MaterialForm = {
  disciplinaId: string;
  titulo: string;
  tipo: "resumo" | "slide" | "prova" | "questoes";
  conteudoTexto: string;
  urlDownload: string;
  isPremium: boolean;
};

type FirestoreDisciplina = Disciplina;
type FirestoreMaterial = MaterialAcademico & { ordem?: number };

const initialDisciplinaForm: DisciplinaForm = {
  nome: "",
  professor: "",
  semestre: "",
  status: "ativa",
  isOutroProfessor: false,
};

const initialMaterialForm: MaterialForm = {
  disciplinaId: "",
  titulo: "",
  tipo: "resumo",
  conteudoTexto: "",
  urlDownload: "",
  isPremium: false,
};

const AdminGraduacao = () => {
  const [disciplinas, setDisciplinas] = useState<FirestoreDisciplina[]>([]);
  const [materiais, setMateriais] = useState<FirestoreMaterial[]>([]);
  const [disciplinaForm, setDisciplinaForm] = useState<DisciplinaForm>(initialDisciplinaForm);
  const [materialForm, setMaterialForm] = useState<MaterialForm>(initialMaterialForm);
  const [disciplinaEditandoId, setDisciplinaEditandoId] = useState<string | null>(null);
  const [materialEditandoId, setMaterialEditandoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFeedback, setUploadFeedback] = useState("");

  // Acordão (todos fechados por padrão) e DnD
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedRef = useRef<{ id: string; disciplinaId: string } | null>(null);

  const disciplinasAtivas = useMemo(
    () => disciplinas.filter((d) => d.status === "ativa"),
    [disciplinas]
  );

  useEffect(() => {
    const disciplinasQuery = query(collection(db, "disciplinas"), orderBy("nome", "asc"));
    const unsubscribeDisciplinas = onSnapshot(
      disciplinasQuery,
      (snapshot) => {
        const lista = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as FirestoreDisciplina[];
        setDisciplinas(lista);
      },
      (error) => {
        console.error("Erro ao carregar disciplinas:", error);
        window.alert("Erro ao carregar disciplinas.");
      }
    );

    const materiaisQuery = query(collection(db, "materiaisAcademicos"), orderBy("dataCriacao", "desc"));
    const unsubscribeMateriais = onSnapshot(
      materiaisQuery,
      (snapshot) => {
        const lista = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as FirestoreMaterial[];
        setMateriais(lista);
      },
      (error) => {
        console.error("Erro ao carregar materiais:", error);
        window.alert("Erro ao carregar materiais.");
      }
    );

    return () => {
      unsubscribeDisciplinas();
      unsubscribeMateriais();
    };
  }, []);

  const cancelarEdicaoDisciplina = () => {
    setDisciplinaEditandoId(null);
    setDisciplinaForm(initialDisciplinaForm);
  };

  const iniciarEdicaoDisciplina = (disciplina: FirestoreDisciplina) => {
    setDisciplinaEditandoId(disciplina.id);
    setDisciplinaForm({
      nome: disciplina.nome,
      professor: disciplina.professor,
      semestre: disciplina.semestre,
      status: disciplina.status,
      isOutroProfessor: disciplina.isOutroProfessor,
    });
  };

  const salvarDisciplina = async () => {
    if (!disciplinaForm.nome.trim() || !disciplinaForm.professor.trim() || !disciplinaForm.semestre.trim()) {
      window.alert("Preencha nome, professor e semestre da disciplina.");
      return;
    }

    try {
      const payload = {
        nome: disciplinaForm.nome.trim(),
        professor: disciplinaForm.professor.trim(),
        semestre: disciplinaForm.semestre.trim(),
        status: disciplinaForm.status,
        isOutroProfessor: disciplinaForm.isOutroProfessor,
      };

      if (disciplinaEditandoId) {
        await updateDoc(doc(db, "disciplinas", disciplinaEditandoId), payload);
        window.alert("Disciplina atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "disciplinas"), payload);
        window.alert("Disciplina criada com sucesso!");
      }

      cancelarEdicaoDisciplina();
    } catch (error) {
      console.error("Erro ao salvar disciplina:", error);
      window.alert("Erro ao salvar disciplina.");
    }
  };

  const alternarStatusDisciplina = async (disciplina: FirestoreDisciplina) => {
    try {
      await updateDoc(doc(db, "disciplinas", disciplina.id), {
        status: disciplina.status === "ativa" ? "arquivada" : "ativa",
      });
      window.alert("Status da disciplina atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status da disciplina:", error);
      window.alert("Erro ao atualizar status da disciplina.");
    }
  };

  const excluirDisciplina = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta disciplina?")) return;

    try {
      await deleteDoc(doc(db, "disciplinas", id));
      window.alert("Disciplina excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir disciplina:", error);
      window.alert("Erro ao excluir disciplina.");
    }
  };

  const cancelarEdicaoMaterial = () => {
    setMaterialEditandoId(null);
    setMaterialForm(initialMaterialForm);
  };

  const iniciarEdicaoMaterial = (material: FirestoreMaterial) => {
    setMaterialEditandoId(material.id);
    setMaterialForm({
      disciplinaId: material.disciplinaId,
      titulo: material.titulo,
      tipo: material.tipo,
      conteudoTexto: material.conteudoTexto || "",
      urlDownload: material.urlDownload || "",
      isPremium: material.isPremium,
    });
  };

  const salvarMaterial = async () => {
    if (!materialForm.disciplinaId || !materialForm.titulo.trim()) {
      window.alert("Selecione uma disciplina e preencha o título do material.");
      return;
    }

    try {
      const payload = {
        disciplinaId: materialForm.disciplinaId,
        titulo: materialForm.titulo.trim(),
        tipo: materialForm.tipo,
        conteudoTexto: materialForm.conteudoTexto.trim() || "",
        urlDownload: materialForm.urlDownload.trim() || "",
        isPremium: materialForm.isPremium,
      };

      if (materialEditandoId) {
        await updateDoc(doc(db, "materiaisAcademicos", materialEditandoId), payload);
        window.alert("Material atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "materiaisAcademicos"), {
          ...payload,
          dataCriacao: new Date(),
        });
        window.alert("Material publicado com sucesso!");
      }

      cancelarEdicaoMaterial();
    } catch (error) {
      console.error("Erro ao salvar material:", error);
      window.alert("Erro ao salvar material.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadFeedback("");

    try {
      const safeFileName = file.name.replace(/\s+/g, "_");
      const storageRef = ref(storage, `materiais_graduacao/${Date.now()}-${safeFileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
            setUploadProgress(Math.round(progress));
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      setMaterialForm((prev) => ({ ...prev, urlDownload: downloadUrl }));
      setUploadProgress(100);
      setUploadFeedback("Ficheiro carregado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload do ficheiro:", error);
      setUploadFeedback("Erro ao carregar o ficheiro.");
      window.alert("Erro ao carregar o ficheiro.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const excluirMaterial = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este material?")) return;

    try {
      await deleteDoc(doc(db, "materiaisAcademicos", id));
      window.alert("Material excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir material:", error);
      window.alert("Erro ao excluir material.");
    }
  };

  const nomeDisciplina = (disciplinaId: string) => {
    return disciplinas.find((d) => d.id === disciplinaId)?.nome || "Disciplina não encontrada";
  };

  // --- AGRUPAMENTO POR DISCIPLINA + ORDENAÇÃO POR `ordem` ---
  const materiaisPorDisciplina = useMemo(() => {
    const map = new Map<string, FirestoreMaterial[]>();
    for (const m of materiais) {
      const chave = m.disciplinaId || "__sem_disciplina__";
      if (!map.has(chave)) map.set(chave, []);
      map.get(chave)!.push(m);
    }
    for (const [k, lista] of map) {
      lista.sort((a, b) => {
        const oa = typeof a.ordem === "number" ? a.ordem : Number.POSITIVE_INFINITY;
        const ob = typeof b.ordem === "number" ? b.ordem : Number.POSITIVE_INFINITY;
        return oa - ob;
      });
      map.set(k, lista);
    }
    return map;
  }, [materiais]);

  // Ordem de exibição dos grupos: disciplinas (alfabético por nome) + bucket "sem disciplina" no fim
  const gruposOrdenados = useMemo(() => {
    const ordenadas = [...disciplinas].sort((a, b) => a.nome.localeCompare(b.nome));
    const grupos: { chave: string; titulo: string; lista: FirestoreMaterial[] }[] = [];
    for (const d of ordenadas) {
      const lista = materiaisPorDisciplina.get(d.id) || [];
      if (lista.length > 0) {
        grupos.push({ chave: d.id, titulo: d.nome, lista });
      }
    }
    const orfaos = materiaisPorDisciplina.get("__sem_disciplina__");
    if (orfaos && orfaos.length > 0) {
      grupos.push({ chave: "__sem_disciplina__", titulo: "Sem disciplina", lista: orfaos });
    }
    return grupos;
  }, [disciplinas, materiaisPorDisciplina]);

  const toggleGrupo = (chave: string) => {
    setAbertos((prev) => ({ ...prev, [chave]: !prev[chave] }));
  };

  // --- DRAG AND DROP (HTML5 nativo, sem dependências extras) ---
  const handleDragStart = (id: string, disciplinaId: string) => {
    draggedRef.current = { id, disciplinaId };
  };

  const handleDragOver = (e: React.DragEvent, alvoId: string) => {
    e.preventDefault();
    setDragOverId(alvoId);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = async (
    e: React.DragEvent,
    alvoId: string,
    disciplinaId: string,
    lista: FirestoreMaterial[]
  ) => {
    e.preventDefault();
    setDragOverId(null);

    const dragged = draggedRef.current;
    draggedRef.current = null;
    if (!dragged || dragged.id === alvoId) return;
    if (dragged.disciplinaId !== disciplinaId) {
      toast.error("Só é possível reordenar dentro da mesma disciplina.");
      return;
    }

    const fromIdx = lista.findIndex((m) => m.id === dragged.id);
    const toIdx = lista.findIndex((m) => m.id === alvoId);
    if (fromIdx === -1 || toIdx === -1) return;

    const novaLista = [...lista];
    const [movido] = novaLista.splice(fromIdx, 1);
    novaLista.splice(toIdx, 0, movido);

    // Atualização otimista da UI
    setMateriais((prev) => {
      const ids = new Set(novaLista.map((m) => m.id));
      const resto = prev.filter((m) => !ids.has(m.id));
      return [...resto, ...novaLista.map((m, i) => ({ ...m, ordem: i }))];
    });

    // Persiste no Firestore em batch
    try {
      const batch = writeBatch(db);
      novaLista.forEach((m, i) => {
        batch.update(doc(db, "materiaisAcademicos", m.id), { ordem: i });
      });
      await batch.commit();
      toast.success("Ordem atualizada com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar a nova ordem.");
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="disciplinas" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger
            value="disciplinas"
            className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent"
          >
            <GraduationCap className="h-4 w-4" /> Gerenciar Disciplinas
          </TabsTrigger>
          <TabsTrigger
            value="materiais"
            className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent"
          >
            <Upload className="h-4 w-4" /> Postar Materiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disciplinas" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-primary flex items-center gap-2">
              {disciplinaEditandoId ? <Pencil className="h-5 w-5 text-accent" /> : <Plus className="h-5 w-5 text-accent" />} {disciplinaEditandoId ? "Editar Disciplina" : "Nova Disciplina"}
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Disciplina</Label>
                <Input
                  value={disciplinaForm.nome}
                  onChange={(e) => setDisciplinaForm((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Direito Econômico e Financeiro"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Professor</Label>
                <Input
                  value={disciplinaForm.professor}
                  onChange={(e) => setDisciplinaForm((prev) => ({ ...prev, professor: e.target.value }))}
                  placeholder="Ex: Prof. Miguel"
                />
              </div>
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Input
                  value={disciplinaForm.semestre}
                  onChange={(e) => setDisciplinaForm((prev) => ({ ...prev, semestre: e.target.value }))}
                  placeholder="Ex: 2026/1"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={disciplinaForm.status}
                  onChange={(e) =>
                    setDisciplinaForm((prev) => ({
                      ...prev,
                      status: e.target.value as "ativa" | "arquivada",
                    }))
                  }
                >
                  <option value="ativa">Ativa</option>
                  <option value="arquivada">Arquivada</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={disciplinaForm.isOutroProfessor}
                onCheckedChange={(checked) =>
                  setDisciplinaForm((prev) => ({ ...prev, isOutroProfessor: Boolean(checked) }))
                }
              />
              <Label>Disciplina de outro professor (isOutroProfessor)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={salvarDisciplina} className="font-bold">
                {disciplinaEditandoId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {disciplinaEditandoId ? "Atualizar Disciplina" : "Salvar Disciplina"}
              </Button>
              {disciplinaEditandoId && (
                <Button variant="outline" onClick={cancelarEdicaoDisciplina}>
                  <X className="h-4 w-4 mr-2" /> Cancelar Edição
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h4 className="text-base font-bold text-primary">Disciplinas Cadastradas</h4>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Nome</th>
                    <th className="py-2">Professor</th>
                    <th className="py-2">Semestre</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Outro professor</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplinas.map((disciplina) => (
                    <tr key={disciplina.id} className="border-b last:border-b-0">
                      <td className="py-2">{disciplina.nome}</td>
                      <td className="py-2">{disciplina.professor}</td>
                      <td className="py-2">{disciplina.semestre}</td>
                      <td className="py-2">
                        <span className={disciplina.status === "ativa" ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                          {disciplina.status}
                        </span>
                      </td>
                      <td className="py-2">{disciplina.isOutroProfessor ? "Sim" : "Não"}</td>
                      <td className="py-2 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => iniciarEdicaoDisciplina(disciplina)}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => alternarStatusDisciplina(disciplina)}>
                          {disciplina.status === "ativa" ? "Arquivar" : "Ativar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => excluirDisciplina(disciplina.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {disciplinas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground italic">
                        Nenhuma disciplina cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materiais" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-primary flex items-center gap-2">
              {materialEditandoId ? <Pencil className="h-5 w-5 text-accent" /> : <BookOpen className="h-5 w-5 text-accent" />} {materialEditandoId ? "Editar Material Acadêmico" : "Novo Material Acadêmico"}
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disciplina (apenas ativas)</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={materialForm.disciplinaId}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, disciplinaId: e.target.value }))}
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplinasAtivas.map((disciplina) => (
                    <option key={disciplina.id} value={disciplina.id}>
                      {disciplina.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Título do Material</Label>
                <Input
                  value={materialForm.titulo}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Aula 01 - Ordem Econômica"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={materialForm.tipo}
                  onChange={(e) =>
                    setMaterialForm((prev) => ({
                      ...prev,
                      tipo: e.target.value as "resumo" | "slide" | "prova" | "questoes",
                    }))
                  }
                >
                  <option value="resumo">Resumo</option>
                  <option value="slide">Slide</option>
                  <option value="prova">Prova</option>
                  <option value="questoes">Questões</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>URL de Download</Label>
                <Input
                  value={materialForm.urlDownload}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, urlDownload: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ficheiro do Material</Label>
              <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/30 p-4">
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.png"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:font-semibold hover:file:bg-primary/90"
                />
                {isUploading && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isUploading ? (
                    <span className="font-semibold text-primary">A carregar ficheiro... {uploadProgress}%</span>
                  ) : uploadFeedback ? (
                    <span className={uploadFeedback.includes("sucesso") ? "font-semibold text-emerald-600" : "font-semibold text-destructive"}>
                      {uploadFeedback}
                    </span>
                  ) : (
                    <span>PDF, apresentações, documentos e imagens são aceites.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo em Texto</Label>
              <RichTextEditor
                value={materialForm.conteudoTexto}
                onChange={(html) => setMaterialForm((prev) => ({ ...prev, conteudoTexto: html }))}
                placeholder="Digite o resumo ou instruções do material..."
                className="min-h-[160px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={materialForm.isPremium}
                onCheckedChange={(checked) =>
                  setMaterialForm((prev) => ({ ...prev, isPremium: Boolean(checked) }))
                }
              />
              <Label>Material Premium (isPremium)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={salvarMaterial} className="font-bold" disabled={isUploading}>
                {materialEditandoId ? <Save className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {materialEditandoId ? "Atualizar Material" : "Publicar Material"}
              </Button>
              {materialEditandoId && (
                <Button variant="outline" onClick={cancelarEdicaoMaterial} disabled={isUploading}>
                  <X className="h-4 w-4 mr-2" /> Cancelar Edição
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-primary">Materiais Publicados</h4>
              <span className="text-[10px] font-black uppercase text-muted-foreground">
                Arraste pelos itens para reordenar
              </span>
            </div>

            <div className="space-y-3">
              {gruposOrdenados.length === 0 && (
                <p className="py-6 text-center text-muted-foreground italic">
                  Nenhum material cadastrado.
                </p>
              )}

              {gruposOrdenados.map(({ chave, titulo, lista }) => {
                const aberto = !!abertos[chave];
                return (
                  <div
                    key={chave}
                    className="border border-border rounded-xl overflow-hidden bg-background/40"
                  >
                    {/* CABEÇALHO ACORDEÃO (fechado por padrão) */}
                    <button
                      type="button"
                      onClick={() => toggleGrupo(chave)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {aberto ? (
                          <ChevronDown className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="font-black uppercase tracking-wide text-primary text-sm">
                          {titulo}
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {lista.length} {lista.length === 1 ? "item" : "itens"}
                      </span>
                    </button>

                    {/* CONTEÚDO DnD */}
                    {aberto && (
                      <div className="p-4 border-t border-border space-y-2">
                        {lista.map((material) => {
                          const isHover = dragOverId === material.id;
                          return (
                            <div
                              key={material.id}
                              draggable
                              onDragStart={() =>
                                handleDragStart(material.id, material.disciplinaId)
                              }
                              onDragOver={(e) => handleDragOver(e, material.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) =>
                                handleDrop(e, material.id, material.disciplinaId, lista)
                              }
                              className={`group flex flex-col gap-3 rounded-lg border p-4 bg-card transition-all cursor-move md:flex-row md:items-center md:justify-between ${
                                isHover
                                  ? "border-accent ring-2 ring-accent/40"
                                  : "border-border hover:border-accent/60"
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary" />
                                <div className="space-y-1 min-w-0">
                                  <p className="font-semibold text-primary truncate">
                                    {material.titulo}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {nomeDisciplina(material.disciplinaId)} • {material.tipo} •{" "}
                                    {material.isPremium ? "Premium" : "Grátis"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => iniciarEdicaoMaterial(material)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => excluirMaterial(material.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGraduacao;
