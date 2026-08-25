// src/components/admin/PendenciasHotmart.tsx
// Alerta no painel para compras da Hotmart cujo e-mail do comprador não bateu
// com nenhum cadastro no site — normalmente porque o aluno pagou com um
// e-mail diferente do que usou pra criar a conta. Fica pendente até o próprio
// aluno logar com o e-mail certo (reconciliação automática, ver AuthModal.tsx)
// ou o professor resolver manualmente aqui.
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functionsClient } from "@/lib/firebase";
import { AlertTriangle, Mail, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PendenciaHotmart {
  id: string;
  email: string;
  status_desejado?: "premium" | "inativo";
  ultimo_evento?: string;
  atualizado_em?: { toMillis?: () => number };
}

const reconciliarCompraHotmart = httpsCallable<{ email?: string }, { reconciliado: boolean; status?: string; quantidade?: number }>(
  functionsClient,
  "reconciliarCompraHotmart"
);

const PendenciasHotmart = () => {
  const [pendencias, setPendencias] = useState<PendenciaHotmart[]>([]);
  const [resolvendo, setResolvendo] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<string | null>(null);

  useEffect(() => {
    // Sem orderBy de propósito: evita depender de um índice composto do
    // Firestore só pra ordenar uma lista que deve ficar sempre bem pequena.
    const q = query(collection(db, "hotmart_pendencias"), where("pendente", "==", true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PendenciaHotmart, "id">) }));
        docs.sort((a, b) => (b.atualizado_em?.toMillis?.() ?? 0) - (a.atualizado_em?.toMillis?.() ?? 0));
        setPendencias(docs);
      },
      (error) => console.error("Erro ao carregar pendências Hotmart:", error)
    );
    return () => unsub();
  }, []);

  const resolverManualmente = async (email: string) => {
    setResolvendo(email);
    try {
      const resp = await reconciliarCompraHotmart({ email });
      if (resp.data.reconciliado) {
        toast.success(`Aluno ${email} atualizado para ${resp.data.status}.`);
      } else {
        toast.error(`Ainda não há cadastro com o e-mail ${email}. Confirme se o aluno já se cadastrou no site.`);
      }
    } catch (error) {
      console.error("Erro ao reconciliar pendência Hotmart:", error);
      toast.error("Erro ao tentar reconciliar. Veja o console para detalhes.");
    } finally {
      setResolvendo(null);
    }
  };

  // Pra descartar pendências que não são compras de verdade (ex.: testes feitos
  // com o Postman/simulador do webhook) sem precisar mexer direto no Firestore.
  const descartarPendencia = async (id: string) => {
    if (!window.confirm("Descartar esta pendência? Use só se tiver certeza de que não é uma compra real aguardando reconciliação.")) return;
    setDescartando(id);
    try {
      await updateDoc(doc(db, "hotmart_pendencias", id), {
        pendente: false,
        resolvido_por: "admin_manual_descarte",
        resolvido_em: serverTimestamp(),
      });
      toast.success("Pendência descartada.");
    } catch (error) {
      console.error("Erro ao descartar pendência Hotmart:", error);
      toast.error("Erro ao descartar. Veja o console para detalhes.");
    } finally {
      setDescartando(null);
    }
  };

  if (pendencias.length === 0) return null;

  return (
    <div className="bg-destructive/5 border-2 border-destructive/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-destructive">
            {pendencias.length} compra{pendencias.length > 1 ? "s" : ""} da Hotmart sem cadastro correspondente
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            O comprador pagou com um e-mail que não bate com nenhum aluno cadastrado no site. Assim que ele se
            cadastrar com esse e-mail, o sistema resolve sozinho — ou tente resolver manualmente abaixo.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {pendencias.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-background border border-border rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-bold text-primary truncate">{p.email}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                → {p.status_desejado || "?"} ({p.ultimo_evento || "evento desconhecido"})
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="gap-2" disabled={resolvendo === p.email} onClick={() => resolverManualmente(p.email)}>
                <RefreshCw className={`h-3.5 w-3.5 ${resolvendo === p.email ? "animate-spin" : ""}`} />
                {resolvendo === p.email ? "Tentando..." : "Tentar Novamente"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                disabled={descartando === p.id}
                onClick={() => descartarPendencia(p.id)}
                title="Descartar (use se não for uma compra real, ex.: teste)"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendenciasHotmart;
