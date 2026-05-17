## 🏗️ Arquitetura do Portal Acadêmico

### 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│         USUÁRIO ACESSA /portal-graduacao                │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│      PortalGraduacao (src/pages)                        │
│  • Gerencia estado de auth modal                        │
│  • Renderiza PortalAcademico + AuthModal               │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│      PortalAcademico (src/components/admin)            │
│  • Hook: onAuthStateChanged (autenticação)             │
│  • Hook: Firestore listener disciplinas                │
│  • Hook: Firestore listener materiais                  │
│  • Renderiza grid de disciplinas + detalhes            │
│  • Renderiza banner de mentoria                        │
└────┬──────────┬──────────────┬────────────────────────┘
     │          │              │
     ▼          ▼              ▼
┌────────┐ ┌────────┐    ┌──────────┐
│Firebase│ │Firestore
 │      │ │ Listeners   │ Framer    │
│Auth   │ │ (real-time) │ Motion    │
└────────┘ └────────┘    └──────────┘
     │          │              │
     │    ┌─────┴─────┐        │
     │    ▼           ▼        │
     │ ┌──────────┐┌────────┐  │
     │ │discipli-││materiai│  │
     │ │nas      ││Academ. │  │
     │ └──────────┘└────────┘  │
     │                         │
     └────────┬────────────────┘
              │
              ▼
     ┌─────────────────────┐
     │  UI Components      │
     │  • Card, Badge      │
     │  • Button, Modal    │
     │  • Tabs, Separator  │
     │  • Icons (lucide)   │
     └─────────────────────┘
```

---

### 🗂️ Estrutura de Arquivos

```
src/
├── components/
│   ├── admin/
│   │   └── PortalAcademico.tsx (⭐ COMPONENTE PRINCIPAL)
│   ├── index/
│   │   └── AuthModal.tsx (integrado)
│   └── ui/
│       ├── card.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       └── ... (outros componentes base)
│
├── pages/
│   ├── PortalGraduacao.tsx (⭐ PÁGINA DEDICADA)
│   ├── Index.tsx
│   └── ... (outras páginas)
│
├── lib/
│   ├── academico.ts (interfaces Disciplina, MaterialAcademico)
│   ├── firebase.ts (config)
│   ├── exemplosDadosPortal.ts (⭐ EXEMPLOS DE DADOS)
│   └── ... (outras libs)
│
├── App.tsx (⭐ COM ROTA ADICIONADA)
└── main.tsx

📄 Documentação:
├── PORTAL_QUICKSTART.md (⭐ COMECE AQUI)
├── PORTAL_GRADUACAO_GUIA.md (Guia completo)
├── PORTAL_CUSTOMIZACOES.md (Customizações)
├── PORTAL_IMPLEMENTACAO_COMPLETA.md (Status/Checklist)
└── PORTAL_ARQUITETURA.md (este arquivo)
```

---

### 🔄 Fluxo de Interação do Usuário

```
┌──────────────────────────────────────────────────────┐
│  Usuário acessa /portal-graduacao                    │
└──────────────────┬───────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    LOGADO?            NÃO LOGADO
        │                     │
        │            ┌────────┴─────────┐
        │            │                  │
        │            ▼                  ▼
        │      VÊ GRID        PODE VER GRID
        │   (completo)         (limitado)
        │            │                  │
        └────────────┴──────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Clica em Disciplina   │
        └────────┬───────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ Modal Abre com Materiais│
        └────────┬────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    MATERIAL         MATERIAL
    NÃO PREMIUM      PREMIUM
        │                 │
        ▼                 ▼
    ✅ ABRE           LOGADO?
                    /       \
                   ✅        ❌ ABRE AUTH MODAL
                  ABRE
```

---

### 📦 Dependências Utilizadas

```
React
├── react: ^18.0
├── react-dom: ^18.0
├── react-router-dom: ^6.0
│
Animação
├── framer-motion: ^11+
│
Formulários & UI
├── react-hook-form: ^7+
├── zod: ^3+
│
Firebase
├── firebase: ^11+
├── @react-firebase/auth
├── @react-firebase/firestore
│
Ícones
├── lucide-react: ^0.x
│
Notificações
├── sonner: ^1+
│
CSS
├── tailwindcss: ^3+
├── tailwindcss-animate
│
TypeScript
└── typescript: ^5+
```

---

### 🔐 Segurança Implementada

```
┌─────────────────────────────────────────┐
│    Camada de Autenticação Firebase      │
├─────────────────────────────────────────┤
│ • onAuthStateChanged: Monitora login    │
│ • signOut: Logout seguro                │
│ • Email/Password auth                   │
└─────────────────────────────────────────┘
             ▼
┌─────────────────────────────────────────┐
│  Verificação de Material Premium        │
├─────────────────────────────────────────┤
│ • Se isPremium && !usuarioLogado        │
│   → Mostrar modal de login              │
│ • Se isPremium && usuarioLogado         │
│   → Permitir acesso                     │
└─────────────────────────────────────────┘
             ▼
┌─────────────────────────────────────────┐
│    Firestore Security Rules             │
├─────────────────────────────────────────┤
│ • Disciplinas: leitura pública          │
│ • Materiais: leitura pública            │
│ • Auth: Firebase Auth requerida         │
└─────────────────────────────────────────┘
```

---

### 🎯 Regra de Cores Implementada

```
MAPEAMENTO AUTOMÁTICO:

if (disciplina.isOutroProfessor === true) {
  ┌──────────────────────┐
  │ bg-muted/50          │  ← Fundo cinza
  │ border-gray-300      │  ← Borda cinza
  │ text-gray-700        │  ← Texto escuro
  └──────────────────────┘
} else {
  ┌──────────────────────┐
  │ bg-primary/5         │  ← Fundo cor primária
  │ border-primary/30    │  ← Borda primária
  │ text-primary         │  ← Texto primário (destaque)
  └──────────────────────┘
}
```

---

### 📊 Estados de Dados Gerenciados

```typescript
interface PortalAcademicoState {
  disciplinas: Disciplina[];        // Lista de disciplinas
  materiais: Map<string, Material[]>;  // Materiais por disciplina
  usuarioLogado: User | null;       // Usuário autenticado
  disciplinaSelecionada: Disciplina | null; // Detalhes abertos
  loading: boolean;                  // Estado de carregamento
  expandedMateriais: Set<string>;   // Materiais expandidos
}
```

---

### 🔄 Listeners Firestore

```
┌─────────────────────────────────────┐
│  Listener 1: Disciplinas            │
├─────────────────────────────────────┤
│ Collection: disciplinas             │
│ Query:                              │
│  • where: status == 'ativa'        │
│  • orderBy: nome ASC               │
│ Atualização: Real-time             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Listener 2: Materiais (x N)       │
├─────────────────────────────────────┤
│ Collection: materiaisAcademicos    │
│ Query (por disciplina):            │
│  • where: disciplinaId == id       │
│  • orderBy: dataCriacao DESC       │
│ Atualização: Real-time             │
│ Múltiplos: Um listener por disc.   │
└─────────────────────────────────────┘
```

---

### 🎨 Componentes UI Reutilizados

```
PortalAcademico utiliza:

├── Card
│   ├── CardContent
│   ├── CardDescription
│   ├── CardHeader
│   └── CardTitle
│
├── Badge
│   └── Variants: default, secondary, outline
│
├── Button
│   └── Sizes: sm, md, lg
│   └── Variants: default, ghost, outline
│
├── Tabs
│   ├── TabsContent
│   ├── TabsList
│   └── TabsTrigger
│
├── Separator
│
└── Dialog / Modal (via motion.div + framer)
```

---

### 🎬 Animações Implementadas

```
1. Container Variants
   ├── Stagger: 0.1s entre items
   └── Delay: 0.2s inicial

2. Item Variants
   ├── Initial: opacity 0, y +20px
   ├── Animate: opacity 1, y 0
   └── Duration: 0.4s

3. Modal Detalhes
   ├── Enter: opacity 0 → 1
   ├── Exit: opacity 1 → 0
   └── Backdrop: black/50 overlay

4. Expansão de Materiais
   ├── Altura: 0 → auto
   ├── Opacity: 0 → 1
   └── Layout animation
```

---

### 📱 Responsive Design

```
Mobile (< 640px)
└── 1 coluna
    └── Textos maiores
    └── Touch-friendly

Tablet (640px - 1024px)
└── 2 colunas
    └── Layout balanced

Desktop (> 1024px)
└── 3 colunas
    └── Máxima largura
    └── Banner com 2 seções
```

---

### 🔌 Pontos de Integração

```
Integrar com:
├── Página Index
│   └── Adicionar link no menu
│
├── Dashboard Aluno
│   └── Link para explorar mais materiais
│
├── Sistema de Pagamento (Hotmart)
│   └── Link no banner → checkout
│
├── Analytics (Google Analytics)
│   └── Track clicks nas disciplinas
│
└── CRM / Email Marketing
    └── Capturar contatos dos visitantes
```

---

### 🚀 Performance Otimizações

```
✅ Listeners unsubscribe em cleanup
✅ Map para acesso rápido aos materiais
✅ Lazy rendering (modal sob demanda)
✅ Tipos TypeScript (sem any)
✅ Memoização potencial (React.memo se necessário)
✅ Sem re-renders desnecessários
✅ Animações GPU-accelerated (Framer Motion)
```

---

### 📈 Métricas do Projeto

```
Componente Principal: 550 linhas
Página Wrapper: 30 linhas
Documentação: 2000+ linhas

Componentes UI: 10+
Ícones Lucide: 15+
Estados: 8
Listeners Firestore: 2 (dinâmicos)
Animações: 5+

TypeScript: Strict mode
Integração: Firebase + React Router
Build: Vite (otimizado)
```

---

### 📚 Referências de Código

| Item | Arquivo | Linhas |
|------|---------|--------|
| Componente | `PortalAcademico.tsx` | 1-550 |
| Página | `PortalGraduacao.tsx` | 1-30 |
| Rota | `App.tsx` | 7-28 |
| Interfaces | `academico.ts` | 1-20 |
| Exemplos | `exemplosDadosPortal.ts` | 1-100+ |

---

**Diagrama atualizado: Maio 2026** ✅
