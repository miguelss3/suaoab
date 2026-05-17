import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { BookOpen, GraduationCap, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  tipo: "resumo" | "slide" | "prova";
  conteudoTexto: string;
  urlDownload: string;
  isPremium: boolean;
};

type FirestoreDisciplina = Disciplina;
type FirestoreMaterial = MaterialAcademico;

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
        conteudoTexto: materialForm.conteudoTexto.trim() || undefined,
        urlDownload: materialForm.urlDownload.trim() || undefined,
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
                      tipo: e.target.value as "resumo" | "slide" | "prova",
                    }))
                  }
                >
                  <option value="resumo">Resumo</option>
                  <option value="slide">Slide</option>
                  <option value="prova">Prova</option>
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
              <Label>Conteúdo em Texto</Label>
              <Textarea
                value={materialForm.conteudoTexto}
                onChange={(e) => setMaterialForm((prev) => ({ ...prev, conteudoTexto: e.target.value }))}
                placeholder="Digite o resumo ou instruções do material..."
                className="min-h-[120px]"
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
              <Button onClick={salvarMaterial} className="font-bold">
                {materialEditandoId ? <Save className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {materialEditandoId ? "Atualizar Material" : "Publicar Material"}
              </Button>
              {materialEditandoId && (
                <Button variant="outline" onClick={cancelarEdicaoMaterial}>
                  <X className="h-4 w-4 mr-2" /> Cancelar Edição
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h4 className="text-base font-bold text-primary">Materiais Publicados</h4>

            <div className="space-y-3">
              {materiais.map((material) => (
                <div
                  key={material.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-primary">{material.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {nomeDisciplina(material.disciplinaId)} • {material.tipo} • {material.isPremium ? "Premium" : "Grátis"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="outline" size="sm" onClick={() => iniciarEdicaoMaterial(material)}>
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
              ))}

              {materiais.length === 0 && (
                <p className="py-6 text-center text-muted-foreground italic">Nenhum material cadastrado.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGraduacao;
