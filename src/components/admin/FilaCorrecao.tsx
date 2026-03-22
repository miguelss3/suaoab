// src/components/admin/FilaCorrecao.tsx
import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FileText, CheckCircle, MessageSquare, UploadCloud, Mic, Trash2, DownloadCloud, AlertCircle, Clock, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const FilaCorrecao = () => {
  const [pecas, setPecas] = useState<any[]>([]);
  const [pecaParaCorrigir, setPecaParaCorrigir] = useState<any>(null);
  
  const [feedback, setFeedback] = useState("");
  const [arquivoCorrigido, setArquivoCorrigido] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const q = query(collection(db, "historico_pecas"), orderBy("data_envio", "desc"));
    return onSnapshot(q, (snap) => {
      setPecas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const calcularDataLimite = (dataEnvioInfo: any) => {
    if (!dataEnvioInfo || !dataEnvioInfo.toDate) return null;
    
    const dataLimite = dataEnvioInfo.toDate();
    let diasUteisAdicionados = 0;

    while (diasUteisAdicionados < 5) {
      dataLimite.setDate(dataLimite.getDate() + 1);
      if (dataLimite.getDay() !== 0 && dataLimite.getDay() !== 6) {
        diasUteisAdicionados++;
      }
    }
    dataLimite.setHours(23, 59, 59, 999);
    return dataLimite;
  };

  const handleExcluirRemessa = async (peca: any) => {
    if (window.confirm("Atenção, Professor: Tem a certeza que deseja apagar esta remessa definitivamente? Os PDFs e o Áudio associados também serão destruídos do servidor.")) {
      try {
        if (peca.url_documento) {
          const fileRefOriginal = ref(storage, peca.url_documento);
          await deleteObject(fileRefOriginal).catch(e => console.log("Ficheiro original não encontrado."));
        }

        if (peca.url_arquivo_corrigido) {
          const fileRefCorrigido = ref(storage, peca.url_arquivo_corrigido);
          await deleteObject(fileRefCorrigido).catch(e => console.log("Ficheiro corrigido não encontrado."));
        }

        if (peca.url_audio_feedback) {
          const fileRefAudio = ref(storage, peca.url_audio_feedback);
          await deleteObject(fileRefAudio).catch(e => console.log("Áudio não encontrado."));
        }

        await deleteDoc(doc(db, "historico_pecas", peca.id));
        toast.success("Remessa e todos os ficheiros apagados com sucesso.");
      } catch (error) {
        toast.error("Erro ao tentar excluir a remessa.");
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPlaybackUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Erro ao aceder ao microfone. Verifique se concedeu as permissões no navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const discardAudio = () => {
    setAudioBlob(null);
    setAudioPlaybackUrl(null);
    audioChunksRef.current = [];
  };

  const limparModal = () => {
    setPecaParaCorrigir(null);
    setFeedback("");
    setArquivoCorrigido(null);
    discardAudio();
    if (isRecording) stopRecording();
  };

  const confirmarCorrecao = async () => {
    if (!pecaParaCorrigir) return;
    setIsUploading(true);

    try {
      let urlCorrigido = "";
      let urlAudio = "";
      const pastaAluno = pecaParaCorrigir.aluno_id || "geral";

      if (arquivoCorrigido) {
        const safeName = arquivoCorrigido.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileRef = ref(storage, `pecas_corrigidas/${pastaAluno}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, arquivoCorrigido);
        urlCorrigido = await getDownloadURL(snapshot.ref);
      }

      if (audioBlob) {
        const audioRef = ref(storage, `pecas_corrigidas/${pastaAluno}/audiofeedback_${Date.now()}.webm`);
        const snapshotAudio = await uploadBytes(audioRef, audioBlob);
        urlAudio = await getDownloadURL(snapshotAudio.ref);
      }

      await updateDoc(doc(db, "historico_pecas", pecaParaCorrigir.id), { 
        status: "Corrigido",
        observacao_professor: feedback || "Peça corrigida com sucesso.",
        url_arquivo_corrigido: urlCorrigido || null,
        url_audio_feedback: urlAudio || null,
        data_correcao: serverTimestamp()
      });

      toast.success("Correção salva no banco de dados!");

      let telefoneFinal = "";
      try {
        const alunoSnap = await getDoc(doc(db, "alunos", pecaParaCorrigir.aluno_id));
        if (alunoSnap.exists() && alunoSnap.data().whatsapp) {
           const foneLimpo = alunoSnap.data().whatsapp.replace(/\D/g, '');
           telefoneFinal = foneLimpo.startsWith("55") ? foneLimpo : `55${foneLimpo}`;
        }
      } catch (err) {
        console.error("Erro ao buscar telefone do aluno", err);
      }

      if (telefoneFinal) {
         const primeiroNome = pecaParaCorrigir.aluno_nome.split(' ');
         const mensagem = `Olá, ${primeiroNome}! ⚖️\n\nPassando para avisar que acabei de finalizar a correção da sua peça (*${pecaParaCorrigir.nome_documento}*).\n\nAcesse a sua plataforma para ver as observações escritas e o feedback em áudio.\nVamos juntos rumo à aprovação!`;
         
         const zapUrl = `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(mensagem)}`;
         window.open(zapUrl, "_blank");
      } else {
         toast.info("Correção processada, mas o aluno não possui WhatsApp cadastrado.");
      }

      limparModal();

    } catch (e) { 
      toast.error("Erro ao enviar correção."); 
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="w-full">
        {/* Retirado o min-w forçado para o telemóvel adaptar a 100% */}
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
            <tr>
              <th className="hidden sm:table-cell px-6 py-4">Data de Envio</th>
              <th className="px-4 sm:px-6 py-4">Aluno / Detalhes</th>
              <th className="hidden sm:table-cell px-6 py-4">Ficheiros</th>
              <th className="hidden sm:table-cell px-6 py-4">Status & Prazo</th>
              <th className="hidden sm:table-cell px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {pecas.map(p => {
              const isPendente = p.status !== "Corrigido" && p.status !== "Corrigida";
              const dataEnvioFormatada = p.data_envio?.toDate?.().toLocaleString('pt-BR');
              
              const dataLimite = calcularDataLimite(p.data_envio);
              const hoje = new Date();
              const estaAtrasado = isPendente && dataLimite && hoje > dataLimite;

              return (
                <tr key={p.id} className={`border-b border-border hover:bg-muted/5 transition-colors ${isPendente ? 'bg-accent/5' : ''}`}>
                  
                  {/* COLUNA 1: Data de Envio (Apenas PC) */}
                  <td className="hidden sm:table-cell px-6 py-4 text-xs text-muted-foreground align-top">
                    {dataEnvioFormatada}
                  </td>
                  
                  {/* COLUNA 2: Aluno (Visível no Celular e no PC) */}
                  <td className="px-4 sm:px-6 py-4 align-top">
                    <div className="font-bold text-primary">{p.aluno_nome}</div>
                    <div className="text-[10px] text-muted-foreground sm:hidden mb-2">{p.nome_documento}</div>
                    
                    {/* ESTRUTURA MOBILE: Exibe tudo aqui num formato de "Cartão" */}
                    <div className="sm:hidden flex flex-col gap-3 mt-3 w-full">
                      
                      {/* Status e Data */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium">Enviado: <br/>{dataEnvioFormatada}</span>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isPendente ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                          {p.status || "Pendente"}
                        </span>
                      </div>

                      {/* Prazo */}
                      {isPendente && dataLimite && (
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${estaAtrasado ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {estaAtrasado ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          Prazo: {dataLimite.toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {!isPendente && p.data_correcao && (
                        <span className="text-[10px] font-medium text-success flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Devolvida
                        </span>
                      )}

                      {/* Ficheiros Mobile */}
                      <div className="flex flex-col gap-2 bg-muted/10 p-3 rounded-lg border border-border mt-1">
                        <a href={p.url_documento} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent/80 transition-colors">
                          <DownloadCloud className="h-4 w-4" /> Peça do Aluno
                        </a>
                        
                        {p.url_arquivo_corrigido && (
                          <a href={p.url_arquivo_corrigido} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-success hover:text-success/80 transition-colors">
                            <CheckCircle className="h-4 w-4" /> PDF Corrigido
                          </a>
                        )}
                        
                        {!isPendente && p.url_audio_feedback && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-primary mt-1">
                            <Mic className="h-4 w-4" /> Áudio Disponível
                          </span>
                        )}
                      </div>

                      {/* Botões Mobile */}
                      <div className="flex items-center gap-2 mt-2 w-full">
                        {isPendente && (
                          <Button size="sm" variant="accent" className="h-10 text-[12px] font-bold flex-1" onClick={() => setPecaParaCorrigir(p)}>
                            Corrigir
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-10 px-4 text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive/10" onClick={() => handleExcluirRemessa(p)} title="Excluir Remessa">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </td>
                  
                  {/* COLUNA 3: Ficheiros (Apenas PC) */}
                  <td className="hidden sm:table-cell px-6 py-4 space-y-2 align-top">
                    <span className="block font-bold text-primary text-xs mb-1 truncate max-w-[150px]" title={p.nome_documento}>{p.nome_documento}</span>
                    <a href={p.url_documento} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2 py-1 rounded w-max hover:bg-accent/20 transition-colors">
                      <DownloadCloud className="h-3 w-3" /> Original
                    </a>
                    
                    {p.url_arquivo_corrigido && (
                      <a href={p.url_arquivo_corrigido} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2 py-1 rounded w-max hover:bg-success/20 transition-colors">
                        <CheckCircle className="h-3 w-3" /> Rasurado
                      </a>
                    )}
                    
                    {!isPendente && p.url_audio_feedback && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded w-max">
                        <Mic className="h-3 w-3" /> Áudio
                      </span>
                    )}
                  </td>

                  {/* COLUNA 4: Status + Prazo (Apenas PC) */}
                  <td className="hidden sm:table-cell px-6 py-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider w-max ${isPendente ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                        {p.status || "Pendente"}
                      </span>
                      
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
                  
                  {/* COLUNA 5: Ação (Apenas PC) */}
                  <td className="hidden sm:table-cell px-6 py-4 text-right align-top">
                    <div className="flex justify-end gap-2">
                      {isPendente && (
                        <Button size="sm" variant="accent" onClick={() => setPecaParaCorrigir(p)}>
                          Corrigir
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive border border-transparent hover:border-destructive/30 hover:bg-destructive/10" onClick={() => handleExcluirRemessa(p)} title="Excluir Remessa">
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
      </div>

      {pecaParaCorrigir && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-primary/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-card border-2 border-accent/50 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="border-b border-border pb-4 mb-4 shrink-0">
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
                  className="min-h-[120px]"
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
                    <UploadCloud className="h-5 w-5 mr-3 shrink-0"/>
                    <span className="truncate">{arquivoCorrigido ? arquivoCorrigido.name : "Clique para anexar o PDF"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/10 p-4 rounded-xl border border-border space-y-3">
                <Label className="font-bold text-primary block">Mensagem de Voz (Opcional)</Label>
                
                {!audioPlaybackUrl ? (
                  <div className="flex items-center gap-3">
                    {isRecording ? (
                      <Button variant="destructive" onClick={stopRecording} className="animate-pulse w-full font-bold">
                        <Square className="h-4 w-4 mr-2 fill-current" /> Terminar Gravação
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={startRecording} className="w-full border-accent text-accent hover:bg-accent/10 font-bold">
                        <Mic className="h-4 w-4 mr-2" /> Gravar Feedback em Áudio
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-background p-2 rounded-lg border border-border">
                    <audio src={audioPlaybackUrl} controls className="h-10 w-full outline-none" />
                    <Button variant="ghost" size="sm" onClick={discardAudio} className="text-destructive hover:bg-destructive/10 px-2 shrink-0" title="Descartar Áudio">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-border shrink-0">
              <Button className="flex-1 h-12" variant="hero" onClick={confirmarCorrecao} disabled={isUploading}>
                {isUploading ? "A processar envio..." : "Finalizar e Enviar"}
              </Button>
              <Button variant="outline" className="h-12" onClick={limparModal} disabled={isUploading}>Cancelar</Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default FilaCorrecao;