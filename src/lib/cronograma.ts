// src/lib/cronograma.ts
// Ponte entre o cronograma-modelo (Montagem de Cronograma, por disciplina) e as
// metas reais atribuídas a um aluno — usado tanto no cadastro de um aluno novo
// quanto na aplicação retroativa do modelo a alunos já ativos.
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CodigoDisciplinaSegundaFase } from "@/lib/disciplinasSegundaFase";

export interface MetaTemplateItem {
  atividade: string;
  orientacoes: string;
  diaRelativo: number;
}

export interface MetaGerada {
  atividade: string;
  orientacoes: string;
  link: string;
  status: "liberada" | "bloqueada";
  concluida: boolean;
  data_sugerida: string;
}

export const DOC_CRONOGRAMA_TEMPLATES = doc(db, "configuracoes", "cronograma_templates");

export const buscarCronogramaTemplate = async (disciplina: CodigoDisciplinaSegundaFase): Promise<MetaTemplateItem[]> => {
  try {
    const snap = await getDoc(DOC_CRONOGRAMA_TEMPLATES);
    if (!snap.exists()) return [];
    const data = snap.data() as Record<string, MetaTemplateItem[]>;
    return Array.isArray(data[disciplina]) ? data[disciplina] : [];
  } catch (error) {
    console.error("Erro ao buscar cronograma-modelo:", error);
    return [];
  }
};

// Converte o cronograma-modelo (dias relativos ao início) em metas reais, com
// datas a partir de `dataBase`. Segue a mesma convenção do gerador de rota
// (MotorRota): as duas primeiras metas nascem liberadas, o resto bloqueado.
export const gerarMetasDoTemplate = (template: MetaTemplateItem[], dataBase: Date): MetaGerada[] => {
  return template.map((item, indice) => {
    const data = new Date(dataBase);
    data.setDate(data.getDate() + item.diaRelativo);
    return {
      atividade: item.atividade,
      orientacoes: item.orientacoes,
      link: "",
      status: indice === 0 ? "liberada" : "bloqueada",
      concluida: false,
      data_sugerida: data.toISOString(),
    };
  });
};
