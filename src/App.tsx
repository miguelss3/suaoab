import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Importação das suas páginas
import Index from "./pages/Index.tsx";
import Aluno from "./pages/Aluno.tsx";
import Aula from "./pages/Aula.tsx";
import Painel from "./pages/Painel.tsx";
import RedefinirSenha from "./pages/RedefinirSenha.tsx"; // <-- 1. IMPORTAMOS A NOVA PÁGINA AQUI
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/aluno" element={<Aluno />} />
          <Route path="/aula" element={<Aula />} />
          <Route path="/painel" element={<Painel />} />
          
          {/* <-- 2. ADICIONAMOS A ROTA OFICIAL DA NOVA PÁGINA AQUI --> */}
          <Route path="/redefinir-senha" element={<RedefinirSenha />} /> 
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;