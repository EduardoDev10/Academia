import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('academia.db');
  }
  return db;
}

export async function criarTabela() {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT NOT NULL,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      cep TEXT,
      endereco TEXT,
      plano TEXT,
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      grupoMuscular TEXT NOT NULL,
      equipamento TEXT NOT NULL,
      series TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS treinos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alunoNome TEXT NOT NULL,
      exercicioNome TEXT NOT NULL,
      diaSemana TEXT NOT NULL,
      carga TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0
    );
  `);

  console.log('Tabelas (alunos, exercicios, treinos) criadas/verificadas no SQLite');
}
