import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa o acesso ao banco de dados
admin.initializeApp();

// 🔒 SEGURANÇA: Cole aqui o seu Hottok (Token) que está na tela de Webhooks da Hotmart
const MEU_HOTTOK = "COLE_O_SEU_TOKEN_DA_HOTMART_AQUI";

export const nextMatricula = functions.https.onCall(async () => {
  const db = admin.firestore();
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

export const hotmartWebhook = functions.https.onRequest(async (req, res) => {
  // Aceita apenas requisições POST da Hotmart
  if (req.method !== "POST") {
    res.status(405).send("Método não permitido");
    return;
  }

  // 🔒 VERIFICAÇÃO DE SEGURANÇA: Garante que foi a Hotmart que enviou
  const hottokRecebido = req.headers["x-hotmart-hottok"];
  if (hottokRecebido !== MEU_HOTTOK) {
    console.warn("Tentativa de invasão bloqueada: Hottok inválido.");
    res.status(401).send("Acesso não autorizado");
    return;
  }

  try {
    const dados = req.body;
    
    // Verifica se o evento é de COMPRA APROVADA
    if (dados.event === "PURCHASE_APPROVED") {
      const emailDoAluno = dados.data?.buyer?.email;

      if (emailDoAluno) {
        // Procura o aluno que acabou de se cadastrar no site
        const alunosRef = admin.firestore().collection("alunos");
        const snapshot = await alunosRef.where("email", "==", emailDoAluno).get();

        if (!snapshot.empty) {
          const batch = admin.firestore().batch();
          snapshot.docs.forEach((doc) => {
            // Destranca o acesso padronizado em minúsculas
            batch.update(doc.ref, { status: "premium" });
          });
          await batch.commit();
          console.log(`Sucesso: Aluno ${emailDoAluno} atualizado para premium!`);
        } else {
          console.log(`Aviso: E-mail ${emailDoAluno} não encontrado. Ele pode ter pulado a etapa de cadastro.`);
        }
      }
    }

    res.status(200).send("Recebido com sucesso pela SuaOAB");
  } catch (error) {
    console.error("Erro interno no Webhook:", error);
    res.status(500).send("Erro interno do servidor");
  }
});