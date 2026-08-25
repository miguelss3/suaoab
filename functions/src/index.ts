import * as admin from "firebase-admin";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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

const ALLOWED_STORAGE_BUCKETS = new Set(["sua-oab.firebasestorage.app", "sua-oab.appspot.com"]);

const normalizeEmail = (email?: string | null) => (typeof email === "string" ? email.trim().toLowerCase() : "");

// Contas que o webhook da Hotmart nunca deve tocar, mesmo que o e-mail do
// comprador bata por coincidência: a conta de simulação do professor, e
// qualquer aluno de Graduação (acesso vitalício, fora do funil de Premium).
// Espelha a mesma classificação usada em src/lib/ciclo.ts no front-end e em
// `manutencaoDiariaAlunos` mais abaixo — qualquer mudança nessa regra de
// negócio deve ser replicada nos três lugares.
const isSandboxAluno = (id: string, email: unknown) => {
  const emailNormalizado = normalizeEmail(typeof email === "string" ? email : undefined);
  return id === "admin_sandbox_uid" || emailNormalizado === "miguelss3@yahoo.com.br" || emailNormalizado === "sandbox@suaoab.com.br";
};

const isGraduacaoAluno = (faseEstudo: unknown, acessoVitalicio: unknown) => {
  if (acessoVitalicio === true) return true;
  const fase = typeof faseEstudo === "string" ? faseEstudo.trim().toLowerCase() : "";
  return fase === "estudante de graduação" || fase === "graduacao";
};

// Extrai o ID único da transação do payload da Hotmart (data.purchase.transaction),
// usado para não reprocessar o mesmo evento duas vezes se a Hotmart reenviar
// o webhook (retry) — comportamento documentado da própria Hotmart.
const extrairTransactionId = (dados: unknown): string | undefined => {
  if (!dados || typeof dados !== "object") return undefined;
  const data = (dados as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return undefined;
  const purchase = (data as Record<string, unknown>).purchase;
  if (!purchase || typeof purchase !== "object") return undefined;
  const transaction = (purchase as Record<string, unknown>).transaction;
  return typeof transaction === "string" ? transaction : undefined;
};

const isAllowedStorageUrl = (value?: string) => {
  if (!value) return false;

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:") return false;

    if (parsed.hostname === "firebasestorage.googleapis.com") {
      return [...ALLOWED_STORAGE_BUCKETS].some((bucket) => parsed.pathname.includes(`/b/${bucket}/`));
    }

    if (parsed.hostname === "storage.googleapis.com") {
      return [...ALLOWED_STORAGE_BUCKETS].some((bucket) => parsed.pathname.includes(`/${bucket}/`));
    }

    return false;
  } catch {
    return false;
  }
};

// Retorna os documentos (não só as referências) já deduplicados por caminho —
// precisamos ler os dados de cada aluno pra decidir se ele é protegido
// (sandbox/graduação) e se o evento já foi aplicado antes (idempotência).
const localizarAlunosPorEmail = async (email: string, emailOriginal?: string) => {
  const alunosRef = db.collection("alunos");
  const consultas = [alunosRef.where("email_normalizado", "==", email).get(), alunosRef.where("email", "==", email).get()];

  if (emailOriginal && emailOriginal !== email) {
    consultas.push(alunosRef.where("email", "==", emailOriginal).get());
  }

  const resultados = await Promise.all(consultas);
  const porCaminho = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  resultados.forEach((snapshot) => snapshot.docs.forEach((docSnap) => porCaminho.set(docSnap.ref.path, docSnap)));
  return [...porCaminho.values()];
};

interface ResultadoAtualizacaoHotmart {
  encontrados: number;
  atualizados: number;
  ignoradosProtegidos: number;
  ignoradosIdempotentes: number;
}

const atualizarStatusAlunosHotmart = async (
  emailOriginal: string,
  status: "premium" | "inativo",
  ultimoEvento: string,
  transactionId?: string
): Promise<ResultadoAtualizacaoHotmart> => {
  const resultado: ResultadoAtualizacaoHotmart = { encontrados: 0, atualizados: 0, ignoradosProtegidos: 0, ignoradosIdempotentes: 0 };

  const emailNormalizado = normalizeEmail(emailOriginal);
  if (!emailNormalizado) return resultado;

  const docs = await localizarAlunosPorEmail(emailNormalizado, emailOriginal);
  resultado.encontrados = docs.length;
  if (docs.length === 0) return resultado;

  const batch = db.batch();
  let temEscrita = false;

  docs.forEach((docSnap) => {
    const dados = docSnap.data();

    // Nunca mexe em conta de simulação do professor nem em aluno de Graduação
    // (acesso vitalício, fora do funil de Premium) — mesmo que o e-mail bata.
    if (isSandboxAluno(docSnap.id, dados.email) || isGraduacaoAluno(dados.faseEstudo, dados.acessoVitalicio)) {
      resultado.ignoradosProtegidos += 1;
      console.warn("[hotmartWebhook] Aluno protegido (sandbox/graduação) — webhook não altera este cadastro.", {
        alunoId: docSnap.id,
        email: emailNormalizado,
        evento: ultimoEvento,
      });
      return;
    }

    const statusAtual = typeof dados.status === "string" ? dados.status : "";

    // Idempotência: mesma transação da Hotmart já aplicada e status já é o
    // desejado — não reprocessa (a Hotmart pode reenviar o mesmo webhook).
    const mesmaTransacaoJaAplicada = !!transactionId && dados.ultima_transacao_hotmart === transactionId;
    if (statusAtual === status && mesmaTransacaoJaAplicada) {
      resultado.ignoradosIdempotentes += 1;
      console.log("[hotmartWebhook] Evento já processado antes (mesma transação e status) — ignorado.", {
        alunoId: docSnap.id,
        email: emailNormalizado,
        evento: ultimoEvento,
        transactionId,
      });
      return;
    }

    // Só carimba a data de conversão na transição real para premium — evita
    // que um webhook duplicado "reinicie" a data usada no gráfico do Painel
    // de Vendas.
    const viraPremiumAgora = status === "premium" && statusAtual !== "premium";

    batch.set(
      docSnap.ref,
      {
        status,
        email_normalizado: emailNormalizado,
        ultimo_evento_hotmart: ultimoEvento,
        atualizado_em_hotmart: admin.firestore.FieldValue.serverTimestamp(),
        ...(transactionId ? { ultima_transacao_hotmart: transactionId } : {}),
        ...(viraPremiumAgora ? { data_conversao_premium: admin.firestore.FieldValue.serverTimestamp() } : {}),
      },
      { merge: true }
    );
    temEscrita = true;
    resultado.atualizados += 1;

    console.log("[hotmartWebhook] Status do aluno será atualizado.", {
      alunoId: docSnap.id,
      email: emailNormalizado,
      statusAnterior: statusAtual || "(vazio)",
      statusNovo: status,
      evento: ultimoEvento,
      transactionId,
    });
  });

  if (temEscrita) await batch.commit();
  return resultado;
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

  const pendencia = pendenciaSnap.data() as { status_desejado?: "premium" | "inativo"; pendente?: boolean; payload?: unknown } | undefined;
  if (!pendencia?.pendente || !pendencia.status_desejado) {
    return { reconciliado: false, status: pendencia?.status_desejado, quantidade: 0 };
  }

  const transactionId = extrairTransactionId(pendencia.payload);
  const resultado = await atualizarStatusAlunosHotmart(email, pendencia.status_desejado, `PENDENCIA_${origem.toUpperCase()}`, transactionId);
  console.log("[reconciliarCompraHotmart] Reconciliação manual executada.", { email, origem, ...resultado });

  if (resultado.atualizados > 0) {
    await concluirPendenciaHotmart(email, pendencia.status_desejado, origem);
    return { reconciliado: true, status: pendencia.status_desejado, quantidade: resultado.atualizados };
  }

  return { reconciliado: false, status: pendencia.status_desejado, quantidade: 0 };
};

// Decide o que fazer com o resultado de `atualizarStatusAlunosHotmart` dentro
// do webhook: fecha a pendência se algo mudou de fato, só registra em log se
// não havia nada a mudar (idempotente ou conta protegida), ou cria/atualiza
// uma pendência para reconciliação manual se nenhum cadastro foi encontrado
// com o e-mail do comprador.
const tratarResultadoHotmart = async (
  resultado: ResultadoAtualizacaoHotmart,
  emailNormalizado: string,
  status: "premium" | "inativo",
  evento: string,
  payload: unknown
) => {
  if (resultado.atualizados > 0) {
    await concluirPendenciaHotmart(emailNormalizado, status, "webhook");
    console.log(`[hotmartWebhook] Sucesso: ${resultado.atualizados} aluno(s) com e-mail ${emailNormalizado} atualizado(s) para ${status}.`, resultado);
    return;
  }

  if (resultado.ignoradosIdempotentes > 0 || resultado.ignoradosProtegidos > 0) {
    console.log(`[hotmartWebhook] Nenhuma alteração necessária para ${emailNormalizado} (evento já processado ou conta protegida).`, resultado);
    return;
  }

  // resultado.encontrados === 0: nenhum cadastro com esse e-mail — provável
  // compra feita com um e-mail diferente do usado no cadastro do site.
  await salvarPendenciaHotmart(emailNormalizado, status, evento, payload);
  console.warn(`[hotmartWebhook] Nenhum aluno encontrado para ${emailNormalizado} — pendência registrada para reconciliação manual no painel.`, { evento });
};

export const nextMatricula = onCall(async () => {
  const counterRef = db.doc("configuracoes/contador_matricula");
  const currentYearFloor = Number(`${new Date().getFullYear()}000`);

  try {
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
  } catch (error) {
    console.error("Erro ao gerar proxima matricula:", {
      mensagem: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new HttpsError("internal", "Nao foi possivel gerar a matricula no momento.");
  }
});

export const downloadPdfSource = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Metodo nao permitido");
    return;
  }

  const originalUrl = typeof req.query.url === "string" ? req.query.url : "";

  if (!isAllowedStorageUrl(originalUrl)) {
    res.status(400).send("URL de origem nao permitida");
    return;
  }

  try {
    const upstreamResponse = await fetch(originalUrl);

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).send("Falha ao obter PDF de origem");
      return;
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get("content-type") || "application/pdf";

    // Cache público: permite que o CDN do Google sirva o PDF sem ir até o Storage,
    // reduzindo drasticamente a latência em downloads subsequentes.
    res.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
    res.set("Content-Type", contentType);
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Erro ao obter PDF via proxy:", error);
    res.status(500).send("Erro ao obter PDF");
  }
});

export const reconciliarCompraHotmart = onCall(async (request) => {
  const emailAuth = typeof request.auth?.token?.email === "string" ? request.auth.token.email : undefined;
  const emailBody = typeof request.data?.email === "string" ? request.data.email : undefined;
  const email = normalizeEmail(emailBody || emailAuth);

  try {
    return await reconciliarPendenciaHotmart(email, "cadastro");
  } catch (error) {
    // Sem isso, qualquer exceção aqui dentro virava um "internal" genérico para o
    // cliente sem nenhum rastro no log do servidor sobre a causa real.
    console.error("Erro ao reconciliar pendencia Hotmart:", {
      email,
      autenticado: !!request.auth,
      mensagem: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new HttpsError("internal", "Nao foi possivel reconciliar a compra no momento.");
  }
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
      console.warn("[hotmartWebhook] Tentativa de invasão bloqueada: Hottok inválido.", { hottokHeader: !!hottokHeader, hottokBody: !!hottokBody });
      res.status(401).send("Acesso não autorizado");
      return;
    }

    try {
      const dados = req.body as {
        event?: string;
        data?: { buyer?: { email?: string }; purchase?: { transaction?: string } };
      };
      const evento = String(dados.event || "");
      const emailOriginal = dados.data?.buyer?.email || "";
      const emailNormalizado = normalizeEmail(emailOriginal);
      const transactionId = extrairTransactionId(dados);

      // Log de recebimento — primeira coisa registrada, antes de qualquer
      // processamento, pra sempre ter rastro mesmo se algo falhar depois.
      console.log("[hotmartWebhook] Evento recebido.", {
        evento,
        email: emailNormalizado || "(sem email)",
        transactionId: transactionId || "(sem id)",
      });

      await registrarEventoHotmart(evento, emailNormalizado, dados);

      if (!emailNormalizado) {
        console.warn("[hotmartWebhook] Evento recebido sem e-mail do comprador — nada a processar.", { evento });
        res.status(200).send("Recebido sem email");
        return;
      }

      if (evento === "PURCHASE_APPROVED") {
        const resultado = await atualizarStatusAlunosHotmart(emailOriginal, "premium", evento, transactionId);
        await tratarResultadoHotmart(resultado, emailNormalizado, "premium", evento, dados);
      } else if (HOTMART_REVERSAL_EVENTS.has(evento)) {
        const resultado = await atualizarStatusAlunosHotmart(emailOriginal, "inativo", evento, transactionId);
        await tratarResultadoHotmart(resultado, emailNormalizado, "inativo", evento, dados);
      } else {
        console.log("[hotmartWebhook] Evento sem ação de status configurada — só registrado no histórico.", { evento, email: emailNormalizado });
      }

      res.status(200).send("Recebido com sucesso pela SuaOAB");
    } catch (error) {
      console.error("[hotmartWebhook] Erro interno no Webhook:", error);
      res.status(500).send("Erro interno do servidor");
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Manutenção diária: inativação por expiração + sincronização de vagas.
// Espelha a classificação de src/lib/ciclo.ts (front-end) — qualquer mudança
// nas regras de negócio (graduação, sandbox, expiração) deve ser replicada
// aqui também. Roda no servidor uma vez por dia, independente de qualquer
// admin estar com o painel aberto no navegador. (`isSandboxAluno`/`isGraduacaoAluno`
// estão definidas no topo do arquivo, reaproveitadas também pelo webhook da Hotmart.)
// ─────────────────────────────────────────────────────────────────────────

const paraDataFirestore = (valor: unknown): Date | null => {
  if (!valor) return null;
  if (valor instanceof admin.firestore.Timestamp) return valor.toDate();
  if (typeof valor === "string") {
    const parsed = new Date(valor);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (Array.isArray(valor) && valor.length > 0) return paraDataFirestore(valor[0]);
  return null;
};

// Mesma regra do calcularExpiracaoLead do front-end: `data_expiracao` explícita
// (premium de 90 dias ou trial já calculado) tem prioridade; sem ela, cai para
// 3 dias após `data_cadastro` (degustação padrão).
const alunoExpirou = (dados: FirebaseFirestore.DocumentData): boolean => {
  let limite: Date;

  if (dados.data_expiracao) {
    limite = paraDataFirestore(dados.data_expiracao) ?? new Date();
  } else if (dados.data_cadastro) {
    const base = paraDataFirestore(dados.data_cadastro) ?? new Date();
    limite = new Date(base.getTime());
    limite.setDate(limite.getDate() + 3);
  } else {
    return false;
  }

  return limite.getTime() <= Date.now();
};

const JANELA_DECAIMENTO_VAGAS_DIAS = 30;

// Espelha calcularTetoComDecaimento de src/lib/ciclo.ts.
const calcularTetoComDecaimento = (tetoBase: number, vagasMinimas: number, dataProva: Date | null): number => {
  if (!Number.isFinite(tetoBase)) return tetoBase;
  if (!dataProva || Number.isNaN(dataProva.getTime())) return tetoBase;

  const minimo = Number.isFinite(vagasMinimas) ? Math.max(0, vagasMinimas) : 0;
  const diasParaProva = (dataProva.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (diasParaProva >= JANELA_DECAIMENTO_VAGAS_DIAS) return tetoBase;
  if (diasParaProva <= 0) return Math.min(tetoBase, minimo);

  const progresso = 1 - diasParaProva / JANELA_DECAIMENTO_VAGAS_DIAS;
  const valorInterpolado = tetoBase - progresso * (tetoBase - minimo);
  return Math.max(minimo, Math.round(valorInterpolado));
};

export const manutencaoDiariaAlunos = onSchedule(
  { schedule: "every day 03:00", timeZone: "America/Manaus" },
  async () => {
    const alunosSnap = await db.collection("alunos").get();

    const batch = db.batch();
    let inativados = 0;
    const alunosVigentes: FirebaseFirestore.DocumentData[] = [];

    alunosSnap.docs.forEach((docSnap) => {
      const dados = docSnap.data();
      const status = typeof dados.status === "string" ? dados.status.trim().toLowerCase() : "";
      const sandbox = isSandboxAluno(docSnap.id, dados.email);
      const graduacao = isGraduacaoAluno(dados.faseEstudo, dados.acessoVitalicio);

      // Graduação (acesso vitalício) e a conta de simulação do professor nunca são
      // inativadas automaticamente nem entram nas métricas de matriculados.
      if (sandbox || graduacao) return;

      if (status !== "inativo" && alunoExpirou(dados)) {
        batch.update(docSnap.ref, { status: "inativo" });
        inativados += 1;
        return;
      }

      if (status !== "inativo") {
        alunosVigentes.push(dados);
      }
    });

    if (inativados > 0) {
      await batch.commit();
      console.log(`[manutencaoDiariaAlunos] ${inativados} aluno(s) inativado(s) por expiração.`);
    }

    const matriculados = alunosVigentes.filter((dados) => String(dados.status ?? "").trim().toLowerCase() === "premium").length;

    const cicloRef = db.doc("configuracoes/ciclo_atual");
    const cicloSnap = await cicloRef.get();
    if (!cicloSnap.exists) return;

    const ciclo = cicloSnap.data() ?? {};
    const vagasTotais = Number(ciclo.vagas_totais ?? 0);
    const tetoBase = ciclo.teto_vagas_exibidas;
    const decaimentoAtivo = ciclo.decaimento_vagas_ativo === true;
    const vagasMinimas = Number(ciclo.vagas_minimas_decaimento ?? 0);
    const dataProva = typeof ciclo.data_prova === "string" ? new Date(`${ciclo.data_prova}T12:00:00`) : null;

    let tetoEfetivo: number | undefined;
    if (tetoBase !== undefined && tetoBase !== null && tetoBase !== "" && Number.isFinite(Number(tetoBase))) {
      tetoEfetivo = decaimentoAtivo
        ? calcularTetoComDecaimento(Number(tetoBase), vagasMinimas, dataProva)
        : Number(tetoBase);
    }

    const vagasReais = Number.isFinite(vagasTotais) ? Math.max(0, vagasTotais - matriculados) : 0;
    const vagasRestantes = tetoEfetivo !== undefined ? Math.min(vagasReais, tetoEfetivo) : vagasReais;

    if (Number(ciclo.matriculados) !== matriculados || Number(ciclo.vagas_restantes) !== vagasRestantes) {
      await cicloRef.set({ matriculados, vagas_restantes: vagasRestantes }, { merge: true });
    }
  }
);