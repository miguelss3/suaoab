// src/components/admin/ModalEdicaoMeta.tsx
import { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Pencil, X, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ModalEdicaoMeta = ({ aluno, metaIndex, onClose }: { aluno: any, metaIndex: number, onClose: () => void }) => {
  const meta = aluno.metas[metaIndex];
  const [editMetaTitulo, setEditMetaTitulo] = useState(meta.atividade || "");
  const [editMetaDescricao, setEditMetaDescricao] = useState(meta.orientacoes || "");
  const [editMetaLink, setEditMetaLink] = useState(meta.link || "");
  const [editMetaArquivo, setEditMetaArquivo] = useState<File | null>(null);
  const [editMetaPrazo, setEditMetaPrazo] = useState(meta.data_sugerida ? String(meta.data_sugerida).split('T') : "");
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  const handleSalvarEdicao = async () => {
    if (!editMetaTitulo || !editMetaDescricao) return toast.error("O título e orientações não podem ficar vazios.");
    setIsEditingMeta(true);
    try {
        let arquivoUrl = meta.arquivo_url || "";
        let arquivoNome = meta.arquivo_nome || "";
        if (editMetaArquivo) {
            const safeName = editMetaArquivo.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const fileRef = ref(storage, `materiais_alunos/${aluno.materia}/metas_anexos/${Date.now()}_${safeName}`);
            const snapshot = await uploadBytes(fileRef, editMetaArquivo);
            arquivoUrl = await getDownloadURL(snapshot.ref);
            arquivoNome = editMetaArquivo.name;
        }
        const novasMetas = [...aluno.metas];
        novasMetas[metaIndex] = {
            ...novasMetas[metaIndex], atividade: editMetaTitulo, orientacoes: editMetaDescricao, link: editMetaLink,
            arquivo_url: arquivoUrl, arquivo_nome: arquivoNome,
            data_sugerida: editMetaPrazo ? new Date(editMetaPrazo + "T12:00:00").toISOString() : novasMetas[metaIndex].data_sugerida
        };
        await updateDoc(doc(db, "alunos", aluno.id), { metas: novasMetas });
        toast.success("Meta atualizada!");
        onClose();
    } catch (e) { toast.error("Erro ao atualizar a meta."); } finally { setIsEditingMeta(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Pencil className="h-5 w-5 text-accent"/> Editar Meta</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-5 w-5"/></Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_150px] gap-4">
            <div className="space-y-1"><Label className="text-xs">Título</Label><Input value={editMetaTitulo} onChange={e => setEditMetaTitulo(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Prazo Limite</Label><Input type="date" value={editMetaPrazo} onChange={e => setEditMetaPrazo(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Orientações</Label><textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editMetaDescricao} onChange={e => setEditMetaDescricao(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Link (Opcional)</Label><Input value={editMetaLink} onChange={e => setEditMetaLink(e.target.value)} /></div>
          <div className="space-y-2 bg-muted/10 p-4 rounded-lg border border-border">
            <Label className="block mb-2 text-xs">Anexo (Opcional)</Label>
            <div className="relative w-full">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setEditMetaArquivo(e.target.files?.[0] || null)} />
              <div className={`h-10 border rounded-md flex items-center px-3 text-sm ${editMetaArquivo ? 'bg-success/10 text-success' : 'bg-background text-muted-foreground'}`}>
                <UploadCloud className="h-4 w-4 mr-2"/> <span className="truncate">{editMetaArquivo ? editMetaArquivo.name : "Substituir anexo existente"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" onClick={handleSalvarEdicao} disabled={isEditingMeta}>{isEditingMeta ? "Salvando..." : "Salvar Alterações"}</Button>
        </div>
      </div>
    </div>
  );
};

export default ModalEdicaoMeta;