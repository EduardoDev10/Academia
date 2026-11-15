import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const EXERCICIOS_PREDEFINIDOS = [
  { nome: 'Supino Reto com Barra', grupoMuscular: 'Peito', equipamento: 'Barra', series: '4x10' },
  { nome: 'Supino Inclinado com Halteres', grupoMuscular: 'Peito', equipamento: 'Halteres', series: '4x12' },
  { nome: 'Crucifixo Máquina (Peck Deck)', grupoMuscular: 'Peito', equipamento: 'Máquina', series: '3x12' },
  { nome: 'Puxada Alta Frontal (Pulley)', grupoMuscular: 'Costas', equipamento: 'Polia', series: '4x12' },
  { nome: 'Remada Baixa no Triângulo', grupoMuscular: 'Costas', equipamento: 'Polia', series: '4x10' },
  { nome: 'Agachamento Livre', grupoMuscular: 'Pernas', equipamento: 'Barra', series: '4x10' },
  { nome: 'Leg Press 45°', grupoMuscular: 'Pernas', equipamento: 'Máquina', series: '4x12' },
  { nome: 'Cadeira Extensora', grupoMuscular: 'Pernas', equipamento: 'Máquina', series: '3x15' },
  { nome: 'Mesa Flexora', grupoMuscular: 'Pernas', equipamento: 'Máquina', series: '3x12' },
  { nome: 'Desenvolvimento com Halteres', grupoMuscular: 'Ombros', equipamento: 'Halteres', series: '4x10' },
  { nome: 'Elevação Lateral', grupoMuscular: 'Ombros', equipamento: 'Halteres', series: '3x15' },
  { nome: 'Rosca Direta na Barra W', grupoMuscular: 'Bíceps', equipamento: 'Barra W', series: '3x12' },
  { nome: 'Tríceps Pulley na Corda', grupoMuscular: 'Tríceps', equipamento: 'Polia', series: '4x12' },
  { nome: 'Abdominal Supra', grupoMuscular: 'Abdômen', equipamento: 'Solo', series: '3x20' },
];

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('academia_v2.db');
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
      professorNome TEXT DEFAULT '',
      professorEmail TEXT DEFAULT '',
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
      alunoEmail TEXT DEFAULT '',
      professorNome TEXT DEFAULT '',
      professorEmail TEXT DEFAULT '',
      exercicioNome TEXT NOT NULL,
      divisao TEXT DEFAULT 'Treino A',
      diaSemana TEXT NOT NULL,
      carga TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS progresso_diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alunoEmail TEXT NOT NULL,
      dataDia TEXT NOT NULL,
      chaveExercicio TEXT NOT NULL,
      concluido INTEGER DEFAULT 1
    );
  `);

  // Garante as colunas caso a tabela já tenha sido criada anteriormente
  try {
    await database.execAsync(
      "ALTER TABLE alunos ADD COLUMN professorNome TEXT DEFAULT '';"
    );
  } catch (e) {}
  try {
    await database.execAsync(
      "ALTER TABLE alunos ADD COLUMN professorEmail TEXT DEFAULT '';"
    );
  } catch (e) {}
  try {
    await database.execAsync(
      "ALTER TABLE treinos ADD COLUMN alunoEmail TEXT DEFAULT '';"
    );
  } catch (e) {}
  try {
    await database.execAsync(
      "ALTER TABLE treinos ADD COLUMN professorNome TEXT DEFAULT '';"
    );
  } catch (e) {}
  try {
    await database.execAsync(
      "ALTER TABLE treinos ADD COLUMN professorEmail TEXT DEFAULT '';"
    );
  } catch (e) {}
  try {
    await database.execAsync(
      "ALTER TABLE treinos ADD COLUMN divisao TEXT DEFAULT 'Treino A';"
    );
  } catch (e) {}

  // Unifica 'Perna' para 'Pernas' caso tenha sido digitado no singular
  try {
    await database.runAsync(
      "UPDATE exercicios SET grupoMuscular = 'Pernas' WHERE LOWER(TRIM(grupoMuscular)) = 'perna'"
    );
  } catch (e) {}

  // Garante que todos os exercícios predefinidos (incluindo Pernas, Peito, Costas, etc.) existam no catálogo
  const cadastrados = await database.getAllAsync<{ nome: string }>(
    'SELECT nome FROM exercicios'
  );
  const nomesExistentes = new Set(
    cadastrados.map((c) => c.nome.trim().toLowerCase())
  );

  for (const ex of EXERCICIOS_PREDEFINIDOS) {
    if (!nomesExistentes.has(ex.nome.trim().toLowerCase())) {
      await database.runAsync(
        'INSERT INTO exercicios (nome, grupoMuscular, equipamento, series, sincronizado) VALUES (?, ?, ?, ?, 1)',
        [ex.nome, ex.grupoMuscular, ex.equipamento, ex.series]
      );
    }
  }
}

export async function buscarProgressoDoDia(
  alunoEmail: string,
  dataDia: string
): Promise<Record<string, boolean>> {
  try {
    const database = await getDatabase();
    const rows = await database.getAllAsync<{
      chaveExercicio: string;
      concluido: number;
    }>(
      'SELECT chaveExercicio, concluido FROM progresso_diario WHERE LOWER(alunoEmail) = LOWER(?) AND dataDia = ?',
      [alunoEmail.trim(), dataDia]
    );
    const mapa: Record<string, boolean> = {};
    rows.forEach((r) => {
      if (r.concluido === 1) {
        mapa[r.chaveExercicio] = true;
      }
    });
    return mapa;
  } catch (e) {
    return {};
  }
}

export async function salvarProgressoDoDia(
  alunoEmail: string,
  dataDia: string,
  chaveExercicio: string,
  concluido: boolean
): Promise<void> {
  try {
    const database = await getDatabase();
    await database.runAsync(
      'DELETE FROM progresso_diario WHERE LOWER(alunoEmail) = LOWER(?) AND dataDia = ? AND chaveExercicio = ?',
      [alunoEmail.trim(), dataDia, chaveExercicio]
    );
    if (concluido) {
      await database.runAsync(
        'INSERT INTO progresso_diario (alunoEmail, dataDia, chaveExercicio, concluido) VALUES (?, ?, ?, 1)',
        [alunoEmail.trim().toLowerCase(), dataDia, chaveExercicio]
      );
    }
  } catch (e) {}
}
