interface AlunoComStatus {
  id?: string;
  email?: string;
  status?: string | null;
}

export const normalizeAlunoStatus = (status?: string | null) => status?.trim().toLowerCase() ?? "";

// Aluno de Graduação tem acesso vitalício: nunca entra em degustação, auto-inativação
// ou nas métricas de Premium/Leads (tem funil e aba próprios no CRM).
export const alunoEhGraduacao = (aluno: { faseEstudo?: string; acessoVitalicio?: boolean }) => {
  if (aluno.acessoVitalicio === true) return true;
  const fase = aluno.faseEstudo?.trim().toLowerCase();
  return fase === "estudante de graduação" || fase === "graduacao";
};

export const MOTIVOS_INATIVIDADE = [
  { value: "ciclo_expirado", label: "Ciclo expirado" },
  { value: "nao_renovou", label: "Não renovou" },
  { value: "sem_engajamento", label: "Sem engajamento" },
  { value: "outro", label: "Outro" },
] as const;

export type MotivoInatividade = (typeof MOTIVOS_INATIVIDADE)[number]["value"];

// Converte campos de data do Firestore (Timestamp, Date ou string) para Date, ou null se ausente/inválido.
export const paraData = (valor: unknown): Date | null => {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor === "string") {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof valor === "object" && "toDate" in (valor as Record<string, unknown>) && typeof (valor as { toDate: () => Date }).toDate === "function") {
    return (valor as { toDate: () => Date }).toDate();
  }
  return null;
};

export const isAlunoSandbox = (aluno: Pick<AlunoComStatus, "id" | "email">) => {
  const email = aluno.email?.trim().toLowerCase();

  return (
    aluno.id === "admin_sandbox_uid" ||
    email === "miguelss3@yahoo.com.br" ||
    email === "sandbox@suaoab.com.br"
  );
};

export type CategoriaAluno = "sandbox" | "graduacao" | "premium" | "inativo" | "em_teste";

export interface AlunoParaClassificar {
  id?: string;
  email?: string;
  status?: string | null;
  faseEstudo?: string;
  acessoVitalicio?: boolean;
}

/**
 * Fonte única de verdade para classificar um aluno. Toda tela que exibe
 * contagens (Alunos CRM, Painel de Vendas, Ciclos e Prazos) deve usar esta
 * função — nunca reimplementar o filtro localmente, para os números nunca
 * divergirem entre telas.
 */
export const classificarAluno = (aluno: AlunoParaClassificar): CategoriaAluno => {
  if (isAlunoSandbox(aluno)) return "sandbox";
  if (alunoEhGraduacao(aluno)) return "graduacao";

  const status = normalizeAlunoStatus(aluno.status);
  if (status === "premium") return "premium";
  if (status === "inativo") return "inativo";
  return "em_teste";
};

export const isAlunoPremiumReal = (aluno: AlunoParaClassificar) => classificarAluno(aluno) === "premium";

export const countAlunosPremium = <T extends AlunoParaClassificar>(alunos: T[]) => {
  return alunos.filter(isAlunoPremiumReal).length;
};

export const calcularVagasVisiveis = (vagasTotais: unknown, matriculados: unknown, tetoVagasExibidas?: unknown) => {
  const total = Number(vagasTotais ?? 0);
  const ocupadas = Number(matriculados ?? 0);

  if (!Number.isFinite(total) || !Number.isFinite(ocupadas)) {
    return 0;
  }

  const vagasReais = Math.max(0, total - ocupadas);

  // `Number("")` é 0 em JS — trata explicitamente como "sem teto" em vez de "teto zero".
  if (tetoVagasExibidas === undefined || tetoVagasExibidas === null || tetoVagasExibidas === "") {
    return vagasReais;
  }

  const teto = Number(tetoVagasExibidas);
  if (Number.isFinite(teto) && teto >= 0) {
    return Math.min(vagasReais, teto);
  }

  return vagasReais;
};

// Janela (em dias antes da prova) em que o teto de vagas passa a decair linearmente
// até `vagasMinimas`, para intensificar a urgência conforme a 2ª fase se aproxima.
export const JANELA_DECAIMENTO_VAGAS_DIAS = 30;

export const calcularTetoComDecaimento = (
  tetoBase: number,
  vagasMinimas: number,
  dataProva: Date | null,
  hoje: Date = new Date()
): number => {
  if (!Number.isFinite(tetoBase)) return tetoBase;
  if (!dataProva || Number.isNaN(dataProva.getTime())) return tetoBase;

  const minimo = Number.isFinite(vagasMinimas) ? Math.max(0, vagasMinimas) : 0;
  const diasParaProva = (dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);

  if (diasParaProva >= JANELA_DECAIMENTO_VAGAS_DIAS) return tetoBase;
  if (diasParaProva <= 0) return Math.min(tetoBase, minimo);

  const progresso = 1 - diasParaProva / JANELA_DECAIMENTO_VAGAS_DIAS; // 0 no início da janela, 1 no dia da prova
  const valorInterpolado = tetoBase - progresso * (tetoBase - minimo);
  return Math.max(minimo, Math.round(valorInterpolado));
};