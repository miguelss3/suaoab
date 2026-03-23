interface AlunoComStatus {
  id?: string;
  email?: string;
  status?: string | null;
}

export const normalizeAlunoStatus = (status?: string | null) => status?.trim().toLowerCase() ?? "";

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