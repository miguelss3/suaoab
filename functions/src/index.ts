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
      // Navega no objeto (JSON) que a Hotmart envia para pegar o e-mail
      const emailDoAluno = dados.data?.buyer?.email;

      if (emailDoAluno) {
        // Procura o aluno no banco de dados
        const alunosRef = admin.firestore().collection("alunos");
        const snapshot = await alunosRef.where("email", "==", emailDoAluno).get();

        if (!snapshot.empty) {
          const batch = admin.firestore().batch();
          snapshot.docs.forEach((doc) => {
            // Atualiza o status
            batch.update(doc.ref, { status: "Premium" });
          });
          await batch.commit();
          console.log(`Sucesso: Aluno ${emailDoAluno} atualizado para Premium!`);
        } else {
          console.log(`Aviso: E-mail ${emailDoAluno} não encontrado.`);
        }
      }
    }

    res.status(200).send("Recebido com sucesso pela SuaOAB");
  } catch (error) {
    console.error("Erro interno no Webhook:", error);
    res.status(500).send("Erro interno do servidor");
  }
});