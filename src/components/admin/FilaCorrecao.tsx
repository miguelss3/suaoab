// src/components/admin/FilaCorrecao.tsx
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FileText, CheckCircle, MessageSquare, UploadCloud, Mic, Trash2, DownloadCloud, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const FilaCorrecao = () => {
  const [pecas, setPecas] = useState<any[]>([]);
  const [pecaParaCorrigir, setPecaParaCorrigir] = useState<any>(null);
  
  // Estados do Feedback
  const [feedback, setFeedback] = useState("");
  const [arquivoCorrigido, setArquivoCorrigido] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "historico_pecas"), orderBy("data_envio", "desc"));
    return onSnapshot(q, (snap) => {
      setPecas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // --- MOTOR DE SLA: Calcula 5 dias úteis ---
  const calcularDataLimite = (dataEnvioInfo: any) => {
    if (!dataEnvioInfo || !dataEnvioInfo.toDate) return null;
    
    const dataLimite = dataEnvioInfo.toDate();
    let diasUteisAdicionados = 0;

    // Adiciona 5 dias, pulando fim de semana (0 = Domingo, 6 = Sábado)
    while (diasUteisAdicionados < 5) {
      dataLimite.setDate(dataLimite.getDate() + 1);
      if (dataLimite.getDay() !== 0 && dataLimite.getDay() !== 6) {
        diasUteisAdicionados++;
      }
    }
    // Define o fim do dia limite para as 23:59:59
    dataLimite.setHours(23, 59, 59, 999);
    return dataLimite;
  };

  // --- Função para Eliminar Remessa ---
  const handleExcluirRemessa = async (id: string) => {
    if (window.confirm("Atenção, Professor: Tem certeza que deseja apagar esta remessa definitivamente? O aluno perderá o acesso a este histórico de correção.")) {
      try {
        await deleteDoc(doc(db, "historico_pecas", id));
        toast.success("Remessa e histórico apagados com sucesso.");
      } catch (error) {
        toast.error("Erro ao tentar excluir a remessa.");
      }
    }
  };

  const confirmarCorrecao = async () => {
    if (!pecaParaCorrigir) return;
    setIsUploading(true);

    try {
      let urlCorrigido = "";

      // 1. Faz o upload do arquivo escaneado/rasurado
      if (arquivoCorrigido) {
        const safeName = arquivoCorrigido.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const pastaAluno = pecaParaCorrigir.aluno_id || "geral";
        const fileRef = ref(storage, `pecas_corrigidas/${pastaAluno}/${Date.now()}_${safeName}`);
        
        const snapshot = await uploadBytes(fileRef, arquivoCorrigido);
        urlCorrigido = await getDownloadURL(snapshot.ref);
      }

      // 2. Atualiza o banco de dados
      await updateDoc(doc(db, "historico_pecas", pecaParaCorrigir.id), { 
        status: "Corrigido",
        observacao_professor: feedback || "Peça corrigida com sucesso.",
        url_arquivo_corrigido: urlCorrigido || null,
        data_correcao: serverTimestamp()
      });

      toast.success("Correção enviada ao aluno!");
      
      setPecaParaCorrigir(null); 
      setFeedback("");
      setArquivoCorrigido(null);
    } catch (e) { 
      toast.error("Erro ao enviar correção."); 
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
          <tr>
            <th className="px-6 py-4">Data de Envio</th>
            <th className="px-6 py-4">Aluno</th>
            <th className="px-6 py-4">Ficheiros (Original / Corrigido)</th>
            <th className="px-6 py-4">Status & Prazo</th>
            <th className="px-6 py-4 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {pecas.map(p => {
            const isPendente = p.status !== "Corrigido";
            const dataEnvioFormatada = p.data_envio?.toDate?.().toLocaleString('pt-BR');
            
            // Lógica de Prazo
            const dataLimite = calcularDataLimite(p.data_envio);
            const hoje = new Date();
            const estaAtrasado = isPendente && dataLimite && hoje > dataLimite;

            return (
              <tr key={p.id} className={`border-b border-border hover:bg-muted/5 transition-colors ${isPendente ? 'bg-accent/5' : ''}`}>
                <td className="px-6 py-4 text-xs text-muted-foreground">{dataEnvioFormatada}</td>
                <td className="px-6 py-4 font-bold text-primary">{p.aluno_nome}</td>
                
                {/* COLUNA DE FICHEIROS DUPLA */}
                <td className="px-6 py-4 space-y-2">
                  <a href={p.url_documento} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2 py-1 rounded w-max hover:bg-accent/20 transition-colors">
                    <DownloadCloud className="h-3 w-3" /> Original do Aluno
                  </a>
                  
                  {p.url_arquivo_corrigido && (
                    <a href={p.url_arquivo_corrigido} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2 py-1 rounded w-max hover:bg-success/20 transition-colors">
                      <CheckCircle className="h-3 w-3" /> Ficheiro Rasurado
                    </a>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider w-max ${isPendente ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                      {p.status || "Pendente"}
                    </span>
                    
                    {/* EXIBIÇÃO DA DATA LIMITE (SLA) */}
                    {isPendente && dataLimite && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${estaAtrasado ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {estaAtrasado ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        Limite: {dataLimite.toLocaleDateString('pt-BR')}
                      </span>
                    )}

                    {!isPendente && p.data_correcao && (
                      <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Devolvida
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {isPendente && (
                      <Button size="sm" variant="accent" onClick={() => setPecaParaCorrigir(p)}>
                        Corrigir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive border border-transparent hover:border-destructive/30 hover:bg-destructive/10" onClick={() => handleExcluirRemessa(p.id)} title="Excluir Remessa">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {pecas.length === 0 && (
            <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">Nenhuma peça na fila no momento.</td></tr>
          )}
        </tbody>
      </table>

      {/* MODAL DE RESPOSTA E UPLOAD */}
      {pecaParaCorrigir && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-primary/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-card border-2 border-accent/50 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col">
            
            <div className="border-b border-border pb-4 mb-4">
              <h3 className="text-xl font-bold text-primary italic flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent"/> Feedback de Correção
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Devolvendo a peça de: <strong className="text-primary">{pecaParaCorrigir.aluno_nome}</strong></p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              <div className="space-y-2">
                <Label className="font-bold text-primary">Observações Escritas</Label>
                <Textarea 
                  placeholder="Ex: Cuidado com a fundamentação do Art. 5º. A sua tese principal está excelente..." 
                  className="min-h-[150px]"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>

              <div className="bg-muted/10 p-4 rounded-xl border border-border space-y-3">
                <Label className="font-bold text-primary block">Anexar Peça Escaneada (Rasurada)</Label>
                <div className="relative w-full">
                  <input
                    type="file"
                    accept=".pdf, image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => setArquivoCorrigido(e.target.files?.[0] || null)}
                  />
                  <div className={`h-12 border-2 border-dashed rounded-lg flex items-center px-4 text-sm transition-colors ${arquivoCorrigido ? 'bg-success/10 border-success/40 text-success font-bold' : 'bg-background border-border text-muted-foreground hover:border-accent'}`}>
                    <UploadCloud className="h-5 w-5 mr-3"/>
                    <span className="truncate">{arquivoCorrigido ? arquivoCorrigido.name : "Clique aqui para enviar o PDF/Imagem corrigido"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/5 p-3 rounded-xl border border-dashed border-border flex items-center justify-between opacity-50 cursor-not-allowed" title="Funcionalidade em desenvolvimento">
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full"><Mic className="h-4 w-4" /></div>
                  <span className="text-xs font-bold">Gravar Áudio de Feedback</span>
                </div>
                <span className="text-[9px] uppercase font-black bg-muted px-2 py-1 rounded">Em breve</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <Button className="flex-1 h-12" variant="hero" onClick={confirmarCorrecao} disabled={isUploading}>
                {isUploading ? "A processar envio..." : "Finalizar e Enviar"}
              </Button>
              <Button variant="outline" className="h-12" onClick={() => { setPecaParaCorrigir(null); setArquivoCorrigido(null); }}>Cancelar</Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default FilaCorrecao;