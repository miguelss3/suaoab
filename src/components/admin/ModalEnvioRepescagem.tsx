// src/components/admin/ModalEnvioRepescagem.tsx
import { useMemo, useState } from "react";
import { X, Mail, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlunoParaRepescagem, enviarOfertasRepescagem, gerarPreviewRepescagem } from "@/lib/repescagem";

const DIAS_ANTI_SPAM = 14;

interface ModalEnvioRepescagemProps {
  alunos: AlunoParaRepescagem[];
  linkRepescagem: string;
  onClose: () => void;
}

const ModalEnvioRepescagem = ({ alunos, linkRepescagem, onClose }: ModalEnvioRepescagemProps) => {
  const [enviando, setEnviando] = useState(false);
  const [incluirRecentes, setIncluirRecentes] = useState(false);

  const recentes = useMemo(() => {
    const limite = Date.now() - DIAS_ANTI_SPAM * 24 * 60 * 60 * 1000;
    return alunos.filter((a) => a.ultimoEnvio && a.ultimoEnvio.getTime() > limite);
  }, [alunos]);

  const elegiveis = incluirRecentes ? alunos : alunos.filter((a) => !recentes.includes(a));
  const semEmail = elegiveis.filter((a) => !a.email);
  const prontos = elegiveis.filter((a) => !!a.email);

  const preview = useMemo(
    () => gerarPreviewRepescagem(prontos[0] ?? alunos[0], linkRepescagem),
    [prontos, alunos, linkRepescagem]
  );

  const handleConfirmar = async () => {
    if (prontos.length === 0) {
      toast.error("Nenhum destinatário elegível para envio.");
      return;
    }

    setEnviando(true);
    try {
      await enviarOfertasRepescagem(prontos, linkRepescagem);
      toast.success(
        prontos.length === 1 ? `Oferta enviada para ${prontos[0].nome}.` : `Oferta enviada para ${prontos.length} alunos.`
      );
      onClose();
    } catch (error) {
      console.error("Erro ao enviar oferta de repescagem:", error);
      toast.error("Erro ao enviar a oferta de repescagem.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-primary italic text-lg">Enviar Oferta de Repescagem</h3>
              <p className="text-xs text-muted-foreground">
                {alunos.length === 1 ? alunos[0].nome : `${alunos.length} alunos selecionados`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {!linkRepescagem && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>Configure o "Link Oculto de Repescagem 50% OFF" na aba Ciclos e Prazos antes de enviar.</span>
            </div>
          )}

          {recentes.length > 0 && (
            <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-lg p-4 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-accent" />
              <div className="space-y-2">
                <p>
                  <strong>{recentes.length}</strong> {recentes.length === 1 ? "aluno já recebeu" : "alunos já receberam"} esta
                  oferta nos últimos {DIAS_ANTI_SPAM} dias. Por padrão {recentes.length === 1 ? "ele não receberá" : "eles não receberão"} um novo envio.
                </p>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirRecentes}
                    onChange={(e) => setIncluirRecentes(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  Reenviar mesmo assim para quem já recebeu
                </label>
              </div>
            </div>
          )}

          {semEmail.length > 0 && (
            <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-lg p-4 text-sm text-muted-foreground">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{semEmail.length} aluno(s) sem e-mail cadastrado serão ignorados.</span>
            </div>
          )}

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
              Destinatários ({prontos.length})
            </p>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {prontos.map((a) => (
                <div key={a.id} className="px-3 py-2 text-sm flex justify-between gap-3">
                  <span className="font-bold text-primary truncate">{a.nome}</span>
                  <span className="text-muted-foreground truncate">{a.email}</span>
                </div>
              ))}
              {prontos.length === 0 && (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground">Nenhum destinatário elegível.</div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
              Pré-visualização {prontos.length > 1 ? `(exemplo com ${prontos[0]?.nome})` : ""}
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 text-sm border-b border-border">
                <span className="text-muted-foreground">Assunto: </span>
                <span className="font-bold text-primary">{preview.assunto}</span>
              </div>
              {/* sandbox="" (sem allow-scripts) isola qualquer conteúdo do e-mail do painel admin. */}
              <iframe title="Pré-visualização do e-mail" sandbox="" srcDoc={preview.html} className="w-full h-64 bg-white" />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="hero"
            className="flex-1 font-bold gap-2"
            onClick={handleConfirmar}
            disabled={enviando || !linkRepescagem || prontos.length === 0}
          >
            <Send className="h-4 w-4" />
            {enviando ? "Enviando..." : `Confirmar Envio (${prontos.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalEnvioRepescagem;
