// Interface que define a estrutura de um exercício da academia (CRUD 2)
export interface Exercicio {
  id?: number;          // ID gerado automaticamente (opcional no cadastro)
  nome: string;         // Nome do exercício (Ex: Supino Reto)
  grupoMuscular: string;// Grupo muscular (Ex: Peito, Costas, Pernas)
  equipamento: string;  // Equipamento utilizado (Ex: Barra, Halteres)
  series: string;       // Séries e repetições (Ex: 4x12)
  sincronizado?: number; // 1 = Sincronizado com Firestore | 0 = Pendente no SQLite
}
