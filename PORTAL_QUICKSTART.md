# 🚀 Quick Start - Portal da Graduação

## ⚡ Comece em 5 Minutos

### Passo 1: Acesse a Página
```
http://localhost:5173/portal-graduacao
```

### Passo 2: Adicione Dados no Firestore

**Via Console Firebase:**
1. Acesse: https://console.firebase.google.com
2. Selecione projeto "sua-oab"
3. Clique em "Firestore Database"
4. Crie coleção: `disciplinas`

**Adicione 1º Documento:**
```json
{
  "nome": "Direito Econômico e Financeiro",
  "professor": "Prof. Seu Nome",
  "isOutroProfessor": false,
  "semestre": "2026/1",
  "status": "ativa"
}
```

**Crie coleção: `materiaisAcademicos`**

**Adicione 1º Documento:**
```json
{
  "disciplinaId": "ID_DA_DISCIPLINA_ACIMA",
  "titulo": "Aula 01 - Introdução",
  "tipo": "resumo",
  "conteudoTexto": "Princípios fundamentais...",
  "dataCriacao": [Data atual em Timestamp],
  "isPremium": false
}
```

### Passo 3: Recarregue a Página
```
Ctrl + R (ou Cmd + R)
```

### ✅ Pronto!
Você deve ver o portal funcionando com sua disciplina e materiais.

---

## 🎨 Customizações Rápidas

### Mudar Cores
Edite `tailwind.config.ts`:
```ts
colors: {
  primary: '#000080',  // Azul marinho
}
```

### Adicionar Imagem no Banner
No arquivo `PortalAcademico.tsx`, procure por `renderBannerMentoria()`:
```tsx
<img 
  src="/minha-imagem.jpg" 
  alt="Mentoria"
  className="h-64 w-full object-cover rounded-lg"
/>
```

### Mudar Texto do Banner
Procure por "Mentoria Artesanal" no código e edite.

---

## 🔗 Links Importantes

| O que fazer | Link |
|---|---|
| Ver documentação completa | `PORTAL_GRADUACAO_GUIA.md` |
| Ver customizações visuais | `PORTAL_CUSTOMIZACOES.md` |
| Ver dados de exemplo | `src/lib/exemplosDadosPortal.ts` |
| Implementação status | `PORTAL_IMPLEMENTACAO_COMPLETA.md` |

---

## 🚨 Problemas Comuns

### ❌ Não vejo disciplinas
**Solução:** Verifique se `status: "ativa"` no Firestore

### ❌ Modal de login não abre
**Solução:** Já está integrado, apenas faça login para testar

### ❌ Material não abre
**Solução:** Verifique se há `conteudoTexto` ou `urlDownload`

### ❌ Cores erradas
**Solução:** Limpe cache do browser (Ctrl+Shift+Delete)

---

## 📱 Responsive Check

✅ Desktop (1024px+)  
✅ Tablet (768px-1023px)  
✅ Mobile (< 768px)  

Teste em todos os tamanhos!

---

## 🎯 Próximas Ações

1. ✅ Teste com suas disciplinas
2. ✅ Customize cores/imagens
3. ✅ Configure links dos CTAs no banner
4. ✅ Adicione link no nav menu
5. ✅ Deploy para produção

---

**Dúvidas?** Consulte os arquivos `.md` inclusos no projeto.

**Tudo pronto!** 🎉
