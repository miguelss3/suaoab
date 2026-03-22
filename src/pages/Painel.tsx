// src/pages/Painel.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Users, FileText, PenTool, Cog, BookOpen, Scale, CalendarDays, PlayCircle, Eye } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Importação de todos os Motores (Componentes)
import AlunosCRM from "@/components/admin/AlunosCRM";
import FilaCorrecao from "@/components/admin/FilaCorrecao";
import BancoQuestoes from "@/components/admin/BancoQuestoes";
import MotorGerador from "@/components/admin/MotorGerador";
import GestaoMateriais from "@/components/admin/GestaoMateriais";
import GestaoPecas from "@/components/admin/GestaoPecas";
import GestaoCiclos from "@/components/admin/GestaoCiclos"; 
import GestaoAulas from "@/components/admin/GestaoAulas"; 
import VisaoAluno from "@/components/admin/VisaoAluno";

const Painel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Proteção de Rota: Apenas o professor pode entrar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== "miguelss3@yahoo.com.br") {
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
        <Tabs defaultValue="sandbox" className="w-full">
          
          <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent mb-8 justify-start p-0">
            <TabsTrigger value="sandbox" className="font-bold flex gap-2 border border-accent/30 bg-accent/5 text-accent data-[state=active]:bg-accent data-[state=active]:text-white transition-colors">
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
          </TabsList>

          <TabsContent value="sandbox"><VisaoAluno /></TabsContent>
          <TabsContent value="crm"><AlunosCRM /></TabsContent>
          <TabsContent value="correcoes"><FilaCorrecao /></TabsContent>
          <TabsContent value="aulas"><GestaoAulas /></TabsContent>
          <TabsContent value="questoes"><BancoQuestoes /></TabsContent>
          <TabsContent value="pecas"><GestaoPecas /></TabsContent>
          <TabsContent value="motor"><MotorGerador /></TabsContent>
          <TabsContent value="materiais"><GestaoMateriais /></TabsContent>
          <TabsContent value="ciclos"><GestaoCiclos /></TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Painel;