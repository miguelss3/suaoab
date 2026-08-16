// src/lib/cronograma.ts
// Ponte entre o cronograma-modelo (Montagem de Cronograma, por disciplina) e as
// metas reais atribuídas a um aluno — usado tanto no cadastro de um aluno novo
// quanto na aplicação retroativa do modelo a alunos já ativos.
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CodigoDisciplinaSegundaFase } from "@/lib/disciplinasSegundaFase";

export interface LinkMeta {
  titulo: string;
  url: string;
}

export interface MetaTemplateItem {
  atividade: string;
  orientacoes: string;
  diaRelativo: number;
  link?: string;
  links?: LinkMeta[];
  arquivo_url?: string;
  arquivo_nome?: string;
}

export interface MetaGerada {
  atividade: string;
  orientacoes: string;
  link: string;
  links?: LinkMeta[];
  arquivo_url?: string;
  arquivo_nome?: string;
  status: "liberada" | "bloqueada" | "concluida" | "pulada";
  concluida: boolean;
  data_sugerida: string;
}

export interface MetaExistente {
  status?: string;
  concluida?: boolean;
}

// Formato salvo em configuracoes/cronograma_templates, um por disciplina.
// `dataReferencia` (yyyy-mm-dd) é persistida em vez de recalculada a cada
// sessão — sem isso, reabrir a tela em outro dia deslocava a exibição de
// todas as metas, dando a impressão de que o sistema mudava as datas sozinho.
export interface CronogramaTemplateDisciplina {
  metas: MetaTemplateItem[];
  dataReferencia?: string;
}

// Documentos salvos antes dessa mudança guardam o array direto, sem o
// envelope { metas, dataReferencia } — aceito nos dois formatos.
type CronogramaTemplateSalvo = MetaTemplateItem[] | CronogramaTemplateDisciplina;

const extrairMetas = (valor: CronogramaTemplateSalvo | undefined): MetaTemplateItem[] => {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor;
  return Array.isArray(valor.metas) ? valor.metas : [];
};

export const DOC_CRONOGRAMA_TEMPLATES = doc(db, "configuracoes", "cronograma_templates");

export const buscarCronogramaTemplate = async (disciplina: CodigoDisciplinaSegundaFase): Promise<MetaTemplateItem[]> => {
  try {
    const snap = await getDoc(DOC_CRONOGRAMA_TEMPLATES);
    if (!snap.exists()) return [];
    const data = snap.data() as Record<string, CronogramaTemplateSalvo>;
    return extrairMetas(data[disciplina]);
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
      link: item.link || "",
      links: item.links || [],
      arquivo_url: item.arquivo_url || "",
      arquivo_nome: item.arquivo_nome || "",
      status: indice === 0 ? "liberada" : "bloqueada",
      concluida: false,
      data_sugerida: data.toISOString(),
    };
  });
};

// Reaplica o cronograma-modelo a um aluno que já está estudando, sem apagar o
// progresso que ele já tinha: para cada meta que o aluno já possuía naquela
// posição, mantém `status`/`concluida` (liberada, bloqueada, concluída ou
// pulada) e só atualiza o conteúdo (texto, links, anexo, data sugerida) com a
// versão mais recente do template. Metas novas (além do que o aluno já tinha)
// nascem como o template manda; metas extras que o aluno tinha além do
// template (inseridas manualmente no Dossiê) são preservadas no final, intactas.
export const mesclarMetasComTemplate = (
  metasExistentes: MetaExistente[],
  template: MetaTemplateItem[],
  dataBase: Date
): MetaGerada[] => {
  const metasGeradas = gerarMetasDoTemplate(template, dataBase);

  const mescladas = metasGeradas.map((gerada, indice) => {
    const existente = metasExistentes[indice];
    if (!existente) return gerada;
    return {
      ...gerada,
      status: (existente.status as MetaGerada["status"]) || gerada.status,
      concluida: existente.concluida ?? gerada.concluida,
    };
  });

  const extras = metasExistentes.slice(metasGeradas.length) as unknown as MetaGerada[];
  return [...mescladas, ...extras];
};
