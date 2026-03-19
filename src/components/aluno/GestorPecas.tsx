// src/components/aluno/GestorPecas.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mic, Trash2, X } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

export const GestorPecas = ({ perfilAluno, historico }: any) => {
  const [uploading, setUploading] = useState(false);
  const [feedbackSelecionado, setFeedbackSelecionado] = useState<any>(null);

  const handleUploadPeca = async () => {
    if (historico.length >= 5) return toast.error("Limite atingido. Você já enviou suas 5 peças.");
    
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file || !perfilAluno) return toast.error("Selecione um arquivo primeiro.");
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `pecas_alunos/${perfilAluno.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, "historico_pecas"), {
        aluno_id: perfilAluno.uid,
        aluno_nome: perfilAluno.nome || "Aluno",
        nome_documento: file.name,
        url_documento: downloadURL,
        status: "Pendente",
        data_envio: serverTimestamp()
      });
      toast.success("Peça enviada para correção!");
      fileInput.value = "";
    } catch (error) { 
      toast.error("Erro no upload."); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleExcluirPeca = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este envio?")) return;
    try {
      await deleteDoc(doc(db, "historico_pecas", id));
      toast.success("Envio apagado com sucesso.");
    } catch (error) { toast.error("Erro ao apagar a peça."); }
  };

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-xl p-6 shadow-sm border border-dashed border-accent/50 bg-accent/5">
        <h3 className="text-lg font-bold text-primary italic mb-4">Upload de Peça</h3>
        <input type="file" id="fileUpload" className="block w-full text-xs mb-4 cursor-pointer" disabled={historico.length >= 5} />
        <Button className="w-full" onClick={handleUploadPeca} disabled={uploading || historico.length >= 5}>
          {uploading ? "Aguarde..." : historico.length >= 5 ? "Limite Atingido" : "Submeter Peça"}
        </Button>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-primary italic">Histórico de Envios</h3>
          <span className="text-xs font-bold bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/30">
            {historico.length} de 5 peças
          </span>
        </div>
        <div className="space-y-4">
          {historico.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma peça submetida.</p> : historico.map((h: any, i: number) => (
            <div key={i} className="border-b pb-4 border-border last:border-0 last:pb-0">
              <div className="text-[11px] flex justify-between items-center mb-2">
                <span className="font-bold truncate max-w-[120px]" title={h.nome_documento}>{h.nome_documento}</span>
                <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase ${h.status === "Corrigido" ? "bg-success/20 text-success" : "bg-accent/20 text-accent"}`}>
                  {h.status || "Pendente"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {h.status === "Corrigido" && h.observacao_professor ? (
                  <>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 border-accent/30 text-accent hover:bg-accent/10" onClick={() => setFeedbackSelecionado(h)}>
                      <MessageSquare className="h-3 w-3 mr-1" /> Feedback
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 opacity-50 cursor-not-allowed" title="Em breve: Áudio do Mentor">
                      <Mic className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:bg-destructive/10" onClick={() => handleExcluirPeca(h.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Apagar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE FEEDBACK (AVALIAÇÃO DO MENTOR) */}
      {feedbackSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setFeedbackSelecionado(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-primary leading-tight">Avaliação do Mentor</h3>
            <p className="text-xs text-muted-foreground mb-4">Peça: {feedbackSelecionado.nome_documento}</p>
            <div className="bg-muted/20 border border-border p-4 rounded-xl">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{feedbackSelecionado.observacao_professor}</p>
            </div>
            <Button className="w-full mt-6" variant="hero" onClick={() => setFeedbackSelecionado(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
};