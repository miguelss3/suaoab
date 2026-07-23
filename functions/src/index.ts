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
        // Usado pelo Painel de Vendas para o gráfico de evolução de matrículas Premium.
        ...(status === "premium" ? { data_conversao_premium: admin.firestore.FieldValue.serverTimestamp() } : {}),
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

// ─────────────────────────────────────────────────────────────────────────
// Manutenção diária: inativação por expiração + sincronização de vagas.
// Espelha a classificação de src/lib/ciclo.ts (front-end) — qualquer mudança
// nas regras de negócio (graduação, sandbox, expiração) deve ser replicada
// aqui também. Roda no servidor uma vez por dia, independente de qualquer
// admin estar com o painel aberto no navegador.
// ─────────────────────────────────────────────────────────────────────────

const isSandboxAluno = (id: string, email: unknown) => {
  const emailNormalizado = normalizeEmail(typeof email === "string" ? email : undefined);
  return id === "admin_sandbox_uid" || emailNormalizado === "miguelss3@yahoo.com.br" || emailNormalizado === "sandbox@suaoab.com.br";
};

const isGraduacaoAluno = (faseEstudo: unknown, acessoVitalicio: unknown) => {
  if (acessoVitalicio === true) return true;
  const fase = typeof faseEstudo === "string" ? faseEstudo.trim().toLowerCase() : "";
  return fase === "estudante de graduação" || fase === "graduacao";
};

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