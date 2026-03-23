export type DisciplinaCodigo = "DADM" | "DPEN" | "DTRI";

export interface FirestoreTimestampLike {
  toMillis?: () => number;
  toDate?: () => Date;
}

export interface AulaGlobal {
  id: string;
  titulo: string;
  materia: string;
  desc?: string;
  youtubeId: string;
  data_publicacao?: FirestoreTimestampLike | null;
}

export interface MaterialPublicado {
  id: string;
  titulo: string;
  tipo?: string;
  materia?: string;
  url_pdf?: string;
  data_publicacao?: FirestoreTimestampLike | null;
}

export interface PecaLaboratorio {
  nome: string;
  url_pdf?: string;
}

export interface HistoricoPeca {
  id: string;
  aluno_id?: string;
  nome_documento: string;
  status?: string;
  data_envio?: FirestoreTimestampLike | null;
  url_audio_feedback?: string;
  url_arquivo_corrigido?: string;
  url_corrigida?: string;
  observacao_professor?: string;
}

export interface MetaAluno {
  atividade?: string;
  orientacoes?: string;
  link?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  status?: string;
  concluida?: boolean;
}

export interface PerfilAlunoPortalBase {
  uid: string;
  nome?: string;
  materia?: string;
  metaZeroConcluida?: boolean;
}

export const getTimestampMillis = (value?: FirestoreTimestampLike | null) => value?.toMillis?.() ?? 0;