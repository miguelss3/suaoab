// src/components/admin/PublicarMaterial.tsx
// Reúne, numa única aba do painel, os motores de publicação de conteúdo
// (Publicados, Material e Processual, Laboratório de Peças, Videoaulas e o
// atalho de Simulados) que antes ocupavam abas separadas no dashboard —
// reduz a quantidade de abas sem remover nenhuma função.
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, PlayCircle, Scale, Timer } from "lucide-react";

const GestaoMateriais = lazy(() => import("@/components/admin/GestaoMateriais"));
const GestaoMaterialProcessual = lazy(() => import("@/components/admin/GestaoMaterialProcessual"));
const GestaoPecas = lazy(() => import("@/components/admin/GestaoPecas"));
const GestaoAulas = lazy(() => import("@/components/admin/GestaoAulas"));

const SubAbaFallback = () => (
  <div className="p-10 text-center text-sm text-muted-foreground font-bold">Carregando...</div>
);

const PublicarMaterial = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-primary italic">Publicar Material</h2>
        <p className="text-sm text-muted-foreground">Cadernos, simulados, laboratório de peças e videoaulas — tudo num só lugar.</p>
      </div>

      <Tabs defaultValue="materiais" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent mb-6 justify-start p-0">
          <TabsTrigger value="materiais" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
            <BookOpen className="h-4 w-4" /> Publicados
          </TabsTrigger>
          <TabsTrigger value="material-processual" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
            <Scale className="h-4 w-4" /> Material e Processual
          </TabsTrigger>
          <TabsTrigger value="pecas" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
            <Scale className="h-4 w-4" /> Laboratório de Peças
          </TabsTrigger>
          <TabsTrigger value="aulas" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
            <PlayCircle className="h-4 w-4" /> Videoaulas
          </TabsTrigger>
          <TabsTrigger value="simulados" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
            <Timer className="h-4 w-4" /> Simulados
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<SubAbaFallback />}>
          <TabsContent value="materiais"><GestaoMateriais /></TabsContent>
          <TabsContent value="material-processual"><GestaoMaterialProcessual /></TabsContent>
          <TabsContent value="pecas"><GestaoPecas /></TabsContent>
          <TabsContent value="aulas"><GestaoAulas /></TabsContent>
          <TabsContent value="simulados"><GestaoMateriais tipoFiltro="Simulado" /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default PublicarMaterial;
