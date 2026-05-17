## Portal da Graduação - Guia de Implementação

### 📋 Visão Geral

O **Portal Acadêmico** é um funil de captação orgânica que permite que alunos da graduação acessem resumos, slides e materiais de aulas específicas, criando uma oportunidade para apresentar a Mentoria Artesanal para 2ª Fase da OAB.

### 📁 Arquivos Criados

1. **`src/components/admin/PortalAcademico.tsx`** - Componente principal reutilizável
2. **`src/pages/PortalGraduacao.tsx`** - Página dedicada que integra o componente com auth
3. **Rota adicionada em `src/App.tsx`** - `/portal-graduacao`

### 🚀 Como Usar

#### **Opção 1: Via Página Dedicada (Recomendado)**

Acesse a página em: `http://seu-dominio.com/portal-graduacao`

```tsx
// Rota automática já configurada no App.tsx
<Route path="/portal-graduacao" element={<PortalGraduacao />} />
```

#### **Opção 2: Incorporar em Outra Página**

Se quiser adicionar o Portal em outro local (ex: página inicial):

```tsx
import { PortalAcademico } from "@/components/admin/PortalAcademico";
import { AuthModal } from "@/components/index/AuthModal";
import { useState } from "react";

export default function MinhaPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      <PortalAcademico setShowAuthModal={setShowAuthModal} />
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
      />
    </div>
  );
}
```

---

### 🗄️ Estrutura de Dados no Firestore

O componente espera a seguinte estrutura no Firestore:

#### **Coleção: `disciplinas`**
```json
{
  "id": "string (auto-generated)",
  "nome": "Direito Econômico e Financeiro",
  "professor": "Prof. João Silva",
  "isOutroProfessor": false,
  "semestre": "2026/1",
  "status": "ativa"
}
```

#### **Coleção: `materiaisAcademicos`**
```json
{
  "id": "string (auto-generated)",
  "disciplinaId": "string (referência à disciplina)",
  "titulo": "Aula 01 - Princípios da Ordem Econômica",
  "tipo": "resumo|slide|prova",
  "conteudoTexto": "Texto do resumo (opcional)",
  "urlDownload": "https://storage.firebase.com/... (opcional)",
  "dataCriacao": Timestamp,
  "isPremium": false
}
```

---

### 🎨 Regras de Cor (Implementadas)

O componente aplica automaticamente:

- **`isOutroProfessor: true`** → Fundo `bg-muted/50` com borda cinza
- **`isOutroProfessor: false`** → Gradiente com cores primárias (destaque)

```tsx
className={`${
  isOutroProfessor
    ? "border-gray-300 bg-muted/50 hover:border-gray-400"
    : "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/60"
}`}
```

---

### 🔐 Autenticação & Acesso

#### **Fluxo de Segurança Implementado:**

1. **Material Não-Premium + Não Logado** → Permite visualização
2. **Material Premium + Não Logado** → Mostra ícone 🔒 e abre modal de login
3. **Material Premium + Logado** → Acesso liberado
4. **Qualquer Material + Logado** → Acesso total

```tsx
const handleAbrirMaterial = (material: MaterialComData) => {
  if (!usuarioLogado) {
    setShowAuthModal?.(true);
    return;
  }
  // ... abrir material
};
```

---

### 📱 Features Implementadas

✅ **Grid Responsivo** (1 coluna mobile, 2 tablet, 3 desktop)  
✅ **Animações Suaves** (Framer Motion)  
✅ **Ícones por Tipo** (Slide, Resumo, Prova)  
✅ **Badges de Status** (Material Premium, Contador)  
✅ **Detalhes Modais** (Clique em disciplina para ver materiais)  
✅ **Cross-selling Banner** (Mentoria para 2ª Fase da OAB)  
✅ **Loading States** (Skeleton de carregamento)  
✅ **Empty States** (Mensagens quando não há dados)  
✅ **Real-time Firestore** (`onSnapshot` listeners)  

---

### 🛠️ Personalizações Recomendadas

#### **1. Alterar Cores Primárias**
Edite em `tailwind.config.ts`:
```ts
colors: {
  primary: '#000080', // Sua cor primária
}
```

#### **2. Adicionar Logo/Imagem no Banner de Mentoria**
No arquivo `PortalAcademico.tsx`, seção `renderBannerMentoria()`:
```tsx
<img 
  src="/images/mentoria-banner.jpg" 
  alt="Mentoria" 
  className="h-64 w-full object-cover rounded-lg" 
/>
```

#### **3. Links dos Botões CTA**
Adicione links reais para:
- "Conheça a Mentoria" → Link do checkout/landing page
- "Fale com o Mentor" → Link do WhatsApp/Calendly

```tsx
<Button 
  size="lg" 
  className="gap-2"
  onClick={() => window.open('https://seu-link.com/mentoria', '_blank')}
>
  Conheça a Mentoria
</Button>
```

---

### 📊 Dados de Teste

Para testar localmente, crie dados no Firestore:

**Disciplina Test:**
```
nome: "Direito Econômico e Financeiro"
professor: "Prof. Fernando Testando"
isOutroProfessor: false
semestre: "2026/1"
status: "ativa"
```

**Material Test:**
```
titulo: "Aula 01 - Introdução"
tipo: "resumo"
disciplinaId: "<ID_DA_DISCIPLINA>"
isPremium: false
dataCriacao: <today>
conteudoTexto: "Lorem ipsum..."
```

---

### 🔗 Integrações Úteis

#### **Adicionar Link no NavBar**
```tsx
// Em Header/Nav component
<Link to="/portal-graduacao" className="...">
  Portal da Graduação
</Link>
```

#### **SEO Meta Tags**
```tsx
useEffect(() => {
  document.title = "Portal da Graduação | Sua OAB";
  // Adicione metatags de descrição
}, []);
```

---

### ⚠️ Troubleshooting

| Problema | Solução |
|----------|---------|
| Disciplinas não aparecem | Verificar se status='ativa' no Firestore |
| Modal auth não abre | Garantir que `setShowAuthModal` está sendo passado como prop |
| Materiais vazios | Verificar `disciplinaId` referenciado em `materiaisAcademicos` |
| Cores não aplicam | Limpar cache e rebuild (próxima seção) |

---

### 🔄 Build & Deploy

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Testar build
npm run preview
```

---

### 📚 Referências de Código

- **Componente:** `src/components/admin/PortalAcademico.tsx`
- **Página:** `src/pages/PortalGraduacao.tsx`
- **Interfaces:** `src/lib/academico.ts`
- **Firebase Config:** `src/lib/firebase.ts`

---

### 🎯 Próximos Passos

1. ✅ Criar coleção `disciplinas` no Firestore
2. ✅ Criar coleção `materiaisAcademicos` no Firestore
3. ✅ Testar fluxo de autenticação
4. ✅ Personalizar banner de mentoria com links reais
5. ✅ Adicionar nav link para `/portal-graduacao`
6. ✅ Deploy em produção

---

**Desenvolvido com ❤️ para sua plataforma educacional**
