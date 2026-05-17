## 🎨 Guia de Customizações Visuais - Portal Acadêmico

### 📍 Cores e Temas

#### **Situação Atual:**
- Disciplinas com `isOutroProfessor: true` → `bg-muted/50` (cinza)
- Disciplinas com `isOutroProfessor: false` → Gradiente primário

#### **Como Customizar Cores:**

**Opção 1: Via Tailwind Config**

Edite `tailwind.config.ts`:
```ts
module.exports = {
  theme: {
    colors: {
      primary: '#000080',     // Azul marinho (OAB theme)
      secondary: '#E8E8E8',   // Cinza claro
      muted: '#F5F5F5',       // Fundo mutado
      accent: '#FFD700',      // Dourado (destaque)
    },
  },
}
```

**Opção 2: Customizar Inline (PortalAcademico.tsx)**

```tsx
// Mude as classes Tailwind nos cards
className={`
  ${isOutroProfessor
    ? "border-yellow-200 bg-yellow-50 hover:border-yellow-300"
    : "border-blue-300 bg-blue-50 hover:border-blue-400"
  }
`}
```

---

### 🎭 Ícones Alternativos

Todos os ícones vêm da biblioteca `lucide-react`. Para trocar:

```tsx
// Arquivo: PortalAcademico.tsx
import {
  BookOpen,              // Header icon
  FileText,             // Ícone de resumo
  Presentation,         // Ícone de slide
  ClipboardList,        // Ícone de prova
  // ADICIONE MAIS:
  GraduationCap,        // Alternativa para BookOpen
  Lightbulb,           // Para destaque
  Award,               // Para premium
} from "lucide-react";

// Use no renderBannerMentoria():
<Sparkles className="w-5 h-5 text-primary" />  // Já está aqui
// Pode trocar por:
// <Award className="w-5 h-5 text-amber-500" />
// <Lightbulb className="w-5 h-5 text-yellow-500" />
```

**Lista de ícones úteis:**
- `GraduationCap` - Graduação
- `Award` - Prêmios/Premium
- `Zap` - Energia/Destaque
- `TrendingUp` - Progresso
- `Heart` - Favorito
- `Star` - Estrela
- `Rocket` - Impacto

---

### 🏗️ Alterações de Layout

#### **1. Mudar Número de Colunas**

```tsx
// Atualmente: sm:grid-cols-2 lg:grid-cols-3
// Mudar para:
className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

// Ou para layout de 2 colunas apenas:
className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2"
```

#### **2. Aumentar/Diminuir Espaçamento**

```tsx
// Gap entre cards
gap-6      // Atual (24px)
gap-4      // Menor (16px)
gap-8      // Maior (32px)

// Padding interno
p-6        // Atual (24px)
p-4        // Menor
p-8        // Maior
```

#### **3. Tamanho da Header**

```tsx
// Em renderBannerMentoria():
className="text-3xl font-bold"  // Atual
// Trocar por:
className="text-4xl font-extrabold"  // Maior
className="text-2xl font-bold"       // Menor
```

---

### 📷 Adicionar Imagens

#### **Banner com Imagem de Fundo**

```tsx
// Em renderBannerMentoria(), substitua a div de visual:
<div 
  className="hidden md:flex h-64 w-64 rounded-lg bg-cover bg-center"
  style={{
    backgroundImage: 'url(/images/mentoria-banner.jpg)',
    backgroundSize: 'cover',
  }}
/>
```

#### **Cards com Imagens (Disciplinas)**

Para adicionar imagens nas disciplinas, modifique o componente:

```tsx
// Adicione um campo na interface Disciplina
interface Disciplina {
  id: string;
  nome: string;
  professor: string;
  isOutroProfessor: boolean;
  semestre: string;
  status: 'ativa' | 'arquivada';
  imagemUrl?: string;  // NOVO
  cor?: string;        // NOVO (ex: 'bg-blue-100')
}

// No renderCartaoDisciplina():
{disc.imagemUrl && (
  <img 
    src={disc.imagemUrl} 
    alt={disc.nome}
    className="h-32 w-full object-cover rounded-t-lg"
  />
)}
```

---

### ✨ Animações Avançadas

#### **Mudar Duração das Animações**

```tsx
// Atualmente: transition: { duration: 0.4 }
// Mais rápido:
transition: { duration: 0.2 }

// Mais lento:
transition: { duration: 0.8 }

// Com delay:
transition: { duration: 0.4, delay: 0.1 }
```

#### **Adicionar Hover Effects**

```tsx
// Em renderCartaoDisciplina(), Card component:
<Card
  className="... transform transition-all hover:scale-105 hover:shadow-xl"
>
```

#### **Adicionar Efeito de Brilho**

```tsx
// Para destaque de premium
<div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
```

---

### 🎯 Customizar Banner de Mentoria

#### **Mudar Estrutura de 2 Colunas para 1**

```tsx
// Atual: grid md:grid-cols-2
// Trocar para:
<div className="space-y-6">
  {/* CONTEÚDO */}
  {/* IMAGEM */}
</div>
```

#### **Adicionar Video ao Invés de Imagem**

```tsx
// Substitua a div de imagem por:
<iframe
  width="100%"
  height="400"
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameBorder="0"
  allowFullScreen
  className="rounded-lg"
/>
```

#### **Adicionar Contador de Alunos**

```tsx
// No banner, adicione:
<div className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-white/50 p-4">
  <div className="text-center">
    <p className="text-2xl font-bold">500+</p>
    <p className="text-xs text-muted-foreground">Alunos Aprovados</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold">98%</p>
    <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold">4.9★</p>
    <p className="text-xs text-muted-foreground">Avaliação</p>
  </div>
</div>
```

---

### 📱 Responsive Design

O componente já é responsivo, mas você pode ajustar:

```tsx
// Breakpoints do Tailwind:
sm:  640px   (small phones)
md:  768px   (tablets)
lg:  1024px  (desktops)
xl:  1280px  (wide screens)

// Exemplo: esconder algo em mobile
<div className="hidden md:block">Aparece em tablets+</div>
```

---

### 🌙 Dark Mode

Se quiser adicionar suporte a dark mode:

```tsx
// Adicione ao arquivo:
<div className="dark:bg-slate-900 dark:text-white">
  {/* Conteúdo */}
</div>
```

---

### 🔤 Tipografia

#### **Ajustar Tamanhos de Fonte**

```tsx
// Tamanhos disponíveis:
text-xs    // 12px
text-sm    // 14px
text-base  // 16px (default)
text-lg    // 18px
text-xl    // 20px
text-2xl   // 24px
text-3xl   // 30px (usado no título)
text-4xl   // 36px

// Pesos:
font-light      // 300
font-normal     // 400 (default)
font-semibold   // 600
font-bold       // 700
font-extrabold  // 800
```

---

### 🎨 Exemplos de Combinações de Cor

#### **Tema Azul Profissional**
```tsx
primary: '#0066CC'
bg: 'bg-blue-50'
text: 'text-blue-900'
border: 'border-blue-200'
```

#### **Tema Dourado Premium**
```tsx
primary: '#D4AF37'
bg: 'bg-amber-50'
text: 'text-amber-900'
border: 'border-amber-200'
```

#### **Tema Verde Educação**
```tsx
primary: '#10B981'
bg: 'bg-emerald-50'
text: 'text-emerald-900'
border: 'border-emerald-200'
```

---

### 🔧 Checklist de Customização

- [ ] Cores do tema configuradas
- [ ] Ícones escolhidos
- [ ] Imagens de banner adicionadas
- [ ] Links dos CTAs apontam para destinos corretos
- [ ] Textos traduzidos/revisados
- [ ] Dark mode testado (se aplicável)
- [ ] Mobile responsivo verificado
- [ ] Animações suaves testadas
- [ ] Nenhum erro de console

---

**Dúvidas? Consulte a documentação do Tailwind CSS: https://tailwindcss.com**
