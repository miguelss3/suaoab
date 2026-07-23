import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Cada ícone do lucide-react é um módulo próprio; sem isso, o Rollup cria
        // um chunk minúsculo por ícone (dezenas de requisições HTTP extras) sempre
        // que o mesmo ícone é usado em mais de uma rota lazy-loaded. Agrupamos tudo
        // num único chunk "icons" para reduzir isso a uma requisição só.
        manualChunks(id) {
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
}));
