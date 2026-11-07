// Interface que define a estrutura de uma Ficha de Treino (CRUD 3)
export interface Treino {
  id?: number;          // ID gerado automaticamente (opcional no cadastro)
  alunoNome: string;    // Nome do aluno vinculado
  exercicioNome: string;// Nome do exercício vinculado
  diaSemana: string;    // Dia ou divisão do treino (Ex: Segunda - Treino A)
  carga: string;        // Carga em kg (Ex: 40kg)
  sincronizado?: number; // 1 = Sincronizado com Firestore | 0 = Pendente no SQLite
}
