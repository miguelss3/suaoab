// src/components/aluno/TelasDegustacao.tsx
import { LogOut, Lock, CheckCircle2, ArrowRight, ShieldCheck, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HotmartCheckoutPerfil } from "@/lib/hotmart";

type TelaBloqueioProps = {
  perfilAluno: HotmartCheckoutPerfil | null;
  handleLogout: () => Promise<void> | void;
  checkoutUrl: string;
};

export const TelaBloqueio = ({ perfilAluno, handleLogout, checkoutUrl }: TelaBloqueioProps) => {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full bg-card rounded-3xl p-10 shadow-elevated border-2 border-accent/20 text-center space-y-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent via-accent/60 to-accent" />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center border-4 border-accent/20 shadow-inner">
            <Lock className="w-10 h-10 text-accent" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/30 px-4 py-1 text-xs text-destructive font-black uppercase tracking-widest">
            Acesso Bloqueado
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
            Olá, <span className="text-accent">{perfilAluno?.nome?.split(" ") || "Aluno"}</span>!
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            O seu período de <strong className="text-foreground">Degustação Gratuita</strong> chegou ao fim.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-5 text-left bg-muted/50 p-6 rounded-2xl border border-border">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/90">Cronograma Adaptativo com metas diárias.</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/90">Correção Artesanal de peças e simulados.</p>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Para retomar os seus estudos, conclua sua matrícula:</p>
          
          <a 
            href={checkoutUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full max-w-md inline-flex justify-center items-center gap-3 h-16 bg-accent hover:bg-accent/90 text-accent-foreground font-display font-black text-xl rounded-xl transition-all shadow-lg hover:shadow-accent/30 tracking-tight mx-auto"
          >
            TORNAR-SE ALUNO PREMIUM <ArrowRight className="w-6 h-6" />
          </a>
          
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
            <ShieldCheck className="h-4 w-4 text-success" /> Pagamento 100% seguro via Hotmart
          </p>
        </div>
        
        <div className="border-t border-border pt-6 mt-10">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

type BannerDegustacaoProps = {
  tempoRestanteTexto: string;
  perfilAluno: HotmartCheckoutPerfil | null;
  checkoutUrl: string;
};

export const BannerDegustacao = ({ tempoRestanteTexto, perfilAluno, checkoutUrl }: BannerDegustacaoProps) => {
  void perfilAluno;
  
  // Deteta se a string contém "hora" ou "minuto", indicando menos de 1 dia.
  const isAcabando = tempoRestanteTexto.includes("hora") || tempoRestanteTexto.includes("minuto");

  return (
    <div className={`${isAcabando ? 'bg-destructive/10 border-destructive/50' : 'bg-yellow-500/10 border-yellow-500/50'} border p-5 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4`}>
      <div className="flex gap-4 items-center">
        <div className={`${isAcabando ? 'bg-destructive/20 text-destructive' : 'bg-yellow-500/20 text-yellow-600'} p-3 rounded-full hidden sm:block`}>
          <AlertOctagon className={`w-6 h-6 ${isAcabando ? 'text-destructive' : 'text-yellow-600'}`} />
        </div>
        <div>
          <h4 className={`font-bold ${isAcabando ? 'text-destructive' : 'text-yellow-700 dark:text-yellow-500'} text-lg flex items-center gap-2`}>
            {isAcabando ? "⚠️ Atenção: Seu período de testes está acabando!" : "Você está no período de Degustação"}
          </h4>
          <p className={`text-sm ${isAcabando ? 'text-destructive/80' : 'text-yellow-600/80 dark:text-yellow-400'} mt-1`}>
            Seu acesso gratuito expira em <strong className="font-black">{tempoRestanteTexto}</strong>. 
            Garanta sua vaga definitiva.
          </p>
        </div>
      </div>
      
      <Button asChild variant={isAcabando ? "destructive" : "hero"} className="w-full sm:w-auto shadow-lg whitespace-nowrap">
        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
          Garantir Vaga Premium
        </a>
      </Button>
    </div>
  );
};