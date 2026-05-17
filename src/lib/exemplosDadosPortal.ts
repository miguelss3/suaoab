/**
 * EXEMPLO DE ESTRUTURA DE DADOS PARA O FIRESTORE
 * Copie e adapte esses dados para sua coleção
 */

// ============================================
// EXEMPLO 1: DISCIPLINA COM MEU PROFESSOR
// ============================================
export const disciplinaExemplo1 = {
  id: "disc_direito_economico_001", // Auto-generated pelo Firestore
  nome: "Direito Econômico e Financeiro",
  professor: "Prof. Seu Nome Aqui", // Seu nome
  isOutroProfessor: false, // IMPORTANTE: false = sua aula (cores primárias)
  semestre: "2026/1",
  status: "ativa" as const,
};

// ============================================
// EXEMPLO 2: DISCIPLINA COM OUTRO PROFESSOR
// ============================================
export const disciplinaExemplo2 = {
  id: "disc_administrativo_001",
  nome: "Direito Administrativo",
  professor: "Prof. João Silva",
  isOutroProfessor: true, // IMPORTANTE: true = outro professor (cores mutadas)
  semestre: "2026/1",
  status: "ativa" as const,
};

// ============================================
// EXEMPLO 3: MATERIAL - RESUMO (NÃO PREMIUM)
// ============================================
export const materialExemplo1 = {
  id: "mat_001",
  disciplinaId: "disc_direito_economico_001", // Referencia a disciplina
  titulo: "Aula 01 - Princípios da Ordem Econômica",
  tipo: "resumo" as const,
  conteudoTexto: `
    # Princípios da Ordem Econômica

    Os princípios da ordem econômica estão previstos no art. 170 da CF/88.

    ## Princípios:
    1. Soberania nacional
    2. Propriedade privada
    3. Função social da propriedade
    4. Livre concorrência
    5. Defesa do consumidor

    [... mais conteúdo aqui ...]
  `,
  urlDownload: undefined, // Não há download, apenas texto
  dataCriacao: new Date("2026-05-01"),
  isPremium: false, // Acesso livre com login
};

// ============================================
// EXEMPLO 4: MATERIAL - SLIDE (PREMIUM)
// ============================================
export const materialExemplo2 = {
  id: "mat_002",
  disciplinaId: "disc_direito_economico_001",
  titulo: "Aula 02 - Regime Tributário",
  tipo: "slide" as const,
  conteudoTexto: "Veja os slides abaixo...",
  urlDownload: "https://storage.googleapis.com/sua-oab.appspot.com/slides/aula02.pdf",
  dataCriacao: new Date("2026-05-05"),
  isPremium: true, // Exclusivo para mentorados
};

// ============================================
// EXEMPLO 5: MATERIAL - PROVA (NÃO PREMIUM)
// ============================================
export const materialExemplo3 = {
  id: "mat_003",
  disciplinaId: "disc_direito_economico_001",
  titulo: "Simulado - Questões de Ordem Econômica",
  tipo: "prova" as const,
  conteudoTexto: undefined,
  urlDownload: "https://storage.googleapis.com/sua-oab.appspot.com/provas/simulado01.pdf",
  dataCriacao: new Date("2026-05-10"),
  isPremium: false,
};

// ============================================
// COMO ADICIONAR NO FIRESTORE
// ============================================
/*
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto "sua-oab"
3. Vá em Firestore Database
4. Crie a coleção "disciplinas"
5. Adicione um documento com os dados de disciplinaExemplo1
6. Crie a coleção "materiaisAcademicos"
7. Adicione documentos com os dados de materialExemplo1, 2, 3

IMPORTANTE:
- O campo 'dataCriacao' deve ser um Timestamp (não Date)
- O 'disciplinaId' deve corresponder exatamente ao 'id' da disciplina
- 'status' deve ser exatamente 'ativa' ou 'arquivada'
- 'tipo' deve ser 'resumo', 'slide' ou 'prova'
*/

// ============================================
// ESTRUTURA COM FIRESTORE TIMESTAMPS
// ============================================
import { Timestamp } from "firebase/firestore";

export const disciplinasFixture = [
  {
    id: "disc_direito_economico_001",
    nome: "Direito Econômico e Financeiro",
    professor: "Prof. Seu Nome",
    isOutroProfessor: false,
    semestre: "2026/1",
    status: "ativa",
  },
  {
    id: "disc_direito_administrativo_001",
    nome: "Direito Administrativo",
    professor: "Prof. João Silva",
    isOutroProfessor: true,
    semestre: "2026/1",
    status: "ativa",
  },
  {
    id: "disc_direito_civil_001",
    nome: "Direito Civil",
    professor: "Prof. Maria Santos",
    isOutroProfessor: false,
    semestre: "2026/1",
    status: "ativa",
  },
];

export const materiaisFixture = [
  // Materiais da disciplina 1
  {
    id: "mat_001",
    disciplinaId: "disc_direito_economico_001",
    titulo: "Aula 01 - Princípios da Ordem Econômica",
    tipo: "resumo",
    conteudoTexto: "Conteúdo do resumo...",
    urlDownload: null,
    dataCriacao: Timestamp.fromDate(new Date("2026-05-01")),
    isPremium: false,
  },
  {
    id: "mat_002",
    disciplinaId: "disc_direito_economico_001",
    titulo: "Aula 02 - Regime Tributário",
    tipo: "slide",
    conteudoTexto: null,
    urlDownload: "https://storage.googleapis.com/slides/aula02.pdf",
    dataCriacao: Timestamp.fromDate(new Date("2026-05-05")),
    isPremium: true,
  },
  {
    id: "mat_003",
    disciplinaId: "disc_direito_economico_001",
    titulo: "Simulado - Questões de Ordem Econômica",
    tipo: "prova",
    conteudoTexto: null,
    urlDownload: "https://storage.googleapis.com/provas/simulado01.pdf",
    dataCriacao: Timestamp.fromDate(new Date("2026-05-10")),
    isPremium: false,
  },
  // Materiais da disciplina 2
  {
    id: "mat_004",
    disciplinaId: "disc_direito_administrativo_001",
    titulo: "Noções Gerais de Direito Administrativo",
    tipo: "resumo",
    conteudoTexto: "Conteúdo do resumo...",
    urlDownload: null,
    dataCriacao: Timestamp.fromDate(new Date("2026-05-02")),
    isPremium: false,
  },
  // Materiais da disciplina 3
  {
    id: "mat_005",
    disciplinaId: "disc_direito_civil_001",
    titulo: "Teoria Geral do Direito Civil",
    tipo: "slide",
    conteudoTexto: null,
    urlDownload: "https://storage.googleapis.com/slides/direito_civil_01.pdf",
    dataCriacao: Timestamp.fromDate(new Date("2026-05-03")),
    isPremium: false,
  },
];

// ============================================
// SCRIPT PARA ADICIONAR DADOS NO FIRESTORE (Node.js)
// ============================================
/*
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDados() {
  try {
    // Adicionar disciplinas
    for (const disc of disciplinasFixture) {
      await addDoc(collection(db, "disciplinas"), disc);
      console.log("Disciplina adicionada:", disc.nome);
    }

    // Adicionar materiais
    for (const mat of materiaisFixture) {
      await addDoc(collection(db, "materiaisAcademicos"), mat);
      console.log("Material adicionado:", mat.titulo);
    }

    console.log("✅ Dados de teste adicionados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao adicionar dados:", error);
  }
}

seedDados();
*/
