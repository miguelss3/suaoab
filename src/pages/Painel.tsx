// src/pages/Painel.tsx
import { Suspense, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Users, FileText, PenTool, Cog, BookOpen, Scale, CalendarDays, PlayCircle, Eye, TrendingUp } from "lucide-react";
import { auth } from "@/lib/firebase";
import { ADMIN_EMAIL } from "@/lib/constants";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { lazyWithReload } from "@/lib/lazyWithReload";

// Cada motor do painel admin só é baixado quando a respectiva aba é aberta
// (só o professor acessa isso, mas mesmo assim evita travar a aba ativa
// esperando o parse/execução de motores que ele nem abriu nesta sessão).
// lazyWithReload evita a tela de erro "Failed to fetch dynamically imported
// module" quando um deploy novo troca os hashes dos chunks com o painel aberto.
const PainelVendas = lazyWithReload(() => import("@/components/admin/PainelVendas"));
const AlunosCRM = lazyWithReload(() => import("@/components/admin/AlunosCRM"));
const FilaCorrecao = lazyWithReload(() => import("@/components/admin/FilaCorrecao"));
const BancoQuestoes = lazyWithReload(() => import("@/components/admin/BancoQuestoes"));
const MotorGerador = lazyWithReload(() => import("@/components/admin/MotorGerador"));
const GestaoMateriais = lazyWithReload(() => import("@/components/admin/GestaoMateriais"));
const GestaoPecas = lazyWithReload(() => import("@/components/admin/GestaoPecas"));
const GestaoCiclos = lazyWithReload(() => import("@/components/admin/GestaoCiclos"));
const GestaoAulas = lazyWithReload(() => import("@/components/admin/GestaoAulas"));
const VisaoAluno = lazyWithReload(() => import("@/components/admin/VisaoAluno"));
const AdminGraduacao = lazyWithReload(() => import("@/components/admin/AdminGraduacao"));

const AbaFallback = () => (
  <div className="p-10 text-center text-sm text-muted-foreground font-bold">Carregando...</div>
);

const Painel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Proteção de Rota: Apenas o professor pode entrar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        navigate("/");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary font-bold">Autenticando...</div>;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-primary text-primary-foreground py-4 px-6 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-accent-foreground p-2 rounded-lg"><PenTool className="h-6 w-6" /></div>
          <div>
            <h1 className="text-xl font-display font-bold italic tracking-tight">Sala de Comando</h1>
            <p className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-black">Professor Miguel</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleLogout} className="font-bold">
          <LogOut className="h-4 w-4 mr-2" /> Encerrar Turno
        </Button>
      </header>

      <main className="container py-8 max-w-7xl">
        <Tabs defaultValue="vendas" className="w-full">

          <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent mb-8 justify-start p-0">
            <TabsTrigger value="vendas" className="font-bold flex gap-2 border border-accent/30 bg-accent/5 text-accent data-[state=active]:bg-accent data-[state=active]:text-white transition-colors">
              <TrendingUp className="h-4 w-4"/> Painel de Vendas
            </TabsTrigger>

            <TabsTrigger value="sandbox" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Eye className="h-4 w-4"/> Visão do Aluno
            </TabsTrigger>

            <TabsTrigger value="crm" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Users className="h-4 w-4"/> Alunos CRM
            </TabsTrigger>
            
            <TabsTrigger value="correcoes" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <FileText className="h-4 w-4"/> Fila de Correção
            </TabsTrigger>

            <TabsTrigger value="aulas" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <PlayCircle className="h-4 w-4"/> Videoaulas
            </TabsTrigger>
            
            <TabsTrigger value="pecas" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Scale className="h-4 w-4"/> Laboratório de Peças
            </TabsTrigger>
            
            <TabsTrigger value="questoes" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <PenTool className="h-4 w-4"/> Banco de Questões
            </TabsTrigger>
            
            <TabsTrigger value="motor" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Cog className="h-4 w-4"/> Motor PDF
            </TabsTrigger>
            
            <TabsTrigger value="materiais" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <BookOpen className="h-4 w-4"/> Publicados
            </TabsTrigger>

            <TabsTrigger value="ciclos" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <CalendarDays className="h-4 w-4"/> Ciclos e Prazos
            </TabsTrigger>

            <TabsTrigger value="graduacao" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <BookOpen className="h-4 w-4"/> Portal Graduação
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<AbaFallback />}>
            <TabsContent value="vendas"><PainelVendas /></TabsContent>
            <TabsContent value="sandbox"><VisaoAluno /></TabsContent>
            <TabsContent value="crm"><AlunosCRM /></TabsContent>
            <TabsContent value="correcoes"><FilaCorrecao /></TabsContent>
            <TabsContent value="aulas"><GestaoAulas /></TabsContent>
            <TabsContent value="questoes"><BancoQuestoes /></TabsContent>
            <TabsContent value="pecas"><GestaoPecas /></TabsContent>
            <TabsContent value="motor"><MotorGerador /></TabsContent>
            <TabsContent value="materiais"><GestaoMateriais /></TabsContent>
            <TabsContent value="ciclos"><GestaoCiclos /></TabsContent>
            <TabsContent value="graduacao"><AdminGraduacao /></TabsContent>
          </Suspense>

        </Tabs>
      </main>
    </div>
  );
};

export default Painel;