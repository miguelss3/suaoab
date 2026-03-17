// src/components/admin/GestaoPecas.tsx
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Scale, Plus, Trash2, FileText, UploadCloud, FileSignature, Pencil, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const GestaoPecas = () => {
  const [materia, setMateria] = useState("");
  const [pecas, setPecas] = useState<any[]>([]);
  
  // Estados para nova peça
  const [novaPecaNome, setNovaPecaNome] = useState("");
  const [novaPecaArquivo, setNovaPecaArquivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Estados para Edição de Peça
  const [pecaEditandoIdx, setPecaEditandoIdx] = useState<number | null>(null);
  const [editPecaNome, setEditPecaNome] = useState("");
  const [editPecaArquivo, setEditPecaArquivo] = useState<File | null>(null);
  const [isEditingPeca, setIsEditingPeca] = useState(false);

  useEffect(() => {
    if (!materia) {
      setPecas([]);
      return;
    }
    const unsub = onSnapshot(doc(db, "disciplinas", materia), (docSnap) => {
      if (docSnap.exists()) {
        setPecas(docSnap.data().pecas || []);
      } else {
        setPecas([]); 
      }
    });
    return () => unsub();
  }, [materia]);

  const handleAdicionarPeca = async () => {
    if (!materia) return toast.error("Selecione uma disciplina primeiro.");
    if (!novaPecaNome) return toast.error("Digite o nome da peça.");
    
    setIsUploading(true);
    try {
      let arquivoUrl = "";
      if (novaPecaArquivo) {
        const safeName = novaPecaArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `materiais_alunos/${materia}/pecas_modelos/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, novaPecaArquivo);
        arquivoUrl = await getDownloadURL(snapshot.ref);
      }

      const novaLista = [...pecas, { nome: novaPecaNome, url_pdf: arquivoUrl }];
      const docRef = doc(db, "disciplinas", materia);
      
      try {
        await updateDoc(docRef, { pecas: novaLista });
      } catch (error: any) {
        if (error.code === 'not-found') await setDoc(docRef, { pecas: novaLista });
        else throw error;
      }

      toast.success("Nova Peça cadastrada com sucesso!");
      setNovaPecaNome(""); setNovaPecaArquivo(null);
      const fileInput = document.getElementById('pecaFileUpload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (e) { toast.error("Erro ao cadastrar peça."); } finally { setIsUploading(false); }
  };

  const abrirEdicaoPeca = (idx: number, peca: any) => {
    setPecaEditandoIdx(idx);
    setEditPecaNome(peca.nome || "");
    setEditPecaArquivo(null);
  };

  const handleSalvarEdicao = async () => {
    if (pecaEditandoIdx === null) return;
    if (!editPecaNome) return toast.error("O nome da peça não pode ficar vazio.");

    setIsEditingPeca(true);
    try {
      let arquivoUrl = pecas[pecaEditandoIdx].url_pdf || "";

      if (editPecaArquivo) {
        const safeName = editPecaArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `materiais_alunos/${materia}/pecas_modelos/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, editPecaArquivo);
        arquivoUrl = await getDownloadURL(snapshot.ref);
      }

      const novaLista = [...pecas];
      novaLista[pecaEditandoIdx] = {
        ...novaLista[pecaEditandoIdx],
        nome: editPecaNome,
        url_pdf: arquivoUrl
      };

      await updateDoc(doc(db, "disciplinas", materia), { pecas: novaLista });
      toast.success("Peça atualizada com sucesso!");
      setPecaEditandoIdx(null);
    } catch (e) {
      toast.error("Erro ao atualizar a peça.");
    } finally {
      setIsEditingPeca(false);
    }
  };

  const handleExcluirPeca = async (index: number) => {
    if (!window.confirm("Deseja apagar esta peça da base de dados?")) return;
    try {
      const novaLista = [...pecas];
      novaLista.splice(index, 1);
      await updateDoc(doc(db, "disciplinas", materia), { pecas: novaLista });
      toast.success("Peça removida.");
    } catch (e) { toast.error("Erro ao remover peça."); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 max-w-sm">
        <Scale className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <Label className="text-[10px] uppercase font-black text-muted-foreground">Disciplina Alvo</Label>
          <select className="w-full h-8 bg-transparent text-sm font-bold border-none focus:ring-0" value={materia} onChange={e => setMateria(e.target.value)}>
            <option value="">Selecione para carregar...</option>
            <option value="DADM">DADM</option>
            <option value="DPEN">DPEN</option>
            <option value="DTRI">DTRI</option>
          </select>
        </div>
      </div>

      {materia ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col min-h-[500px] overflow-hidden">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-accent" /> Acervo de Peças ({materia})
              </h3>
              <span className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded">{pecas.length} ITENS</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-2 custom-scrollbar">
              {pecas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                   <FileSignature className="h-12 w-12 mb-2" />
                   <p className="font-bold">Nenhuma peça cadastrada para {materia}.</p>
                </div>
              ) : (
                pecas.map((peca, idx) => (
                  <div key={idx} className="p-3 border rounded-lg flex justify-between items-center bg-background hover:border-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-lg">
                        <FileText className={`h-5 w-5 ${peca.url_pdf ? 'text-success' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">ID {idx}</span>
                        <h4 className="font-bold text-sm leading-tight text-primary">{peca.nome}</h4>
                        {peca.url_pdf ? (
                          <a href={peca.url_pdf} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-success hover:underline">Ver Esqueleto PDF</a>
                        ) : (
                          <span className="text-[10px] font-bold text-warning">Sem arquivo anexado</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="border hover:bg-accent/10 hover:text-accent" onClick={() => abrirEdicaoPeca(idx, peca)} title="Editar Peça">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleExcluirPeca(idx)}>
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
              <Plus className="h-4 w-4 text-accent"/> Adicionar Nova Peça
            </Label>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Nome Oficial da Peça</Label>
                <Input placeholder="Ex: Recurso em Sentido Estrito" value={novaPecaNome} onChange={e => setNovaPecaNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Esqueleto / PDF (Opcional)</Label>
                <div className="relative w-full">
                  <input type="file" id="pecaFileUpload" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setNovaPecaArquivo(e.target.files?.[0] || null)} />
                  <div className={`h-12 border-2 border-dashed rounded-lg flex items-center px-3 text-sm transition-colors ${novaPecaArquivo ? 'bg-success/10 border-success/30 text-success font-bold' : 'bg-background border-border text-muted-foreground hover:border-accent'}`}>
                    <UploadCloud className="h-4 w-4 mr-2"/> 
                    <span className="truncate">{novaPecaArquivo ? novaPecaArquivo.name : "Clique para anexar o modelo"}</span>
                  </div>
                </div>
              </div>
              <Button className="w-full h-12 mt-2" variant="hero" onClick={handleAdicionarPeca} disabled={isUploading}>
                {isUploading ? "Gravando no Firebase..." : "Guardar no Acervo"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/10 border-2 border-dashed rounded-2xl p-20 text-center">
          <Scale className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-bold">Selecione uma disciplina no topo para gerir o acervo de peças.</p>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {pecaEditandoIdx !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Pencil className="h-5 w-5 text-accent"/> Editar Peça</h3>
              <Button variant="ghost" size="sm" onClick={() => setPecaEditandoIdx(null)}><X className="h-5 w-5"/></Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Peça</Label>
                <Input value={editPecaNome} onChange={e => setEditPecaNome(e.target.value)} />
              </div>

              <div className="space-y-2 bg-muted/10 p-4 rounded-lg border border-border">
                <Label className="block mb-2 text-xs">Substituir Arquivo (Opcional)</Label>
                {pecas[pecaEditandoIdx]?.url_pdf && !editPecaArquivo && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success"/> Peça atual já possui PDF anexado.
                  </p>
                )}
                <div className="relative w-full">
                  <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setEditPecaArquivo(e.target.files?.[0] || null)} />
                  <div className={`h-10 border rounded-md flex items-center px-3 text-sm ${editPecaArquivo ? 'bg-success/10 border-success/30 text-success font-bold' : 'bg-background border-input text-muted-foreground'}`}>
                    <UploadCloud className="h-4 w-4 mr-2"/> 
                    <span className="truncate">{editPecaArquivo ? editPecaArquivo.name : "Clique para anexar NOVO PDF"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => setPecaEditandoIdx(null)}>Cancelar</Button>
              <Button variant="accent" onClick={handleSalvarEdicao} disabled={isEditingPeca}>{isEditingPeca ? "Salvando..." : "Salvar Alterações"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoPecas;