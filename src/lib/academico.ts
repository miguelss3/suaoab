// Define a disciplina (ex: Direito Econômico e Financeiro, Administrativo)
export interface Disciplina {
  id: string;
  nome: string;
  professor: string;
  isOutroProfessor: boolean; // Identifica se é outro professor para renderizar com cor diferente
  semestre: string; // Ex: "2026/1"
  status: 'ativa' | 'arquivada';
}

// Define o material em si (o resumo ou o PDF)
export interface MaterialAcademico {
  id: string;
  disciplinaId: string; // Conecta o material à disciplina
  titulo: string; // Ex: "Aula 01 - Princípios da Ordem Econômica"
  tipo: 'resumo' | 'slide' | 'prova';
  conteudoTexto?: string; // O resumo que você faz no seu Hub
  urlDownload?: string; // O link do Firebase Storage caso seja um PDF/Slide
  dataCriacao: Date;
  isPremium: boolean; // false = acesso com cadastro grátis. true = apenas mentorados OAB.
}