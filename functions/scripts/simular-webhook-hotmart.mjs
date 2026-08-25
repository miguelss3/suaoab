#!/usr/bin/env node
// functions/scripts/simular-webhook-hotmart.mjs
//
// Simula o payload que a Hotmart envia pro webhook `hotmartWebhook`, sem
// precisar de uma compra real — pra validar a lógica de ponta a ponta antes
// de testar com uma compra de teste de verdade no Hotmart.
//
// COMO USAR (recomendado — contra o emulador local, nunca contra produção):
//   1) Nesta pasta (functions/), crie o arquivo `.secret.local` (já é
//      ignorado pelo git) com uma linha:
//        HOTMART_HOTTOK=qualquer-valor-que-voce-escolher-para-teste
//   2) Suba os emuladores de Functions + Firestore juntos (importante: os
//      dois juntos, senão a função grava direto no Firestore de produção):
//        npm run build && firebase emulators:start --only functions,firestore
//   3) Em outro terminal, rode este script (Node 18+, precisa de `fetch` global):
//        node scripts/simular-webhook-hotmart.mjs --email=teste@exemplo.com
//
// Depois de rodar, confira no terminal do emulador os logs do
// "[hotmartWebhook] ..." e, no Emulator UI (normalmente http://127.0.0.1:4000),
// o documento em `alunos` com esse e-mail virando status "premium".
//
// Flags disponíveis:
//   --email=...         (obrigatório) e-mail do "comprador" simulado
//   --event=...          padrão: PURCHASE_APPROVED
//                         (outros úteis pra testar reversão: PURCHASE_CANCELED,
//                         PURCHASE_REFUNDED, PURCHASE_CHARGEBACK)
//   --transaction=...    padrão: um ID único gerado na hora (útil pra testar
//                         idempotência: rode duas vezes com o MESMO --transaction
//                         e confirme no log que a segunda vez é ignorada)
//   --url=...            padrão: http://127.0.0.1:5001/sua-oab/us-central1/hotmartWebhook
//                         (troque pela URL da função implantada só se tiver
//                         MUITA certeza — isso grava no Firestore de verdade)
//   --hottok=...         padrão: lê de HOTMART_HOTTOK (env) ou "teste-local"

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [chave, ...valor] = arg.replace(/^--/, "").split("=");
    return [chave, valor.join("=")];
  })
);

if (!args.email) {
  console.error("Uso: node scripts/simular-webhook-hotmart.mjs --email=teste@exemplo.com [--event=PURCHASE_APPROVED] [--transaction=...] [--url=...] [--hottok=...]");
  process.exit(1);
}

const email = args.email;
const evento = args.event || "PURCHASE_APPROVED";
const transaction = args.transaction || `TESTE-${Date.now()}`;
const url = args.url || "http://127.0.0.1:5001/sua-oab/us-central1/hotmartWebhook";
const hottok = args.hottok || process.env.HOTMART_HOTTOK || "teste-local";

const payload = {
  id: `evento-teste-${Date.now()}`,
  creation_date: Date.now(),
  event: evento,
  version: "2.0.0",
  hottok,
  data: {
    product: { id: 0, name: "SuaOAB - Simulação Local" },
    buyer: { email, name: "Aluno de Teste" },
    purchase: {
      transaction,
      status: evento === "PURCHASE_APPROVED" ? "APPROVED" : "CANCELLED",
      approved_date: Date.now(),
      price: { value: 197, currency_value: "BRL" },
    },
  },
};

console.log(`Enviando "${evento}" para ${url}`);
console.log(`  email: ${email}`);
console.log(`  transaction: ${transaction}`);

const resposta = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Hotmart-Hottok": hottok,
  },
  body: JSON.stringify(payload),
});

const corpo = await resposta.text();
console.log(`\nResposta: ${resposta.status} ${resposta.statusText}`);
console.log(corpo);
