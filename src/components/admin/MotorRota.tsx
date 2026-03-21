// src/components/admin/MotorRota.tsx
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Wand2, X, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MotorRota = ({ aluno, onClose }: { aluno: any, onClose: () => void }) => {
  const [step, setStep] = useState<"config" | "preview">("config");
  const [tipoDataRota, setTipoDataRota] = useState("oficial");
  const [dataProva, setDataProva] = useState("");
  const [globalDataProva, setGlobalDataProva] = useState(""); 
  const [qtdMetasPersonalizadas, setQtdMetasPersonalizadas] = useState("10"); 
  const [previewMetas, setPreviewMetas] = useState<any[]>([]);
  const [isApplyingRota, setIsApplyingRota] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracoes", "ciclo_atual"));
        if (snap.exists() && snap.data().data_prova) {
          setGlobalDataProva(snap.data().data_prova);
        }
      } catch (error) { console.error("Erro ao buscar ciclo", error); }
    };
    fetchConfig();
  }, []);

  const calcularRotaPreview = () => {
    const alvo = tipoDataRota === "oficial" ? globalDataProva : dataProva;
    if (!alvo) return toast.error("Por favor, defina ou escolha uma data alvo.");
    const hoje = new Date(); const prova = new Date(alvo + "T12:00:00");
    const diffTime = prova.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return toast.error("A data limite deve ser no futuro.");

    const qtdMetasNovas = parseInt(qtdMetasPersonalizadas, 10);
    if (isNaN(qtdMetasNovas) || qtdMetasNovas <= 0) return toast.error("Quantidade inválida.");

    const metasAtuais = aluno.metas || [];
    const metasPreservadas = metasAtuais.filter((m: any, idx: number) => idx === 0 || m.status === 'concluida' || m.status === 'pulada');

    const ciclosMentor = [
      { titulo: "Identificação de Peça e Esqueleto Estrutural", texto: "O primeiro passo para o sucesso é não errar a peça!" },
      { titulo: "Leitura Dirigida e Expansão de Marcações", texto: "Vamos reforçar a base teórica." },
      { titulo: "Laboratório Prático: Redação Completa", texto: "É o momento de colocar a teoria no papel." },
      { titulo: "Bateria de Discursivas: Foco no Espelho", texto: "A banca pontua com base em palavras-chave." },
      { titulo: "Revisão Cirúrgica e Caderno de Erros", texto: "Aprender com os próprios erros é o caminho mais rápido." },
      { titulo: "Mapeamento de Jurisprudência e Súmulas", texto: "Muitas teses vencedoras e pontos fáceis estão nas Súmulas!" },
      { titulo: "Treino de Agilidade sob Pressão", texto: "O tempo é o seu maior adversário na 2ª Fase." },
      { titulo: "Estruturação de Preliminares e Mérito", texto: "Uma peça excelente começa nas preliminares." },
      { titulo: "Simulação de Resgate: Teses Subsidiárias", texto: "Treine a sua atenção aos detalhes." },
      { titulo: "Revisão Ativa e Fixação de Roteiros", texto: "Dia de consolidar o conhecimento!" }
    ];

    const metasGeradas = [];
    const intervaloMs = diffTime / qtdMetasNovas;

    for (let i = 0; i < qtdMetasNovas; i++) {
      let metaDate = new Date(hoje.getTime() + (intervaloMs * (i + 1)));
      if (metaDate > prova) metaDate = new Date(prova);
      const cicloAtual = ciclosMentor[i % ciclosMentor.length];
      let tituloAtividade = cicloAtual.titulo; let textoOrientacao = cicloAtual.texto;
      if (i === qtdMetasNovas - 1) {
         tituloAtividade = "Simulado Final e Preparação de Véspera";
         textoOrientacao = "O grande momento está a chegar! Faça este simulado nas mesmas condições da prova real.";
      }
      metasGeradas.push({
        atividade: tituloAtividade, orientacoes: textoOrientacao, link: "", arquivo_url: "", arquivo_nome: "", arquivo_file: null, 
        status: i < 2 ? "liberada" : "bloqueada", concluida: false, data_sugerida: metaDate.toISOString()
      });
    }
    setPreviewMetas([...metasPreservadas, ...metasGeradas]);
    setStep("preview");
  };

  const handleEditPreviewMeta = (index: number, campo: string, valor: any) => {
    const metasAtualizadas = [...previewMetas];
    metasAtualizadas[index] = { ...metasAtualizadas[index], [campo]: valor };
    setPreviewMetas(metasAtualizadas);
  };

  const confirmarRotaAdaptativa = async () => {
    setIsApplyingRota(true);
    try {
      const metasFinalizadas = [...previewMetas];
      for (let i = 0; i < metasFinalizadas.length; i++) {
        const m = metasFinalizadas[i];
        if (m.arquivo_file) {
          const safeName = m.arquivo_file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const fileRef = ref(storage, `materiais_alunos/${aluno.materia}/metas_anexos/${Date.now()}_${safeName}`);
          const snapshot = await uploadBytes(fileRef, m.arquivo_file);
          m.arquivo_url = await getDownloadURL(snapshot.ref);
          m.arquivo_nome = m.arquivo_file.name;
          delete m.arquivo_file; 
        }
      }
      await updateDoc(doc(db, "alunos", aluno.id), { metas: metasFinalizadas });
      toast.success("Rota Adaptativa Aplicada com sucesso!");
      onClose(); // Fecha o modal inteiro e volta pro dossiê
    } catch (e) { toast.error("Erro ao aplicar rota."); } finally { setIsApplyingRota(false); }
  };

  if (step === "config") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
        <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
          <h3 className="text-xl font-display font-bold text-primary mb-6 flex items-center gap-2"><Wand2 className="h-5 w-5 text-accent"/> Gerar Rota</h3>
          <div className="space-y-4">
            <div className={`p-4 border-2 rounded-xl cursor-pointer flex items-start gap-3 transition-colors ${tipoDataRota === "oficial" ? "border-accent bg-accent/5" : "border-border"}`} onClick={() => setTipoDataRota("oficial")}>
              <input type="radio" checked={tipoDataRota === "oficial"} onChange={() => {}} className="mt-1 accent-accent" />
              <div>
                <h4 className="font-bold text-sm text-primary">Data Oficial do Exame</h4>
                <p className="text-xs text-muted-foreground mt-1">{globalDataProva ? `Exame: ${new Date(globalDataProva + "T12:00:00").toLocaleDateString('pt-BR')}` : "Nenhuma data configurada"}</p>
              </div>
            </div>
            <div className={`p-4 border-2 rounded-xl cursor-pointer flex items-start gap-3 transition-colors ${tipoDataRota === "personalizada" ? "border-accent bg-accent/5" : "border-border"}`} onClick={() => setTipoDataRota("personalizada")}>
              <input type="radio" checked={tipoDataRota === "personalizada"} onChange={() => {}} className="mt-1 accent-accent" />
              <div className="w-full">
                <h4 className="font-bold text-sm text-primary mb-2">Data Personalizada</h4>
                {tipoDataRota === "personalizada" && <Input type="date" className="mt-2" value={dataProva} onChange={e => setDataProva(e.target.value)} />}
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 border-2 border-border rounded-xl bg-muted/10">
            <h4 className="font-bold text-sm text-primary mb-1">Volume de Metas</h4>
            <Input type="number" min="1" max="50" value={qtdMetasPersonalizadas} onChange={e => setQtdMetasPersonalizadas(e.target.value)} className="font-bold text-lg h-12" />
          </div>
          <Button variant="hero" className="w-full mt-8 h-12" onClick={calcularRotaPreview}>Avançar para Edição</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
         <div className="p-6 border-b bg-muted/10 flex justify-between items-center">
           <div><h3 className="text-xl font-bold text-primary">Edição de Rota (Pré-visualização)</h3></div>
           <button onClick={onClose} className="text-muted-foreground hover:text-foreground" disabled={isApplyingRota}><X className="h-5 w-5"/></button>
         </div>
         <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {(() => {
               let previewCounter = 1;
               return previewMetas.map((m, i) => {
                  const isBoasVindas = m.atividade?.includes("Boas-Vindas");
                  const currentPreviewNum = isBoasVindas ? 0 : previewCounter++;
                  if (m.status === 'concluida' || isBoasVindas) {
                     return (
                        <div key={i} className="p-4 rounded-xl border-l-4 border-l-success border-border bg-success/5 opacity-60 flex justify-between items-center">
                           <div><span className="text-xs font-black uppercase text-success tracking-wider mb-1 block">Meta {currentPreviewNum} (Concluída)</span><h4 className="font-bold text-foreground text-sm">{m.atividade}</h4></div>
                        </div>
                     );
                  }
                  return (
                     <div key={i} className="p-5 rounded-xl border-2 border-border bg-background shadow-sm space-y-4">
                        <div className="flex justify-between items-center mb-1"><span className="text-xs font-black uppercase text-accent tracking-wider bg-accent/10 px-2 py-1 rounded">Meta {currentPreviewNum}</span></div>
                        <div className="grid md:grid-cols-[1fr_150px] gap-4">
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground">Título</Label><Input value={m.atividade} onChange={(e) => handleEditPreviewMeta(i, 'atividade', e.target.value)} className="font-bold text-primary" /></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground">Prazo</Label>
                            <Input type="date" value={m.data_sugerida ? String(m.data_sugerida).split('T') : ''} onChange={(e) => { const val = e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : ""; handleEditPreviewMeta(i, 'data_sugerida', val); }} />
                          </div>
                        </div>
                        <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground">Orientações</Label><textarea value={m.orientacoes} onChange={(e) => handleEditPreviewMeta(i, 'orientacoes', e.target.value)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed" /></div>
                        <div className="grid md:grid-cols-2 gap-4 mt-2 p-3 bg-muted/10 rounded-lg border border-dashed border-border">
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground">Link</Label><Input value={m.link || ""} onChange={(e) => handleEditPreviewMeta(i, 'link', e.target.value)} className="h-9 text-xs" /></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground">Anexo</Label>
                            <div className="relative w-full"><input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleEditPreviewMeta(i, 'arquivo_file', e.target.files?.[0] || null)} />
                              <div className={`h-9 border rounded-md flex items-center px-3 text-xs ${m.arquivo_file || m.arquivo_url ? 'bg-success/10 border-success/30 text-success font-bold' : 'bg-background border-input text-muted-foreground'}`}><UploadCloud className="h-4 w-4 mr-2"/><span className="truncate">{m.arquivo_file ? m.arquivo_file.name : (m.arquivo_nome || "Anexar PDF")}</span></div>
                            </div>
                          </div>
                        </div>
                     </div>
                  );
               });
            })()}
         </div>
         <div className="p-6 border-t bg-background flex gap-4">
           <Button variant="outline" className="flex-1 h-12" onClick={onClose} disabled={isApplyingRota}>Cancelar</Button>
           <Button variant="accent" className="flex-1 h-12 text-lg" onClick={confirmarRotaAdaptativa} disabled={isApplyingRota}><Wand2 className={`h-5 w-5 mr-2 ${isApplyingRota ? 'animate-spin' : ''}`} /> {isApplyingRota ? "Processando..." : "Gravar Rota"}</Button>
         </div>
      </div>
    </div>
  );
};

export default MotorRota;