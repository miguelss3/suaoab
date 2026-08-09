// src/lib/acervoDisciplina.ts
// Combina, numa lista só, tudo que já foi publicado para uma disciplina —
// usado pelo LinksEditor para deixar o admin escolher um link a partir de
// material que já existe no site, em vez de só colar uma URL manualmente.
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type OrigemAcervo = "Direito Material" | "Direito Processual" | "Laboratório de Peças" | "Publicados" | "Videoaulas";

export interface AcervoItem {
  nome: string;
  url: string;
  origem: OrigemAcervo;
}

export const useAcervoDisciplina = (materia: string) => {
  const [itens, setItens] = useState<AcervoItem[]>([]);

  useEffect(() => {
    if (!materia) {
      setItens([]);
      return;
    }

    let cancelado = false;

    const carregar = async () => {
      try {
        const [disciplinaSnap, materiaisSnap, aulasSnap] = await Promise.all([
          getDoc(doc(db, "disciplinas", materia)),
          getDocs(query(collection(db, "materiais_publicados"), where("materia", "==", materia))),
          getDocs(query(collection(db, "aulas_globais"), where("materia", "==", materia))),
        ]);

        const resultado: AcervoItem[] = [];

        if (disciplinaSnap.exists()) {
          const data = disciplinaSnap.data();
          (data.materialTeorico || []).forEach((item: { nome?: string; url_pdf?: string }) => {
            if (item.url_pdf) resultado.push({ nome: item.nome || "Sem nome", url: item.url_pdf, origem: "Direito Material" });
          });
          (data.processualTeorico || []).forEach((item: { nome?: string; url_pdf?: string }) => {
            if (item.url_pdf) resultado.push({ nome: item.nome || "Sem nome", url: item.url_pdf, origem: "Direito Processual" });
          });
          (data.pecas || []).forEach((item: { nome?: string; url_pdf?: string }) => {
            if (item.url_pdf) resultado.push({ nome: item.nome || "Sem nome", url: item.url_pdf, origem: "Laboratório de Peças" });
          });
        }

        materiaisSnap.docs.forEach((docSnap) => {
          const data = docSnap.data() as { titulo?: string; url_pdf?: string };
          if (data.url_pdf) resultado.push({ nome: data.titulo || "Sem título", url: data.url_pdf, origem: "Publicados" });
        });

        aulasSnap.docs.forEach((docSnap) => {
          const data = docSnap.data() as { titulo?: string; youtubeId?: string };
          if (data.youtubeId) {
            resultado.push({ nome: data.titulo || "Sem título", url: `https://www.youtube.com/watch?v=${data.youtubeId}`, origem: "Videoaulas" });
          }
        });

        if (!cancelado) setItens(resultado);
      } catch (error) {
        console.error("Erro ao carregar acervo da disciplina:", error);
        if (!cancelado) setItens([]);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [materia]);

  return itens;
};
