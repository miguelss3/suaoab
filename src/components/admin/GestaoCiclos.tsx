// src/components/admin/GestaoCiclos.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { CalendarDays, Save, AlertTriangle, Clock, Target, Users, Tag, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { calcularVagasVisiveis, countAlunosPremium } from "@/lib/ciclo";

const GestaoCiclos = () => {
  const cicloRef = doc(db, "configuracoes", "ciclo_atual");
  const ofertaRef = doc(db, "configuracoes", "oferta_atual");

  const [exame, setExame] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [vagasTotais, setVagasTotais] = useState<number | string>(50);
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  
  const [precoOriginal, setPrecoOriginal] = useState("899");
  const [precoAtual, setPrecoAtual] = useState("599");
  const [linkRepescagem, setLinkRepescagem] = useState(""); 
  
  const [loading, setLoading] = useState(false);

  const sincronizarMatriculados = async () => {
    const qAlunos = query(collection(db, "alunos"), where("status", "!=", "inativo"));
    const snapAlunos = await getDocs(qAlunos);

    const matriculadosAtuais = countAlunosPremium(
      snapAlunos.docs.map((alunoDoc) => ({
        id: alunoDoc.id,
        ...(alunoDoc.data() as { email?: string; status?: string }),
      }))
    );

    setAlunosAtivos(matriculadosAtuais);

    return matriculadosAtuais;
  };

  useEffect(() => {
    const fetchCiclo = async () => {
      try {
        const docSnap = await getDoc(cicloRef);
        const ofertaSnap = await getDoc(ofertaRef);

        if (!docSnap.exists()) return;

        const data = docSnap.data();

        setExame(data.exame || "");
        setDataProva(data.data_prova || "");
        if (data.vagas_totais) setVagasTotais(data.vagas_totais);

        if (ofertaSnap.exists()) {
          const oferta = ofertaSnap.data();
          if (oferta.preco_original) setPrecoOriginal(oferta.preco_original);
          if (oferta.preco_atual) setPrecoAtual(oferta.preco_atual);
          if (oferta.link_repescagem) setLinkRepescagem(oferta.link_repescagem);
        } else {
          if (data.preco_original) setPrecoOriginal(data.preco_original);
          if (data.preco_atual) setPrecoAtual(data.preco_atual);
          if (data.link_repescagem) setLinkRepescagem(data.link_repescagem);
        }

        const matriculadosAtuais = await sincronizarMatriculados();
        const vagasRestantesCalculadas = calcularVagasVisiveis(data.vagas_totais, matriculadosAtuais);

        if (
          Number(data.matriculados) !== matriculadosAtuais ||
          Number(data.vagas_restantes) !== vagasRestantesCalculadas
        ) {
          await updateDoc(cicloRef, {
            matriculados: matriculadosAtuais,
            vagas_restantes: vagasRestantesCalculadas,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do ciclo", error);
      }
    };

    fetchCiclo();
  }, []);

  const handleSalvar = async () => {
    if (!exame || !dataProva) {
      toast.error("Preencha o número do exame e a data da prova.");
      return;
    }

    setLoading(true);
    try {
      const matriculadosAtuais = await sincronizarMatriculados();

      if (Number(vagasTotais) < matriculadosAtuais) {
        toast.error(`Você não pode ter menos vagas do que os ${matriculadosAtuais} alunos Premium atuais.`);
        return;
      }

      const dataExp = new Date(dataProva + "T12:00:00");
      dataExp.setDate(dataExp.getDate() + 5);

      const vagasRestantesCalculadas = calcularVagasVisiveis(vagasTotais, matriculadosAtuais);

      await setDoc(cicloRef, {
        exame,
        data_prova: dataProva,
        // CORREÇÃO 1: Adicionado para salvar como texto e evitar o erro do Array
        data_expiracao: dataExp.toISOString().split('T'), 
        vagas_totais: Number(vagasTotais),
        matriculados: matriculadosAtuais,
        vagas_restantes: vagasRestantesCalculadas,
        atualizado_em: new Date()
      }, { merge: true });

      await setDoc(ofertaRef, {
        preco_original: precoOriginal,
        preco_atual: precoAtual,
        link_repescagem: linkRepescagem, 
        atualizado_em: new Date()
      }, { merge: true });
      
      toast.success("Configurações atualizadas! A Landing Page já reflete as vagas reais.");
    } catch (error) {
      toast.error("Erro ao guardar as configurações no banco de dados.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calcularExpiracaoVisual = () => {
    if (!dataProva) return "Aguardando data da prova...";
    const d = new Date(dataProva + "T12:00:00");
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-8 rounded-xl border border-border shadow-sm max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary italic">Motor Central do Site</h2>
            <p className="text-sm text-muted-foreground">Controle vagas, datas de expiração e os preços exibidos na página de vendas.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground"/> Edição do Exame
              </Label>
              {/* CORREÇÃO 2: Alterado de setExame(setExame) para e.target.value para destravar o banco */}
              <Input placeholder="Ex: Exame 47" value={exame} onChange={(e) => setExame(e.target.value)} className="h-12 text-lg" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground"/> Data da 2ª Fase
              </Label>
              <Input type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} className="h-12 text-lg" />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-accent"/> Estratégia de Precificação & Repescagem
            </h3>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">Preço Original (R$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-muted-foreground font-bold">R$</span>
                  <Input type="number" value={precoOriginal} onChange={(e) => setPrecoOriginal(e.target.value)} className="h-12 text-lg font-bold pl-12 line-through text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-success">Preço Atual / Oferta (R$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-success font-bold">R$</span>
                  <Input type="number" value={precoAtual} onChange={(e) => setPrecoAtual(e.target.value)} className="h-12 text-lg font-black pl-12 border-success text-success focus-visible:ring-success" />
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border">
              <Label className="text-sm font-bold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" /> Link Oculto (Hotmart) - Repescagem 50% OFF
              </Label>
              <Input 
                placeholder="https://pay.hotmart.com/..." 
                value={linkRepescagem} 
                onChange={(e) => setLinkRepescagem(e.target.value)} 
                className="font-mono text-sm h-10" 
              />
              <p className="text-xs text-muted-foreground mt-1">Este link não aparece no site. Você o copiará daqui para mandar ao aluno no WhatsApp após validar o comprovante dele.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-accent"/> Gatilho de Escassez (Vagas no Site)
            </h3>
            <div className="grid md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Total de Vagas da Turma</Label>
                <Input type="number" min={alunosAtivos} value={vagasTotais} onChange={(e) => setVagasTotais(e.target.value)} className="h-12 text-lg font-bold" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-background border border-border p-3 rounded-lg text-center shadow-inner">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Matriculados</p>
                  <p className="text-2xl font-display font-black text-primary">{alunosAtivos}</p>
                </div>
                <div className="flex-1 bg-accent/10 border border-accent/20 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-accent uppercase font-black tracking-widest mb-1">Visível no Site</p>
                  <p className="text-2xl font-display font-black text-accent">{calcularVagasVisiveis(vagasTotais, alunosAtivos)}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Matriculados e vagas visiveis sao sincronizados automaticamente com a quantidade de alunos Premium no CRM. Esse valor nao depende de preenchimento manual.
            </p>
          </div>

          <div className="bg-muted/30 p-5 rounded-lg border border-border flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-primary mb-1">Como a Expiração Automática funciona?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                O sistema libertará o acesso dos alunos Premium até 5 dias após a data da prova que você configurar acima. 
                Após essa data, o aluno verá a tela de bloqueio e o botão de solicitação de repescagem.
              </p>
              <div className="inline-flex items-center gap-2 bg-background px-4 py-2 border border-border rounded-md">
                <Clock className="h-4 w-4 text-muted-foreground"/>
                <span className="text-sm font-bold text-primary">Corte agendado para:</span>
                <span className="text-sm font-black text-destructive tracking-wide uppercase">{calcularExpiracaoVisual()}</span>
              </div>
            </div>
          </div>

          <Button variant="hero" size="lg" className="w-full h-14 text-lg" onClick={handleSalvar} disabled={loading}>
            <Save className="h-5 w-5 mr-2" />
            {loading ? "A Guardar Configurações..." : "Salvar Configurações Gerais"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GestaoCiclos;