// src/pages/Painel.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Users, FileText, PenTool, Cog, BookOpen, Scale, CalendarDays } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Importação de todos os Motores (Componentes)
import AlunosCRM from "@/components/admin/AlunosCRM";
import FilaCorrecao from "@/components/admin/FilaCorrecao";
import BancoQuestoes from "@/components/admin/BancoQuestoes";
import MotorGerador from "@/components/admin/MotorGerador";
import GestaoMateriais from "@/components/admin/GestaoMateriais";
import GestaoPecas from "@/components/admin/GestaoPecas";
import GestaoCiclos from "@/components/admin/GestaoCiclos"; // <-- O Novo Motor de Ciclos

const Painel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Proteção de Rota: Apenas o professor pode entrar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== "miguelss3@yahoo.com.br") {
        navigate("/");
        return;
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-accent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-accent" />
            <h1 className="text-xl font-display font-bold tracking-tight">Sala de Comando</h1>
          </div>
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        <Tabs defaultValue="crm" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
            <TabsTrigger value="crm" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Users className="h-4 w-4"/> Alunos (CRM)
            </TabsTrigger>
            
            <TabsTrigger value="correcoes" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <FileText className="h-4 w-4"/> Correções
            </TabsTrigger>

            <TabsTrigger value="questoes" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <PenTool className="h-4 w-4"/> Banco
            </TabsTrigger>

            <TabsTrigger value="pecas" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Scale className="h-4 w-4"/> Matriz de Peças
            </TabsTrigger>
            
            <TabsTrigger value="motor" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Cog className="h-4 w-4"/> Motor PDF
            </TabsTrigger>
            
            <TabsTrigger value="materiais" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <BookOpen className="h-4 w-4"/> Publicados
            </TabsTrigger>

            {/* A NOVA ABA AQUI */}
            <TabsTrigger value="ciclos" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <CalendarDays className="h-4 w-4"/> Ciclos e Prazos
            </TabsTrigger>
          </TabsList>

          {/* CONTEÚDO DAS ABAS */}
          <TabsContent value="crm"><AlunosCRM /></TabsContent>
          <TabsContent value="correcoes"><FilaCorrecao /></TabsContent>
          <TabsContent value="questoes"><BancoQuestoes /></TabsContent>
          <TabsContent value="pecas"><GestaoPecas /></TabsContent>
          <TabsContent value="motor"><MotorGerador /></TabsContent>
          <TabsContent value="materiais"><GestaoMateriais /></TabsContent>
          
          {/* CONTEÚDO DA NOVA ABA AQUI */}
          <TabsContent value="ciclos"><GestaoCiclos /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Painel;