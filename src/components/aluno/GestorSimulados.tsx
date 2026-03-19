// src/components/aluno/GestorSimulados.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const GestorSimulados = ({ modalPreparacao, setModalPreparacao }: any) => {
  const [simuladoAtivo, setSimuladoAtivo] = useState<any>(null);
  const [tempoRestante, setTempoRestante] = useState(18000); // 5 horas

  useEffect(() => {
    let intervalo: any;
    if (simuladoAtivo && tempoRestante > 0) {
      intervalo = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (simuladoAtivo && tempoRestante === 0) {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
      audio.play().catch(e => console.log("O navegador bloqueou o áudio automático."));
      toast.error("TEMPO ESGOTADO! Canetas pousadas.", { duration: 10000 });
      setSimuladoAtivo(null);
    }
    return () => clearInterval(intervalo);
  }, [simuladoAtivo, tempoRestante]);

  const formatarTempo = (segundosTotais: number) => {
    const h = Math.floor(segundosTotais / 3600);
    const m = Math.floor((segundosTotais % 3600) / 60);
    const s = segundosTotais % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const iniciarSimulado = () => {
    setSimuladoAtivo(modalPreparacao);
    setTempoRestante(18000);
    setModalPreparacao(null);
    window.open(modalPreparacao.url_pdf || modalPreparacao.url || modalPreparacao.link, "_blank");
    toast.success("Cronômetro de 5 horas iniciado. Boa prova!");
  };

  return (
    <>
      {/* MODAL DE PREPARAÇÃO */}
      {modalPreparacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-8 relative">
            <button onClick={() => setModalPreparacao(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="bg-accent/20 p-4 rounded-full">
                <AlertTriangle className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-primary italic">Modo Simulado Real</h2>
              <p className="text-muted-foreground leading-relaxed">
                A chave para a aprovação na 2ª Fase não é apenas o conhecimento, mas a gestão rigorosa do tempo e o controle emocional.
              </p>
              <div className="bg-muted/30 p-4 rounded-lg text-sm text-left w-full border border-border">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Isole-se num ambiente silencioso.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Separe água e o seu Vade Mecum.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> O tempo limite é cravado em 5 horas.</li>
                </ul>
              </div>
            </div>
            <Button variant="hero" className="w-full h-14 text-lg font-bold" onClick={iniciarSimulado}>
              <Play className="mr-2 h-5 w-5" /> Estou Pronto. Iniciar (5h)
            </Button>
          </div>
        </div>
      )}

      {/* CRONÔMETRO FLUTUANTE */}
      {simuladoAtivo && (
        <div className="fixed bottom-6 right-6 bg-card border-2 border-accent shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-5 rounded-2xl z-50 flex flex-col items-center w-64 animate-in slide-in-from-bottom-8">
          <h4 className="text-primary font-bold text-sm mb-1 text-center truncate w-full">{simuladoAtivo.titulo}</h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Tempo Restante</p>
          <div className={`text-4xl font-display font-black tabular-nums tracking-tight ${tempoRestante < 1800 ? 'text-destructive animate-pulse' : 'text-accent'}`}>
            {formatarTempo(tempoRestante)}
          </div>
          <Button variant="outline" size="sm" onClick={() => setSimuladoAtivo(null)} className="mt-4 w-full text-xs font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
            Encerrar Antecipadamente
          </Button>
        </div>
      )}
    </>
  );
};