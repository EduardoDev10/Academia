// Interface que define a estrutura de uma Ficha de Treino (CRUD 3)
export interface Treino {
  id?: number;            // ID gerado automaticamente (opcional no cadastro)
  alunoNome: string;      // Nome do aluno vinculado
  alunoEmail?: string;    // E-mail da conta do aluno vinculado
  professorNome?: string; // Nome do professor que montou o treino
  professorEmail?: string;// E-mail do professor que montou o treino
  exercicioNome: string;  // Nome do exercício vinculado
  divisao?: string;       // Divisão da ficha: Treino A, Treino B ou Treino C
  diaSemana: string;      // Séries e repetições (Ex: 4x12)
  carga: string;          // Carga em kg (Ex: 40kg)
  sincronizado?: number;  // 1 = Sincronizado com Firestore | 0 = Pendente no SQLite
}
