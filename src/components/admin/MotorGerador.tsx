// src/components/admin/MotorGerador.tsx
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, onSnapshot, serverTimestamp, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Plus, Trash2, FileText, Cog, Target, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

const carregarImagem = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const MotorGerador = () => {
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [buildTipo, setBuildTipo] = useState("Caderno");
  const [buildMateria, setBuildMateria] = useState("");
  const [buildTitulo, setBuildTitulo] = useState("");
  const [buildQuestoes, setBuildQuestoes] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "banco_questoes"), (snap) => {
      setQuestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleGerarPDF = async () => {
    if (!buildMateria || !buildTitulo || buildQuestoes.length === 0) {
      toast.error("Configure o título, matéria e selecione as questões."); return;
    }
    setIsGenerating(true);
    
    try {
      let imgOab: HTMLImageElement | null = null;
      let imgSuaOab: HTMLImageElement | null = null;
      try {
        imgOab = await carregarImagem("https://raw.githubusercontent.com/miguelss3/suaoab/2337d5382123ff3f2db2ad7637a364ab6b6ca1eb/OABlogo.png");
        imgSuaOab = await carregarImagem("https://raw.githubusercontent.com/miguelss3/suaoab/7e28a9712547ab2eb527663768a4662a304b619c/suaoab.png");
      } catch (err) {
        console.warn("Aviso: Falha ao carregar logotipos.");
      }

      const docPdf = new jsPDF({ format: "a4" });
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const pageHeight = docPdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;
      let currentHeaderTitle = "";

      let materiaNome = buildMateria;
      if (buildMateria === "DADM") materiaNome = "ADMINISTRATIVO";
      if (buildMateria === "DPEN") materiaNome = "PENAL";
      if (buildMateria === "DTRI") materiaNome = "TRIBUTÁRIO";

      const drawHeader = (tituloExtra: string) => {
        docPdf.setLineWidth(0.3);
        docPdf.line(margin, 10, pageWidth - margin, 10);

        // Logo OAB (Esquerda) - TAMANHO AUMENTADO
        if (imgOab) {
          const w = 24 * (imgOab.width / imgOab.height); 
          docPdf.addImage(imgOab, "PNG", margin, 8, w, 24);
        } else {
          docPdf.setFont("times", "bold"); docPdf.setFontSize(16); docPdf.text("OAB", margin, 20);
        }

        // Logo SUAOAB (Direita) - TAMANHO DIMINUÍDO
        if (imgSuaOab) {
          const w = 9 * (imgSuaOab.width / imgSuaOab.height);
          docPdf.addImage(imgSuaOab, "PNG", pageWidth - margin - w, 14, w, 9);
        } else {
          docPdf.setFont("times", "bolditalic"); docPdf.setFontSize(14); docPdf.text("SUAOAB", pageWidth - margin, 20, { align: "right" });
        }

        docPdf.setFont("times", "bold");
        docPdf.setFontSize(11);
        docPdf.setTextColor(0, 0, 0); 
        docPdf.text("ORDEM DOS ADVOGADOS DO BRASIL", pageWidth / 2, 16, { align: "center" });
        docPdf.text("Exame de Ordem Unificado", pageWidth / 2, 21, { align: "center" });

        docPdf.setFontSize(10);
        docPdf.text("Prova Prático-profissional", margin, 32);
        
        const hoje = new Date().toLocaleDateString('pt-BR');
        docPdf.text(`Aplicada em ${hoje}`, pageWidth / 2, 38, { align: "center" });
        
        docPdf.setFontSize(12);
        docPdf.text(`ÁREA: DIREITO ${materiaNome}`, pageWidth / 2, 45, { align: "center" });
        
        if (tituloExtra) {
            docPdf.text(tituloExtra, pageWidth / 2, 53, { align: "center" });
        }

        docPdf.line(margin, 57, pageWidth - margin, 57);
        y = 66; 
      };

      const getPageCount = () => {
        const asAny = docPdf as any;
        if (typeof asAny.getNumberOfPages === "function") return asAny.getNumberOfPages();
        return docPdf.internal?.pages ? Object.keys(docPdf.internal.pages).length : 1;
      };

      const drawSectionBar = (text: string, corRGB: [number, number, number]) => {
        if (y > pageHeight - 30) { drawFooter(getPageCount()); docPdf.addPage(); drawHeader(currentHeaderTitle); }
        docPdf.setFillColor(corRGB[0], corRGB[1], corRGB[2]); 
        docPdf.rect(margin, y - 5, pageWidth - (margin * 2), 7, 'F');
        docPdf.setTextColor(255, 255, 255); 
        docPdf.setFont("times", "bold"); docPdf.setFontSize(11);
        docPdf.text(text, margin + 2, y);
        docPdf.setTextColor(0, 0, 0); 
        y += 8;
      };

      const drawFooter = (pageNum: number) => {
        docPdf.setFont("times", "normal"); docPdf.setFontSize(9);
        docPdf.text("Padrão de Resposta da Prova Prático-Profissional", margin, pageHeight - 10);
        docPdf.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      };

      const writeTextLines = (text: string, isItalic = false) => {
         docPdf.setFont("times", isItalic ? "italic" : "normal"); docPdf.setFontSize(11);
         const lines = docPdf.splitTextToSize(text || "", pageWidth - margin * 2);
         for(let line of lines) {
            if (y > pageHeight - 20) { drawFooter(getPageCount()); docPdf.addPage(); drawHeader(currentHeaderTitle); }
            docPdf.text(line, margin, y);
            y += 5.5; 
         }
      };

      let numQuestao = 1;
      buildQuestoes.forEach((q, idx) => {
        if (idx > 0) { drawFooter(getPageCount()); docPdf.addPage(); }
        const title = q.tipo === 'Peça' ? 'PEÇA PROFISSIONAL' : `QUESTÃO ${numQuestao++}`;
        currentHeaderTitle = `PADRÃO DE RESPOSTA - ${title}`;
        drawHeader(currentHeaderTitle);
        drawSectionBar("ENUNCIADO", [139, 0, 0]);
        writeTextLines(q.enunciado);
        y += 5;
        writeTextLines("Obs.: a peça deve abranger todos os fundamentos de Direito que possam ser utilizados para dar respaldo à pretensão. A simples menção ou transcrição do dispositivo legal não confere pontuação.", true);
        y += 10;
        drawSectionBar("GABARITO COMENTADO", [28, 69, 135]);
        writeTextLines(q.gabarito);
      });
      
      drawFooter(getPageCount());

      const pdfBlob = docPdf.output('blob');
      const fileName = `${buildTipo}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `materiais_alunos/${buildMateria}/${fileName}`);
      await uploadBytes(storageRef, pdfBlob);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "materiais_publicados"), {
        titulo: buildTitulo, materia: buildMateria, tipo: buildTipo,
        url_pdf: url, data_publicacao: serverTimestamp()
      });

      const dataUso = new Date().toISOString();
      for (const q of buildQuestoes) {
        await updateDoc(doc(db, "banco_questoes", q.id), { historico_uso: arrayUnion({ titulo: buildTitulo, data: dataUso }) });
      }

      toast.success(`Simulado Padrão OAB gerado e publicado!`);
      setBuildTitulo(""); setBuildQuestoes([]);
    } catch (e) { toast.error("Erro crítico ao fabricar o PDF."); console.error(e); } finally { setIsGenerating(false); }
  };

  const bancoFiltrado = questoes.filter(q => q.materia === buildMateria);

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-xl border border-border grid md:grid-cols-3 gap-6 shadow-sm">
        <div className="space-y-2">
          <Label className="font-bold">1. Formato do Documento</Label>
          <select className="w-full h-10 border rounded-md px-3 bg-background" value={buildTipo} onChange={(e) => setBuildTipo(e.target.value)}><option value="Caderno">Caderno de Discursivas</option><option value="Simulado">Simulado Completo</option><option value="Revisao">Lista de Revisão</option></select>
        </div>
        <div className="space-y-2">
          <Label className="font-bold">2. Disciplina Alvo</Label>
          <select className="w-full h-10 border rounded-md px-3 bg-background" value={buildMateria} onChange={(e) => {setBuildMateria(e.target.value); setBuildQuestoes([]);}}>
            <option value="">Selecione...</option><option value="DADM">DADM</option><option value="DPEN">DPEN</option><option value="DTRI">DTRI</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="font-bold">3. Título do Ficheiro Interno</Label>
          <Input value={buildTitulo} onChange={(e) => setBuildTitulo(e.target.value)} placeholder="Ex: Simulado Mestre 01" />
        </div>
      </div>

      {buildMateria ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border rounded-xl h-[500px] flex flex-col shadow-sm">
            <div className="p-4 border-b font-bold bg-muted/10 flex justify-between items-center">
              <span>Questões de {buildMateria}</span><span className="text-[10px] bg-primary/10 px-2 py-1 rounded text-primary">{bancoFiltrado.length} NO ACERVO</span>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
              {bancoFiltrado.map(q => (
                <div key={q.id} className="p-3 border rounded-lg bg-background flex justify-between items-start gap-3 hover:border-accent transition-colors group">
                  <div className="flex-1">
                    <span className="text-[9px] font-black uppercase text-accent">#{q.id_questao} - {q.tipo}</span>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{q.enunciado}</p>
                    {q.historico_uso && q.historico_uso.length > 0 && <span className="text-[8px] uppercase bg-warning/20 text-warning px-1.5 py-0.5 rounded mt-1.5 inline-block font-bold">Já utilizada ({q.historico_uso.length}x)</span>}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 group-hover:bg-accent group-hover:text-white" onClick={() => setBuildQuestoes([...buildQuestoes, q])}><Plus className="h-4 w-4"/></Button>
                </div>
              ))}
              {bancoFiltrado.length === 0 && <div className="text-center p-8 text-muted-foreground italic">Nenhuma questão cadastrada no banco para esta disciplina.</div>}
            </div>
          </div>

          <div className="bg-card border-2 border-accent/50 rounded-xl h-[500px] flex flex-col shadow-md">
            <div className="p-4 border-b font-bold bg-accent/5 flex justify-between items-center">
              <span className="text-accent">Prancheta de Montagem do Simulado</span><span className="text-xs font-black bg-accent text-white px-2 py-1 rounded">{buildQuestoes.length} SELECIONADAS</span>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar bg-muted/5">
              {buildQuestoes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30"><Target className="h-12 w-12 mb-2"/><p className="font-bold">A prancheta está vazia</p><p className="text-xs mt-1">Clique no "+" ao lado para adicionar peças e questões.</p></div>
              ) : buildQuestoes.map((q, idx) => (
                <div key={idx} className="p-3 border border-accent/30 rounded-lg bg-background flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3"><GripVertical className="h-4 w-4 text-muted-foreground opacity-50 cursor-move" /><div><span className="text-xs font-bold text-primary block">{idx + 1}. {q.tipo}</span><span className="text-[10px] text-muted-foreground">ID: #{q.id_questao}</span></div></div>
                  <Button size="sm" variant="ghost" className="hover:bg-destructive/10" onClick={() => { const n = [...buildQuestoes]; n.splice(idx, 1); setBuildQuestoes(n); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-background rounded-b-xl"><Button className="w-full h-12 text-lg font-bold" variant="hero" disabled={isGenerating || buildQuestoes.length === 0} onClick={handleGerarPDF}><Cog className={`mr-2 h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />{isGenerating ? "A Formatar no Padrão OAB..." : "Gerar e Publicar Simulado"}</Button></div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/10 border-2 border-dashed rounded-2xl p-20 text-center"><FileText className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" /><p className="text-muted-foreground font-bold text-lg">Motor Desligado</p><p className="text-muted-foreground mt-1">Selecione uma disciplina base acima para ligar os componentes.</p></div>
      )}
    </div>
  );
};

export default MotorGerador;