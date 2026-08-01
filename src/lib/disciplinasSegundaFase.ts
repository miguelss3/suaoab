// src/lib/disciplinasSegundaFase.ts
// Fonte única das disciplinas de 2ª Fase (Administrativo, Penal, Tributário) e de
// quais estão habilitadas para novos cadastros. O professor hoje só consegue
// atender Direito Penal; as outras ficam "Em breve" até serem habilitadas.
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type CodigoDisciplinaSegundaFase = "DADM" | "DPEN" | "DTRI";

export const DISCIPLINAS_SEGUNDA_FASE: { codigo: CodigoDisciplinaSegundaFase; nome: string }[] = [
  { codigo: "DADM", nome: "Direito Administrativo" },
  { codigo: "DPEN", nome: "Direito Penal" },
  { codigo: "DTRI", nome: "Direito Tributário" },
];

export type DisciplinasAtivasMap = Record<CodigoDisciplinaSegundaFase, boolean>;

// Enquanto a configuração não é carregada (ou não existe ainda no Firestore),
// assume-se apenas Direito Penal habilitado — reflete a situação real de hoje
// em vez de liberar tudo por padrão.
export const DISCIPLINAS_ATIVAS_PADRAO: DisciplinasAtivasMap = {
  DADM: false,
  DPEN: true,
  DTRI: false,
};

export const DOC_DISCIPLINAS_SEGUNDA_FASE = doc(db, "configuracoes", "disciplinas_segunda_fase");

export const parseDisciplinasAtivas = (data: Record<string, unknown> | undefined): DisciplinasAtivasMap => {
  if (!data) return DISCIPLINAS_ATIVAS_PADRAO;

  const resultado = { ...DISCIPLINAS_ATIVAS_PADRAO };
  for (const { codigo } of DISCIPLINAS_SEGUNDA_FASE) {
    if (typeof data[codigo] === "boolean") {
      resultado[codigo] = data[codigo] as boolean;
    }
  }
  return resultado;
};

export const escutarDisciplinasAtivas = (callback: (ativas: DisciplinasAtivasMap) => void) => {
  return onSnapshot(
    DOC_DISCIPLINAS_SEGUNDA_FASE,
    (snap) => callback(parseDisciplinasAtivas(snap.data())),
    () => callback(DISCIPLINAS_ATIVAS_PADRAO)
  );
};

const formatarListaPt = (nomes: string[]) => {
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
};

// Frase usada na landing page para descrever o foco atual (ex.: "2ª Fase em Direito
// Penal (em breve: Direito Administrativo e Direito Tributário)"), sempre refletindo
// o que está habilitado em Ciclos e Prazos.
export const montarTextoFocoDisciplinas = (ativas: DisciplinasAtivasMap) => {
  const nomesAtivos = DISCIPLINAS_SEGUNDA_FASE.filter(({ codigo }) => ativas[codigo]).map((d) => d.nome);
  const nomesInativos = DISCIPLINAS_SEGUNDA_FASE.filter(({ codigo }) => !ativas[codigo]).map((d) => d.nome);

  const base = nomesAtivos.length > 0 ? `2ª Fase em ${formatarListaPt(nomesAtivos)}` : "2ª Fase da OAB";
  if (nomesInativos.length === 0) return base;
  return `${base} (em breve: ${formatarListaPt(nomesInativos)})`;
};
