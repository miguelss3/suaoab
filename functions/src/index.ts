import * as admin from "firebase-admin";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Inicializa o acesso ao banco de dados
admin.initializeApp();

// 🔒 SEGURANÇA: Token da Hotmart gerenciado como Secret do Firebase.
// Para configurar, execute UMA VEZ no terminal:
//   firebase functions:secrets:set HOTMART_HOTTOK
// E cole o token quando solicitado. Nunca coloque o valor diretamente aqui.
const HOTTOK = defineSecret("HOTMART_HOTTOK");
const db = admin.firestore();

const HOTMART_REVERSAL_EVENTS = new Set([
  "PURCHASE_CANCELED",
  "PURCHASE_CANCELLED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "SUBSCRIPTION_CANCELLATION",
  "SUBSCRIPTION_CANCELED",
]);

const normalizeEmail = (email?: string | null) => (typeof email === "string" ? email.trim().toLowerCase() : "");

const uniqueRefs = (refs: admin.firestore.DocumentReference[]) => {
  const byPath = new Map<string, admin.firestore.DocumentReference>();
  refs.forEach((ref) => byPath.set(ref.path, ref));
  return [...byPath.values()];
};

const localizarAlunosPorEmail = async (email: string, emailOriginal?: string) => {
  const alunosRef = db.collection("alunos");
  const consultas = [alunosRef.where("email_normalizado", "==", email).get(), alunosRef.where("email", "==", email).get()];

  if (emailOriginal && emailOriginal !== email) {
    consultas.push(alunosRef.where("email", "==", emailOriginal).get());
  }

  const resultados = await Promise.all(consultas);
  return uniqueRefs(resultados.flatMap((snapshot) => snapshot.docs.map((docSnap) => docSnap.ref)));
};

const atualizarStatusAlunosHotmart = async (
  emailOriginal: string,
  status: "premium" | "inativo",
  ultimoEvento: string
) => {
  const emailNormalizado = normalizeEmail(emailOriginal);
  if (!emailNormalizado) return 0;

  const refs = await localizarAlunosPorEmail(emailNormalizado, emailOriginal);
  if (refs.length === 0) return 0;

  const batch = db.batch();
  refs.forEach((ref) => {
    batch.set(
      ref,
      {
        status,
        email_normalizado: emailNormalizado,
        ultimo_evento_hotmart: ultimoEvento,
        atualizado_em_hotmart: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
  await batch.commit();

  return refs.length;
};

const registrarEventoHotmart = async (evento: string, email: string, payload: unknown) => {
  await db.collection("hotmart_eventos").add({
    evento,
    email,
    payload,
    recebido_em: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const salvarPendenciaHotmart = async (
  email: string,
  statusDesejado: "premium" | "inativo",
  evento: string,
  payload: unknown
) => {
  if (!email) return;

  await db.collection("hotmart_pendencias").doc(email).set(
    {
      email,
      status_desejado: statusDesejado,
      ultimo_evento: evento,
      payload,
      pendente: true,
      atualizado_em: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const concluirPendenciaHotmart = async (email: string, statusAplicado: string, origem: string) => {
  if (!email) return;

  await db.collection("hotmart_pendencias").doc(email).set(
    {
      pendente: false,
      status_aplicado: statusAplicado,
      resolvido_por: origem,
      resolvido_em: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const reconciliarPendenciaHotmart = async (emailInformado?: string | null, origem = "manual") => {
  const email = normalizeEmail(emailInformado);
  if (!email) {
    return { reconciliado: false, status: undefined as string | undefined, quantidade: 0 };
  }

  const pendenciaRef = db.collection("hotmart_pendencias").doc(email);
  const pendenciaSnap = await pendenciaRef.get();

  if (!pendenciaSnap.exists) {
    return { reconciliado: false, status: undefined as string | undefined, quantidade: 0 };
  }

  const pendencia = pendenciaSnap.data() as { status_desejado?: "premium" | "inativo"; pendente?: boolean } | undefined;
  if (!pendencia?.pendente || !pendencia.status_desejado) {
    return { reconciliado: false, status: pendencia?.status_desejado, quantidade: 0 };
  }

  const quantidade = await atualizarStatusAlunosHotmart(email, pendencia.status_desejado, `PENDENCIA_${origem.toUpperCase()}`);
  if (quantidade > 0) {
    await concluirPendenciaHotmart(email, pendencia.status_desejado, origem);
    return { reconciliado: true, status: pendencia.status_desejado, quantidade };
  }

  return { reconciliado: false, status: pendencia.status_desejado, quantidade: 0 };
};

export const nextMatricula = onCall(async () => {
  const counterRef = db.doc("configuracoes/contador_matricula");
  const currentYearFloor = Number(`${new Date().getFullYear()}000`);

  const matricula = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const storedValue = snap.exists ? Number(snap.data()?.valor) : NaN;
    const lastValue = Number.isFinite(storedValue) ? storedValue : currentYearFloor;
    const nextValue = lastValue < currentYearFloor ? currentYearFloor + 1 : lastValue + 1;

    tx.set(
      counterRef,
      {
        valor: nextValue,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return String(nextValue);
  });

  return { matricula };
});

export const reconciliarCompraHotmart = onCall(async (request) => {
  const emailAuth = typeof request.auth?.token?.email === "string" ? request.auth.token.email : undefined;
  const emailBody = typeof request.data?.email === "string" ? request.data.email : undefined;
  const email = normalizeEmail(emailBody || emailAuth);

  return reconciliarPendenciaHotmart(email, "cadastro");
});

export const hotmartWebhook = onRequest(
  { secrets: [HOTTOK] },
  async (req, res) => {
    // Aceita apenas requisições POST da Hotmart
    if (req.method !== "POST") {
      res.status(405).send("Método não permitido");
      return;
    }

    // 🔒 VERIFICAÇÃO DE SEGURANÇA: Garante que foi a Hotmart que enviou
    // Hotmart v2 envia o token tanto no header quanto no body
    const hottokHeader = (() => {
      const h = req.headers["x-hotmart-hottok"];
      return Array.isArray(h) ? h[0] : h;
    })();
    const hottokBody = (req.body as Record<string, unknown>)?.hottok;
    const hottokRecebido = hottokHeader || (typeof hottokBody === "string" ? hottokBody : undefined);
    if (hottokRecebido !== HOTTOK.value()) {
      console.warn("Tentativa de invasão bloqueada: Hottok inválido.", { hottokHeader: !!hottokHeader, hottokBody: !!hottokBody });
      res.status(401).send("Acesso não autorizado");
      return;
    }

    try {
      const dados = req.body as {
        event?: string;
        data?: { buyer?: { email?: string } };
      };
      const evento = String(dados.event || "");
      const emailOriginal = dados.data?.buyer?.email || "";
      const emailNormalizado = normalizeEmail(emailOriginal);

      await registrarEventoHotmart(evento, emailNormalizado, dados);

      if (!emailNormalizado) {
        console.warn("Webhook Hotmart recebido sem e-mail do comprador.");
        res.status(200).send("Recebido sem email");
        return;
      }

      // Verifica se o evento é de COMPRA APROVADA
      if (evento === "PURCHASE_APPROVED") {
        const atualizados = await atualizarStatusAlunosHotmart(emailOriginal, "premium", evento);

        if (atualizados > 0) {
          await concluirPendenciaHotmart(emailNormalizado, "premium", "webhook");
          console.log(`Sucesso: Aluno ${emailNormalizado} atualizado para premium!`);
        } else {
          await salvarPendenciaHotmart(emailNormalizado, "premium", evento, dados);
          console.log(`Aviso: Compra aprovada para ${emailNormalizado} guardada como pendente.`);
        }
      } else if (HOTMART_REVERSAL_EVENTS.has(evento)) {
        const atualizados = await atualizarStatusAlunosHotmart(emailOriginal, "inativo", evento);

        if (atualizados > 0) {
          await concluirPendenciaHotmart(emailNormalizado, "inativo", "webhook");
          console.log(`Reversao Hotmart aplicada para ${emailNormalizado}.`);
        } else {
          await salvarPendenciaHotmart(emailNormalizado, "inativo", evento, dados);
          console.log(`Aviso: Reversao Hotmart para ${emailNormalizado} guardada como pendente.`);
        }
      }

      res.status(200).send("Recebido com sucesso pela SuaOAB");
    } catch (error) {
      console.error("Erro interno no Webhook:", error);
      res.status(500).send("Erro interno do servidor");
    }
  }
);