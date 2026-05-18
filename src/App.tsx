import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Route, Routes, RouterProvider } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Importação das suas páginas
import Index from "./pages/Index.tsx";
import Aluno from "./pages/Aluno.tsx";
import Aula from "./pages/Aula.tsx";
import Painel from "./pages/Painel.tsx";
import RedefinirSenha from "./pages/RedefinirSenha.tsx";
import PortalGraduacao from "./pages/PortalGraduacao.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", element: <Index /> },
    { path: "/aluno", element: <Aluno /> },
    { path: "/aula", element: <Aula /> },
    { path: "/painel", element: <Painel /> },
    { path: "/portal-graduacao", element: <PortalGraduacao /> },
    { path: "/redefinir-senha", element: <RedefinirSenha /> },
    { path: "*", element: <NotFound /> },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;