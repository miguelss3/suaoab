# ⚖️ SuaOAB - Plataforma de Mentoria Estratégica

A **SuaOAB** é uma plataforma educacional completa e de alta performance, desenvolvida sob medida para a preparação de candidatos à 2ª Fase do Exame da Ordem dos Advogados do Brasil (OAB). 

O sistema é dividido em dois grandes ecossistemas: o **Portal do Aluno** (focado em engajamento, organização e execução) e a **Sala de Comando** (um CRM poderoso para o mentor gerenciar alunos, corrigir peças e orquestrar conteúdos).

---

## 🚀 Funcionalidades Principais

### 🎓 Portal do Aluno
* **Dashboard de Progresso:** Acompanhamento visual da evolução do aluno nas metas da disciplina.
* **Cronograma de Metas (Rota Adaptativa):** Sistema que organiza o estudo diário com integração de PDFs, links e orientações.
* **Sala de Aula Virtual:** Player de vídeo inteligente integrado ao YouTube com extração automática de IDs e layout responsivo.
* **Laboratório de Peças & Simulados:** Área dedicada para download de esqueletos, cadernos de questões e envio de peças para correção.
* **Sistema de Degustação Inteligente:** Controle de acesso temporário (Trial) com bloqueio automático após o vencimento do prazo (ex: 72h) e alertas visuais integrados ao checkout da Hotmart.

### ⚙️ Sala de Comando (Admin / Mentor)
* **CRM de Alunos:** Gestão completa de leads e alunos Premium, com inativação automática de alunos expirados.
* **Dossiê do Aluno:** Visão 360º de cada estudante, permitindo ajustes de prazos, liberação/bloqueio de metas e acompanhamento de progresso.
* **Motor de Rota Adaptativa:** Algoritmo que calcula automaticamente um plano de estudos distribuindo metas entre a data atual e a data da prova.
* **Fila de Correção com SLA:** Sistema de gestão de envios com cálculo automático de dias úteis para prazos de devolução.
* **Gestor de Acervo Global:** CRUD completo para Videoaulas (com extrator de IDs em força bruta), Materiais em PDF, Simulados e Matrizes de Peças, com upload direto para a nuvem.

---

## 🛠️ Tecnologias e Arquitetura

O projeto foi construído utilizando um stack moderno, garantindo velocidade, escalabilidade e segurança:

* **Frontend:** React (inicializado com Vite + SWC) e TypeScript.
* **Estilização:** Tailwind CSS (com sistema de variáveis CSS para temas) e componentes UI inspirados no Radix/Shadcn.
* **Backend as a Service (BaaS):** Firebase
  * *Firestore:* Banco de dados NoSQL em tempo real.
  * *Cloud Storage:* Armazenamento de arquivos (PDFs, imagens) com exclusão sincronizada.
  * *Authentication:* Controle de acesso seguro.
* **Ícones:** Lucide React.
* **Roteamento:** React Router Dom.
* **Notificações:** Sonner (Toasts).

---

## 💻 Como rodar o projeto localmente

Para rodar este projeto na sua máquina para desenvolvimento e testes, siga os passos abaixo:

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado na sua máquina (versão 18 ou superior recomendada).

### 2. Instalação
Clone o repositório e instale as dependências:

```bash
git clone [https://github.com/SEU_USUARIO/suaoab.git](https://github.com/SEU_USUARIO/suaoab.git)
cd suaoab
npm install
