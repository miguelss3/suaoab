// src/components/aluno/GestorPecas.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, X, FileText, UploadCloud, CheckCircle2, Mic } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

export const GestorPecas = ({ perfilAluno, historico = [] }: any) => {
  const [uploading, setUploading] = useState(false);
  const [feedbackSelecionado, setFeedbackSelecionado] = useState<any>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setArquivoSelecionado(null);
      return;
    }
    
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      e.target.value = ""; 
      setArquivoSelecionado(null);
      return toast.error("Operação Bloqueada: Apenas ficheiros em formato PDF são aceites.");
    }
    
    setArquivoSelecionado(file);
  };

  const handleUploadPeca = async () => {
    if (historico.length >= 5) return toast.error("Limite atingido. Já enviou as suas 5 peças.");
    if (!arquivoSelecionado || !perfilAluno) return toast.error("Selecione um ficheiro PDF primeiro.");
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `pecas_alunos/${perfilAluno.uid}/${Date.now()}_${arquivoSelecionado.name}`);
      const snapshot = await uploadBytes(storageRef, arquivoSelecionado);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await addDoc(collection(db, "historico_pecas"), {
        aluno_id: perfilAluno.uid,
        aluno_nome: perfilAluno.nome,
        aluno_materia: perfilAluno.materia,
        nome_documento: arquivoSelecionado.name,
        url_documento: downloadURL,
        status: "Pendente",
        data_envio: serverTimestamp()
      });
      
      toast.success("Peça enviada com sucesso! Aguarde a correção.");
      
      setArquivoSelecionado(null);
      const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
    } catch (error) {
      toast.error("Erro ao enviar ficheiro. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleExcluirPeca = async (id: string) => {
    if (confirm("Tem a certeza que deseja cancelar o envio desta peça?")) {
      await deleteDoc(doc(db, "historico_pecas", id));
      toast.success("Envio cancelado.");
    }
  };

  const safeHistorico = historico || [];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h3 className="text-lg font-bold text-primary mb-1 italic">Envio de Peças Práticas</h3>
        <p className="text-sm text-muted-foreground mb-6">Tem direito a 5 correções artesanais. ({5 - safeHistorico.length} restantes)</p>
        
        {safeHistorico.length < 5 ? (
          <div className="flex flex-col gap-3 w-full">
            <div className="w-full relative">
              <input 
                type="file" 
                id="fileUpload" 
                accept=".pdf,application/pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={handleFileChange}
              />
              <div className={`h-12 w-full border-2 ${arquivoSelecionado ? 'border-solid border-success bg-success/10' : 'border-dashed border-border bg-background hover:bg-muted/10'} rounded-lg flex items-center justify-center px-4 transition-colors overflow-hidden`}>
                {arquivoSelecionado ? (
                  <CheckCircle2 className="h-5 w-5 mr-2 shrink-0 text-success" />
                ) : (
                  <UploadCloud className="h-5 w-5 mr-2 shrink-0 text-muted-foreground" />
                )}
                <span className={`text-sm font-bold truncate ${arquivoSelecionado ? 'text-success' : 'text-muted-foreground'}`}>
                  {arquivoSelecionado ? arquivoSelecionado.name : "1. Clique para Anexar PDF"}
                </span>
              </div>
            </div>

            <Button 
              variant="hero" 
              className="w-full h-12 text-sm font-bold" 
              onClick={handleUploadPeca} 
              disabled={uploading || !arquivoSelecionado}
            >
              {uploading ? "A ENVIAR..." : "2. ENVIAR PARA CORREÇÃO"}
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-accent/10 text-accent font-bold rounded-xl text-center border border-accent/20">
            Atingiu o limite máximo de 5 correções deste ciclo.
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 bg-muted/10 border-b border-border font-bold text-primary italic">Histórico de Correções</div>
        <div className="divide-y divide-border">
          {safeHistorico.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm italic">Nenhuma peça enviada ainda.</p>}
          {safeHistorico.map((h: any) => (
            // Layout da linha do histórico: flex-col no mobile, sm:flex-row no desktop
            <div key={h.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-muted/5 transition-colors">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className={`h-8 w-8 mt-1 shrink-0 ${h.status === "Corrigido" || h.status === "Corrigida" ? "text-success" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm block text-primary truncate">{h.nome_documento}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${h.status === "Corrigido" || h.status === "Corrigida" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>
                      {h.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{h.data_envio?.toDate?.().toLocaleDateString('pt-BR')}</span>
                  </div>
                  {/* Indicador visual de áudio gravado */}
                  {h.url_audio_feedback && (
                    <div className="mt-2">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-1 rounded w-max">
                        <Mic className="h-3 w-3" /> Feedback em Áudio Disponível
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* ESTRUTURA DE BOTÕES ATUALIZADA (Alinhamento Vertical Blindado) */}
              {/* Changed from flex-wrap to flex-col and added w-full classes */}
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                {h.status === "Corrigido" || h.status === "Corrigida" ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 text-xs font-bold border-success text-success hover:bg-success/10 w-full" 
                      onClick={() => window.open(h.url_arquivo_corrigido || h.url_corrigida, "_blank")}
                    >
                      Ver Correção
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-9 text-xs font-bold bg-accent hover:bg-accent/90 w-full" 
                      onClick={() => setFeedbackSelecionado(h)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" /> Feedback
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] px-2 text-destructive hover:bg-destructive/10 w-full sm:w-auto" 
                    onClick={() => handleExcluirPeca(h.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Apagar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE AVALIAÇÃO COM SUPORTE A ÁUDIO */}
      {feedbackSelecionado && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setFeedbackSelecionado(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-primary leading-tight">Avaliação do Mentor</h3>
            <p className="text-xs text-muted-foreground mb-4">Peça: {feedbackSelecionado.nome_documento}</p>
            
            <div className="bg-muted/20 border border-border p-4 rounded-xl space-y-4">
              
              {/* Reprodutor de Áudio (só aparece se existir) */}
              {feedbackSelecionado.url_audio_feedback && (
                <div className="space-y-2 pb-4 border-b border-border/50">
                  <span className="text-xs font-black text-accent uppercase tracking-widest flex items-center gap-1">
                    <Mic className="h-3 w-3" /> Mensagem de Voz
                  </span>
                  <audio 
                    src={feedbackSelecionado.url_audio_feedback} 
                    controls 
                    className="w-full h-10 outline-none" 
                  />
                </div>
              )}

              {/* Observações Escritas */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Observações Escritas</span>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {feedbackSelecionado.observacao_professor || "Sem observações adicionais."}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};