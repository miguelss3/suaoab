import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazyWithReload } from "@/lib/lazyWithReload";

// Cada página é carregada sob demanda (code-splitting por rota), evitando que
// o código do Painel Admin (e suas dependências pesadas) entre no bundle
// baixado por quem visita apenas a landing page. lazyWithReload evita a tela
// de erro "Failed to fetch dynamically imported module" quando um deploy novo
// troca os hashes dos chunks enquanto a aba já estava aberta.
const Index = lazyWithReload(() => import("./pages/Index.tsx"));
const Aluno = lazyWithReload(() => import("./pages/Aluno.tsx"));
const Aula = lazyWithReload(() => import("./pages/Aula.tsx"));
const Painel = lazyWithReload(() => import("./pages/Painel.tsx"));
const RedefinirSenha = lazyWithReload(() => import("./pages/RedefinirSenha.tsx"));
const PortalGraduacao = lazyWithReload(() => import("./pages/PortalGraduacao.tsx"));
const NotFound = lazyWithReload(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();
const routerFuture = {
  v7_startTransition: true,
} as const;

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-primary font-bold">
    Carregando...
  </div>
);

const withSuspense = (element: JSX.Element) => (
  <Suspense fallback={<PageFallback />}>{element}</Suspense>
);

const router = createBrowserRouter(
  [
    { path: "/", element: withSuspense(<Index />) },
    { path: "/aluno", element: withSuspense(<Aluno />) },
    { path: "/aula", element: withSuspense(<Aula />) },
    { path: "/painel", element: withSuspense(<Painel />) },
    { path: "/portal-graduacao", element: withSuspense(<PortalGraduacao />) },
    { path: "/redefinir-senha", element: withSuspense(<RedefinirSenha />) },
    { path: "*", element: withSuspense(<NotFound />) },
  ],
  {
    future: routerFuture,
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} future={routerFuture} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;