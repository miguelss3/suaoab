// src/lib/repescagem.ts
// Fluxo de reativação de alunos Inativos: gera o conteúdo do e-mail de oferta
// (50% OFF) e o registra na coleção `mail`, consumida pela extensão do Firebase
// "Trigger Email from Firestore" (que efetivamente despacha o e-mail via SMTP).
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { gerarLinkHotmartComPrefill } from "@/lib/hotmart";

export interface AlunoParaRepescagem {
  id: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  motivo_inatividade?: string;
  /** Último envio já resolvido para Date pelo chamador; usado só para o aviso anti-spam no modal. */
  ultimoEnvio?: Date | null;
}

const MENSAGENS_POR_MOTIVO: Record<string, string> = {
  ciclo_expirado:
    "Sabemos que o seu ciclo anterior expirou antes de você concluir a preparação. Estamos abrindo uma nova turma e você pode voltar com uma condição especial.",
  nao_renovou:
    "Notamos que você não chegou a renovar o seu acesso Premium. Preparamos uma condição especial para você retomar de onde parou.",
  sem_engajamento:
    "Sabemos que o dia a dia é corrido. Preparamos uma condição especial para você retomar os estudos com o pé direito.",
  outro: "Preparamos uma condição especial para você voltar a estudar com a gente.",
};

const MENSAGEM_PADRAO = MENSAGENS_POR_MOTIVO.outro;

// `nome` vem do cadastro do aluno sem sanitização — nunca interpolar direto no HTML do e-mail.
const escapeHtml = (valor: string) =>
  valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const gerarPreviewRepescagem = (
  aluno: Pick<AlunoParaRepescagem, "nome" | "email" | "whatsapp" | "motivo_inatividade">,
  linkRepescagem: string
) => {
  const primeiroNomeBruto = (aluno.nome || "").replace(/[\r\n]+/g, " ").trim().split(" ")[0] || "Futuro(a) Aprovado(a)";
  const primeiroNome = escapeHtml(primeiroNomeBruto);
  const mensagemMotivo = MENSAGENS_POR_MOTIVO[aluno.motivo_inatividade ?? ""] ?? MENSAGEM_PADRAO;
  const linkPersonalizado = gerarLinkHotmartComPrefill(linkRepescagem, aluno);

  const assunto = `${primeiroNomeBruto}, sua vaga de repescagem com 50% OFF te espera`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #14233c;">Olá, ${primeiroNome}!</h2>
      <p>${mensagemMotivo}</p>
      <p>Por tempo limitado, você tem direito a <strong>50% de desconto</strong> para voltar a estudar com a SuaOAB.</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${linkPersonalizado}" style="background:#d97706;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Garantir minha vaga com 50% OFF
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;">Se o botão não funcionar, copie e cole este link no navegador: ${linkPersonalizado}</p>
    </div>
  `.trim();

  const text = `Olá, ${primeiroNomeBruto}!\n\n${mensagemMotivo}\n\nVocê tem direito a 50% de desconto para voltar a estudar com a SuaOAB: ${linkPersonalizado}`;

  return { assunto, html, text, linkPersonalizado };
};

// Limite de 500 operações por batch do Firestore; cada aluno gera 2 (criação do e-mail + update do envio).
const TAMANHO_LOTE = 200;

export const enviarOfertasRepescagem = async (alunos: AlunoParaRepescagem[], linkRepescagem: string) => {
  if (!linkRepescagem) throw new Error("Link de repescagem não configurado em Ciclos e Prazos.");

  const comEmail = alunos.filter((aluno) => !!aluno.email);
  if (comEmail.length === 0) return { enviados: 0 };

  for (let i = 0; i < comEmail.length; i += TAMANHO_LOTE) {
    const lote = comEmail.slice(i, i + TAMANHO_LOTE);
    const batch = writeBatch(db);
    const agora = new Date();

    lote.forEach((aluno) => {
      const { assunto, html, text } = gerarPreviewRepescagem(aluno, linkRepescagem);
      const mailRef = doc(collection(db, "mail"));
      batch.set(mailRef, {
        to: [aluno.email],
        message: { subject: assunto, html, text },
      });
      batch.update(doc(db, "alunos", aluno.id), { ultimo_envio_repescagem: agora });
    });

    await batch.commit();
  }

  return { enviados: comEmail.length };
};
