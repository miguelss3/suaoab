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

export const isAlunoPremiumReal = (aluno: AlunoComStatus) => {
  return normalizeAlunoStatus(aluno.status) === "premium" && !isAlunoSandbox(aluno);
};

export const countAlunosPremium = <T extends AlunoComStatus>(alunos: T[]) => {
  return alunos.filter(isAlunoPremiumReal).length;
};

export const calcularVagasVisiveis = (vagasTotais: unknown, matriculados: unknown) => {
  const total = Number(vagasTotais ?? 0);
  const ocupadas = Number(matriculados ?? 0);

  if (!Number.isFinite(total) || !Number.isFinite(ocupadas)) {
    return 0;
  }

  return Math.max(0, total - ocupadas);
};