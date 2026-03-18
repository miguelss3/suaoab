// src/components/admin/GestaoCiclos.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CalendarDays, Save, AlertTriangle, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const GestaoCiclos = () => {
  const [exame, setExame] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [loading, setLoading] = useState(false);

  // Vai buscar os dados atuais ao Firebase
  useEffect(() => {
    const fetchCiclo = async () => {
      const docRef = doc(db, "configuracoes", "ciclo_atual");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setExame(docSnap.data().exame || "");
        setDataProva(docSnap.data().data_prova || "");
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
      // O Motor calcula a data de expiração automaticamente (Prova + 5 dias)
      const dataExp = new Date(dataProva + "T12:00:00");
      dataExp.setDate(dataExp.getDate() + 5);

      await setDoc(doc(db, "configuracoes", "ciclo_atual"), {
        exame,
        data_prova: dataProva,
        data_expiracao: dataExp.toISOString().split('T')[0],
        atualizado_em: new Date()
      });
      toast.success("Ciclo atualizado! O relógio do sistema foi ajustado.");
    } catch (error) {
      toast.error("Erro ao guardar as configurações no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  // Função visual para mostrar ao professor o dia exato do corte
  const calcularExpiracaoVisual = () => {
    if (!dataProva) return "Aguardando data da prova...";
    const d = new Date(dataProva + "T12:00:00");
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString('pt-BR'); // Formato brasileiro
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-8 rounded-xl border border-border shadow-sm max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary italic">Motor de Ciclos e Prazos</h2>
            <p className="text-sm text-muted-foreground">Defina o ciclo atual para automatizar a expiração de acessos (Repescagem).</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground"/> Edição do Exame
              </Label>
              <Input 
                placeholder="Ex: Exame 47" 
                value={exame} 
                onChange={(e) => setExame(e.target.value)} 
                className="h-12 text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground"/> Data da 2ª Fase
              </Label>
              <Input 
                type="date" 
                value={dataProva} 
                onChange={(e) => setDataProva(e.target.value)} 
                className="h-12 text-lg"
              />
            </div>
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
                <span className="text-sm font-bold text-primary">Corte de Acessos agendado para:</span>
                <span className="text-sm font-black text-destructive tracking-wide uppercase">
                  {calcularExpiracaoVisual()}
                </span>
              </div>
            </div>
          </div>

          <Button 
            variant="hero" 
            size="lg" 
            className="w-full h-14 text-lg" 
            onClick={handleSalvar} 
            disabled={loading}
          >
            <Save className="h-5 w-5 mr-2" />
            {loading ? "A Guardar Configurações..." : "Salvar e Ativar Novo Ciclo"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GestaoCiclos;