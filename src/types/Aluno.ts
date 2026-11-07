// Interface que define a estrutura de um aluno da academia (CRUD 1)
export interface Aluno {
  id?: number;          // ID gerado automaticamente pelo SQLite (PRIMARY KEY AUTOINCREMENT)
  matricula: string;    // Matrícula do aluno
  nome: string;         // Nome completo
  email: string;        // Email
  cep: string;          // CEP consultado na API ViaCEP
  endereco: string;     // Endereço retornado pela API ViaCEP
  plano: string;        // Plano da academia (Ex: Mensal, Anual)
  sincronizado?: number; // 1 = Sincronizado com Firestore | 0 = Salvo apenas no SQLite (Offline)
}
