// src/components/aluno/GestorMetas.tsx
import { Dispatch, SetStateAction } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Link as LinkIcon, FileText, FastForward } from "lucide-react";
import { MetaAluno, PerfilAlunoPortalBase } from "@/lib/aulas";

type GestorMetasProps<TPerfil extends PerfilAlunoPortalBase> = {
  perfilAluno: TPerfil | null;
  setPerfilAluno: Dispatch<SetStateAction<TPerfil | null>>;
  metas: MetaAluno[];
  setMetas: Dispatch<SetStateAction<MetaAluno[]>>;
};

export const GestorMetas = <TPerfil extends PerfilAlunoPortalBase>({ perfilAluno, setPerfilAluno, metas, setMetas }: GestorMetasProps<TPerfil>) => {
  
  const handleStatusMeta = async (index: number, novoStatus: string) => {
    if (!perfilAluno) return;
    const novasMetas = [...metas];
    novasMetas[index].status = novoStatus;
    novasMetas[index].concluida = (novoStatus === "concluida"); 
    setMetas(novasMetas);
    await updateDoc(doc(db, "alunos", perfilAluno.uid), { metas: novasMetas });
  };

  return (
    <div className="space-y-4">
      <div className={`flex flex-col sm:flex-row justify-between gap-4 p-5 rounded-xl border-2 transition-all ${perfilAluno?.metaZeroConcluida ? "border-border bg-background shadow-sm" : "border-accent shadow-sm bg-accent/5"}`}>
        <div className="flex gap-4 items-start flex-1">
          <input 
            type="checkbox" 
            className="h-5 w-5 accent-success mt-1 shrink-0 cursor-pointer" 
            checked={!!perfilAluno?.metaZeroConcluida} 
            onChange={async (e) => {
              const isChecked = e.target.checked;
              setPerfilAluno({...perfilAluno, metaZeroConcluida: isChecked});
              await updateDoc(doc(db, "alunos", perfilAluno.uid), { metaZeroConcluida: isChecked });
            }} 
          />
          <div className="flex-1">
            {!perfilAluno?.metaZeroConcluida && (
              <span className="bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">Comece por aqui</span>
            )}
            <h4 className={`font-bold text-lg flex items-center gap-2 ${perfilAluno?.metaZeroConcluida ? "line-through opacity-50 text-muted-foreground" : "text-primary"}`}>
              Meta 0: Boas-Vindas e Ambientação
            </h4>
            <p className={`text-sm mt-1 leading-relaxed ${perfilAluno?.metaZeroConcluida ? "opacity-50" : "text-muted-foreground"}`}>
              Parabéns por chegar à 2ª Fase! Hoje, o seu único objetivo é respirar fundo, preparar o seu ambiente de estudos e assistir à aula inaugural.
            </p>
            {!perfilAluno?.metaZeroConcluida && (
              <Button variant="hero" size="sm" className="mt-3 font-bold" asChild>
                <Link to="/aula">Assistir Aula Inaugural</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {metas.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Nenhuma meta adicional definida pelo professor.</p>
      ) : (
        (() => {
          let metaCounter = 1; 
          return metas.map((m, i) => {
            if (m.atividade?.includes("Boas-Vindas")) return null;

            const currentMetaNum = metaCounter++;
            const isBloqueada = m.status === "bloqueada";
            const isPulada = m.status === "pulada";
            const isConcluida = m.status === "concluida" || m.concluida;

            if (isBloqueada) {
              return (
                <div key={i} className="flex gap-4 p-4 rounded-lg border border-dashed border-border bg-muted/20 opacity-50">
                  <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  <div><h4 className="font-bold text-muted-foreground">Meta {currentMetaNum}: Bloqueada</h4><p className="text-xs text-muted-foreground">Aguarde a liberação do seu mentor.</p></div>
                </div>
              )
            }

            return (
              <div key={i} className={`flex flex-col sm:flex-row justify-between gap-4 p-5 rounded-xl border-2 transition-all ${isPulada ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-background shadow-sm"}`}>
                <div className="flex gap-4 items-start flex-1">
                  <input type="checkbox" className="h-5 w-5 accent-success mt-1 shrink-0 cursor-pointer" checked={isConcluida} onChange={(e) => handleStatusMeta(i, e.target.checked ? "concluida" : "liberada")} />
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg flex items-center gap-2 ${isConcluida ? "line-through opacity-50 text-muted-foreground" : "text-primary"} ${isPulada ? "text-yellow-600" : ""}`}>
                      Meta {currentMetaNum}: {m.atividade}
                    </h4>
                    <p className={`text-sm mt-1 leading-relaxed ${isConcluida ? "opacity-50" : "text-muted-foreground"}`}>{m.orientacoes}</p>
                    
                    {(m.link || m.arquivo_url) && !isConcluida && (
                      <div className="flex flex-wrap gap-3 mt-4">
                        {m.link && (
                          <Button variant="outline" size="sm" className="font-bold text-accent border-accent/30 hover:bg-accent/10" asChild>
                            <a href={m.link} target="_blank" rel="noreferrer"><LinkIcon className="h-4 w-4 mr-2" /> Acessar Link</a>
                          </Button>
                        )}
                        {m.arquivo_url && (
                          <Button variant="outline" size="sm" className="font-bold text-success border-success/30 hover:bg-success/10" asChild>
                            <a href={m.arquivo_url} target="_blank" rel="noreferrer"><FileText className="h-4 w-4 mr-2" /> {m.arquivo_nome || "Baixar Anexo"}</a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!isConcluida && (
                  <div className="shrink-0 flex items-center mt-4 sm:mt-0">
                    {isPulada ? (
                      <Button size="sm" variant="default" className="w-full sm:w-auto font-bold" onClick={() => handleStatusMeta(i, "liberada")}>Retomar Meta</Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="w-full sm:w-auto text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10 font-bold" onClick={() => handleStatusMeta(i, "pulada")}>
                        <FastForward className="h-4 w-4 mr-2" /> Pular
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()
      )}
    </div>
  );
};