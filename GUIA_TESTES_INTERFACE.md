# 🧪 Quick Start: Como Testar a Nova Interface

## ⚡ Teste Rápido em 5 Minutos

### 1. Abra o navegador
```
http://localhost:5173/portal-graduacao
```

### 2. Verifique os 3 Elementos (De Cima para Baixo)

#### ✅ Elemento 1: Sua Disciplina
- [ ] Aparece no topo?
- [ ] Tem ícone de livro?
- [ ] É um card destacado (não acordeão)?
- [ ] Está clicável?

#### ✅ Elemento 2: Banner de Mentoria
- [ ] Aparece logo abaixo?
- [ ] Tem botões de WhatsApp + Instagram?
- [ ] No mobile: imagem está oculta?
- [ ] No desktop: imagem aparece ao lado?

#### ✅ Elemento 3: Explorar Outras Disciplinas
- [ ] Tem título com ícone?
- [ ] No mobile: Acordeão está FECHADO?
- [ ] Ao clicar: Abre com animação suave?
- [ ] Mostra preview de materiais?

---

## 📱 Teste Responsivo: Desktop vs Mobile

### Teste em Desktop (1280px+)

```
DevTools: F12 → Ctrl+Shift+M → Desabilitar
```

Checklist:
- [ ] Sua Disciplina: Card normal
- [ ] Banner: 2 colunas (texto + imagem)
- [ ] Acordeão: Itens com boa distribuição
- [ ] Espaçamento: Padding generoso
- [ ] Hover: Funciona nos accordion items

### Teste em Mobile (375px)

```
DevTools: F12 → Ctrl+Shift+M → Habilitar
→ Selecionar "iPhone SE" ou "Nexus 5"
```

Checklist:
- [ ] Sua Disciplina: Card ocupa 100% da largura
- [ ] Banner: Imagem OCULTA (só texto)
- [ ] Acordeão: FECHADO por padrão
- [ ] Texto: Legível sem zoom
- [ ] Clique fácil: Botões com altura adequada
- [ ] Espaçamento: Não está "espremido"

### Teste em Tablet (768px)

```
DevTools: iPad Pro (1024x1366)
```

Checklist:
- [ ] Transição suave de espaçamento
- [ ] Banner: Imagem começando a aparecer
- [ ] Acordeão: Items bem distribuídos
- [ ] Acordeão ainda funciona ao clicar

---

## 🎨 Teste Visual: Cores & Estados

### Estados de Disciplina

#### 🟢 Desbloqueada (Você pode clicar)
```
Visual:
- Borda: Azul suave (primary/20)
- Fundo: Gradiente leve (primary/5)
- Ao hover: Borda mais vibrante (primary/40)
- Cursor: Pointer (mãozinha)
```

**Teste**: Passe o mouse por uma disciplina desbloqueada

#### 🔴 Bloqueada (Outra Turma)
```
Visual:
- Borda: Cinza (gray-200)
- Fundo: Muted muito claro (muted/30)
- Opacidade: 60% (opacity-60)
- Cursor: Not-allowed (proibido)
```

**Teste**: Passe o mouse por uma disciplina bloqueada (não deve ter hover)

---

## 🎬 Teste de Animações

### Ao Expandir Accordion Item

**O que você deve ver:**
1. Ícone de seta rotaciona
2. Conteúdo aparece com fade-in suave
3. Preview de materiais desliza
4. Botão "Ver Detalhes" aparece

**Atalho**: Abra DevTools → Console
```javascript
// Simule a animação
document.querySelector('[role="button"]').click();
```

---

## 🔍 Teste Funcional: Clickability

### Teste 1: Sua Disciplina
```
Ação: Clique no card
Esperado: Modal/detalhe abre com conteúdo
Resultado: ✅ / ❌
```

### Teste 2: Acordeão Item (Desbloqueado)
```
Ação: Clique no título do item
Esperado: Expande mostrando materiais
Resultado: ✅ / ❌
```

### Teste 3: Acordeão Item (Bloqueado)
```
Ação: Clique no título bloqueado
Esperado: Toast message "Esta disciplina está restrita..."
Resultado: ✅ / ❌
```

### Teste 4: Ver Detalhes (No Acordeão)
```
Ação: Expanda item → Clique "Ver Detalhes"
Esperado: Modal com detalhes da disciplina
Resultado: ✅ / ❌
```

### Teste 5: Banner CTA
```
Ação: Clique em "Garantir Meu Desconto" ou "Conheça a Mentoria"
Esperado: Abre WhatsApp (novo aba)
Resultado: ✅ / ❌
```

---

## 🐛 Teste de Bugs: O Que Procurar

### ❌ NÃO Deveria Ocorrer

- [ ] Elementos sobrepostos/cortados
- [ ] Texto ilegível ou muito pequeno
- [ ] Buracos ou espaços em branco excessivos
- [ ] Botões que não respondem
- [ ] Scrolls horizontal em mobile
- [ ] Animações travando ou muito lentas
- [ ] Console.log errors ou warnings

### ✅ Deveria Funcionar

- [ ] Cliques responsivos
- [ ] Animações suaves (60fps)
- [ ] Responsividade sem saltos
- [ ] Acessibilidade básica (keyboard tab)
- [ ] Toast messages aparecem e desaparecem

---

## 📊 Teste de Performance: Lighthouse

### No DevTools

```
1. Abra DevTools (F12)
2. Vá para aba "Lighthouse"
3. Clique em "Analyze page load"
```

**Métricas Esperadas**:
- Performance: ≥ 85
- Accessibility: ≥ 90
- Best Practices: ≥ 85
- SEO: ≥ 90

**Resultado**: 📈 ✅ / ❌

---

## 🎯 Teste Final: Checklist Completo

```
VISUAL
├─ [ ] Layout em 3 seções visíveis
├─ [ ] Cores e contraste OK
├─ [ ] Tipografia legível
└─ [ ] Icones carregando

RESPONSIVIDADE
├─ [ ] Mobile (375px) OK
├─ [ ] Tablet (768px) OK
└─ [ ] Desktop (1280px) OK

INTERATIVIDADE
├─ [ ] Sua Disciplina clicável
├─ [ ] Acordeão abrindo/fechando
├─ [ ] Botões respondendo
└─ [ ] Toasts aparecendo

PERFORMANCE
├─ [ ] Animações suaves (60fps)
├─ [ ] Sem lag ao scroll
├─ [ ] Imagens carregando
└─ [ ] Lighthouse ≥ 85

BUGS
├─ [ ] Console sem errors
├─ [ ] Sem elementos cortados
├─ [ ] Sem scrolls horizontais
└─ [ ] Funciona offline (fallback)
```

---

## 📞 Se Encontrou um Bug

1. **Descreva o problema**
   ```
   Em qual dispositivo? (mobile/desktop)
   Qual ação causou? (clique/scroll/etc)
   Qual era o esperado?
   Qual foi o resultado?
   ```

2. **Capture um screenshot**
   - DevTools aberto
   - Mostrando o console (se houver error)

3. **Teste com Cache Limpo**
   ```
   DevTools → F12 → Network tab
   → Right-click → "Clear browser cache"
   ```

---

## 🚀 Resultado Esperado

Após todos os testes, você deve ver:

```
┌────────────────────────────────────┐
│  ✅ MOBILE EXPERIENCE OTIMIZADA   │
│  ✅ DESKTOP TOTALMENTE FUNCIONAL   │
│  ✅ ZERO ERROS NO CONSOLE         │
│  ✅ ANIMAÇÕES SUAVES & RÁPIDAS    │
│  ✅ PRONTO PARA PRODUÇÃO          │
└────────────────────────────────────┘
```

---

**Happy Testing! 🎉**

*Se houver dúvidas, consulte a documentação em:*
- `REESTRUTURACAO_UI_MOBILE_FIRST.md`
- `CHECKLIST_VALIDACAO_UI.md`
