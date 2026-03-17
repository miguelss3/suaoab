// src/pages/Painel.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, FileText, PenTool, Cog, BookOpen, Scale } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Importação de todos os Motores (Componentes)
import AlunosCRM from "@/components/admin/AlunosCRM";
import FilaCorrecao from "@/components/admin/FilaCorrecao";
import BancoQuestoes from "@/components/admin/BancoQuestoes";
import MotorGerador from "@/components/admin/MotorGerador";
import GestaoMateriais from "@/components/admin/GestaoMateriais";
import GestaoPecas from "@/components/admin/GestaoPecas"; // <-- O Novo Motor de Peças

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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-display text-primary italic">A carregar o Hub do Professor...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-body pb-24">
      {/* CABEÇALHO SUPERIOR */}
      <header className="bg-primary border-b-4 border-accent py-4 sticky top-0 z-40 shadow-sm">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-primary-foreground text-2xl font-display font-bold italic">
              SUA<span className="text-accent italic">OAB</span>
            </h1>
            <span className="bg-accent text-accent-foreground font-bold px-3 py-1 rounded text-xs uppercase hidden md:block border border-white/20">
              Centro de Comando
            </span>
          </div>
          <button onClick={handleLogout} className="text-destructive font-bold flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL E MENU DE ABAS */}
      <main className="container py-8">
        <Tabs defaultValue="crm" className="w-full">
          
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-8 h-auto gap-2 bg-transparent">
            <TabsTrigger value="crm" className="font-bold flex gap-2 border bg-card data-[state=active]:border-accent data-[state=active]:text-accent">
              <Users className="h-4 w-4"/> Alunos
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
          </TabsList>

          {/* CONTEÚDO DAS ABAS */}
          <TabsContent value="crm"><AlunosCRM /></TabsContent>
          <TabsContent value="correcoes"><FilaCorrecao /></TabsContent>
          <TabsContent value="questoes"><BancoQuestoes /></TabsContent>
          <TabsContent value="pecas"><GestaoPecas /></TabsContent>
          <TabsContent value="motor"><MotorGerador /></TabsContent>
          <TabsContent value="materiais"><GestaoMateriais /></TabsContent>
          
        </Tabs>
      </main>
    </div>
  );
};

export default Painel;