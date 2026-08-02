// src/components/admin/GestaoMaterialProcessual.tsx
// Acervo teórico da disciplina, separado por Direito Material e Direito
// Processual — mesma estrutura do Laboratório de Peças (lista à esquerda +
// formulário de adicionar à direita), guardado em disciplinas/{materia} nos
// campos `materialTeorico` e `processualTeorico`.
import { useEffect, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Scale, Plus, Trash2, FileText, UploadCloud, Pencil, X, CheckCircle2, Gavel, Landmark, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { disciplinasParaSelect, useDisciplinasSegundaFaseAtivas } from "@/lib/disciplinasSegundaFase";

type Categoria = "material" | "processual";
type ItemTeorico = { nome: string; url_pdf?: string };

const CAMPO_POR_CATEGORIA: Record<Categoria, "materialTeorico" | "processualTeorico"> = {
  material: "materialTeorico",
  processual: "processualTeorico",
};

const LABEL_POR_CATEGORIA: Record<Categoria, string> = {
  material: "Direito Material",
  processual: "Direito Processual",
};

const GestaoMaterialProcessual = () => {
  const disciplinasAtivas = useDisciplinasSegundaFaseAtivas();
  const [materia, setMateria] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("material");
  const [itens, setItens] = useState<ItemTeorico[]>([]);

  // Estados para novo item
  const [novoNome, setNovoNome] = useState("");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Estados para edição
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editArquivo, setEditArquivo] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para drag-and-drop (reordenar o acervo)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const draggedIdxRef = useRef<number | null>(null);

  const campo = CAMPO_POR_CATEGORIA[categoria];

  useEffect(() => {
    if (!materia) {
      setItens([]);
      return;
    }
    const unsub = onSnapshot(doc(db, "disciplinas", materia), (docSnap) => {
      setItens(docSnap.exists() ? docSnap.data()[campo] || [] : []);
    });
    return () => unsub();
  }, [materia, campo]);

  const handleAdicionar = async () => {
    if (!materia) return toast.error("Selecione uma disciplina primeiro.");
    if (!novoNome) return toast.error("Digite o título do conteúdo.");

    setIsUploading(true);
    try {
      let arquivoUrl = "";
      if (novoArquivo) {
        const safeName = novoArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `materiais_alunos/${materia}/${campo}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, novoArquivo);
        arquivoUrl = await getDownloadURL(snapshot.ref);
      }

      const novaLista = [...itens, { nome: novoNome, url_pdf: arquivoUrl }];
      const docRef = doc(db, "disciplinas", materia);

      try {
        await updateDoc(docRef, { [campo]: novaLista });
      } catch (error: unknown) {
        const codigo = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
        if (codigo === "not-found") await setDoc(docRef, { [campo]: novaLista }, { merge: true });
        else throw error;
      }

      toast.success(`Conteúdo de ${LABEL_POR_CATEGORIA[categoria]} adicionado com sucesso!`);
      setNovoNome("");
      setNovoArquivo(null);
      const fileInput = document.getElementById("materialProcessualFileUpload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (e) {
      toast.error("Erro ao cadastrar o conteúdo.");
    } finally {
      setIsUploading(false);
    }
  };

  const abrirEdicao = (idx: number, item: ItemTeorico) => {
    setEditandoIdx(idx);
    setEditNome(item.nome || "");
    setEditArquivo(null);
  };

  const handleSalvarEdicao = async () => {
    if (editandoIdx === null) return;
    if (!editNome) return toast.error("O título não pode ficar vazio.");

    setIsEditing(true);
    try {
      let arquivoUrl = itens[editandoIdx].url_pdf || "";

      if (editArquivo) {
        const safeName = editArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `materiais_alunos/${materia}/${campo}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, editArquivo);
        arquivoUrl = await getDownloadURL(snapshot.ref);
      }

      const novaLista = [...itens];
      novaLista[editandoIdx] = { ...novaLista[editandoIdx], nome: editNome, url_pdf: arquivoUrl };

      await updateDoc(doc(db, "disciplinas", materia), { [campo]: novaLista });
      toast.success("Conteúdo atualizado com sucesso!");
      setEditandoIdx(null);
    } catch (e) {
      toast.error("Erro ao atualizar o conteúdo.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleExcluir = async (index: number) => {
    if (!window.confirm("Deseja apagar este conteúdo da base de dados?")) return;
    try {
      const item = itens[index];
      if (item?.url_pdf) {
        const fileRef = ref(storage, item.url_pdf);
        await deleteObject(fileRef).catch((e) => console.log("Ignorado: Ficheiro não encontrado no storage."));
      }

      const novaLista = [...itens];
      novaLista.splice(index, 1);
      await updateDoc(doc(db, "disciplinas", materia), { [campo]: novaLista });
      toast.success("Conteúdo removido com sucesso.");

      if (editandoIdx === index) setEditandoIdx(null);
    } catch (e) {
      toast.error("Erro ao remover o conteúdo.");
    }
  };

  // --- DRAG AND DROP (HTML5) ---
  const handleDragStart = (idx: number) => {
    draggedIdxRef.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => setDragOverIdx(null);

  const handleDrop = async (e: React.DragEvent, alvoIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);

    const fromIdx = draggedIdxRef.current;
    draggedIdxRef.current = null;
    if (fromIdx === null || fromIdx === alvoIdx) return;

    const novaLista = [...itens];
    const [movido] = novaLista.splice(fromIdx, 1);
    novaLista.splice(alvoIdx, 0, movido);

    setItens(novaLista);
    try {
      await updateDoc(doc(db, "disciplinas", materia), { [campo]: novaLista });
    } catch (e) {
      toast.error("Erro ao salvar a nova ordem.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary italic">Direito Material e Processual</h2>
            <p className="text-sm text-muted-foreground">
              Publique conteúdo teórico (PDF) separado por Direito Material e Direito Processual da disciplina.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="bg-muted/10 border border-border rounded-xl p-3 flex items-center gap-3 sm:w-64">
            <Label className="text-[10px] uppercase font-black text-muted-foreground shrink-0">Disciplina</Label>
            <select className="w-full h-8 bg-transparent text-sm font-bold border-none focus:ring-0" value={materia} onChange={(e) => setMateria(e.target.value)}>
              <option value="">Selecione...</option>
              {disciplinasParaSelect(disciplinasAtivas, materia).map(({ codigo }) => (
                <option key={codigo} value={codigo}>{codigo}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategoria("material")}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 flex items-center gap-2 transition-colors ${
                categoria === "material" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
              }`}
            >
              <Landmark className="h-4 w-4" /> Direito Material
            </button>
            <button
              type="button"
              onClick={() => setCategoria("processual")}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 flex items-center gap-2 transition-colors ${
                categoria === "processual" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
              }`}
            >
              <Gavel className="h-4 w-4" /> Direito Processual
            </button>
          </div>
        </div>

        {materia ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col min-h-[500px] overflow-hidden">
              <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
                <h3 className="font-bold text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> Acervo de {LABEL_POR_CATEGORIA[categoria]} ({materia})
                </h3>
                <span className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded">{itens.length} ITENS</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-2 custom-scrollbar">
                {itens.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                    <FileText className="h-12 w-12 mb-2" />
                    <p className="font-bold">Nenhum conteúdo de {LABEL_POR_CATEGORIA[categoria]} para {materia}.</p>
                  </div>
                ) : (
                  itens.map((item, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`p-3 border rounded-lg flex justify-between items-center bg-background hover:border-accent transition-colors cursor-move ${
                        dragOverIdx === idx ? "border-accent ring-2 ring-accent/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="bg-muted p-2 rounded-lg">
                          <FileText className={`h-5 w-5 ${item.url_pdf ? "text-success" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">ID {idx}</span>
                          <h4 className="font-bold text-sm leading-tight text-primary">{item.nome}</h4>
                          {item.url_pdf ? (
                            <a href={item.url_pdf} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-success hover:underline">Ver PDF</a>
                          ) : (
                            <span className="text-[10px] font-bold text-warning">Sem arquivo anexado</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="border hover:bg-accent/10 hover:text-accent" onClick={() => abrirEdicao(idx, item)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleExcluir(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-muted/10 p-5 rounded-xl border border-border h-max sticky top-24">
              <Label className="font-bold flex items-center gap-2 mb-4 text-primary">
                <Plus className="h-4 w-4 text-accent" /> Adicionar a {LABEL_POR_CATEGORIA[categoria]}
              </Label>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground">Título do Conteúdo</Label>
                  <Input placeholder="Ex: Teoria do Crime — Resumo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground">PDF (Opcional)</Label>
                  <div className="relative w-full">
                    <input type="file" id="materialProcessualFileUpload" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setNovoArquivo(e.target.files?.[0] || null)} />
                    <div className={`h-12 border-2 border-dashed rounded-lg flex items-center px-3 text-sm transition-colors ${novoArquivo ? "bg-success/10 border-success/30 text-success font-bold" : "bg-background border-border text-muted-foreground hover:border-accent"}`}>
                      <UploadCloud className="h-4 w-4 mr-2" />
                      <span className="truncate">{novoArquivo ? novoArquivo.name : "Clique para anexar o PDF"}</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full h-12 mt-2" variant="hero" onClick={handleAdicionar} disabled={isUploading}>
                  {isUploading ? "Gravando no Firebase..." : "Guardar no Acervo"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/10 border-2 border-dashed rounded-2xl p-20 text-center">
            <Scale className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-bold">Selecione uma disciplina no topo para gerir o acervo teórico.</p>
          </div>
        )}
      </div>

      {editandoIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Pencil className="h-5 w-5 text-accent" /> Editar Conteúdo</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditandoIdx(null)}><X className="h-5 w-5" /></Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>

              <div className="space-y-2 bg-muted/10 p-4 rounded-lg border border-border">
                <Label className="block mb-2 text-xs">Substituir PDF (Opcional)</Label>
                {itens[editandoIdx]?.url_pdf && !editArquivo && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" /> Já possui PDF anexado.
                  </p>
                )}
                <div className="relative w-full">
                  <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setEditArquivo(e.target.files?.[0] || null)} />
                  <div className={`h-10 border rounded-md flex items-center px-3 text-sm ${editArquivo ? "bg-success/10 border-success/30 text-success font-bold" : "bg-background border-input text-muted-foreground"}`}>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    <span className="truncate">{editArquivo ? editArquivo.name : "Clique para anexar NOVO PDF"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => setEditandoIdx(null)}>Cancelar</Button>
              <Button variant="accent" onClick={handleSalvarEdicao} disabled={isEditing}>{isEditing ? "Salvando..." : "Salvar Alterações"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoMaterialProcessual;
