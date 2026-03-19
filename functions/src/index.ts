import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa o acesso ao banco de dados
admin.initializeApp();

export const hotmartWebhook = functions.https.onRequest(async (req, res) => {
  // Aceita apenas requisições POST da Hotmart
  if (req.method !== "POST") {
    res.status(405).send("Método não permitido");
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
            // Encontrou o aluno Lead! Agora destranca o acesso mudando para Premium
            batch.update(doc.ref, { status: "Premium" });
          });
          await batch.commit();
          console.log(`Sucesso: Aluno ${emailDoAluno} atualizado para Premium!`);
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