import { getDatabase } from './database';
import { salvarNoFirestore, deletarDoFirestore } from './firebase';
import { Treino } from '../types/Treino';

function gerarIdDoc(professorEmail: string | undefined, id: number): string {
  const prefixo = (professorEmail || 'geral')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  return `${prefixo}_${id}`;
}

export async function listarTreinos(professorEmail?: string): Promise<Treino[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Treino>(
    'SELECT * FROM treinos ORDER BY id DESC'
  );
  if (!professorEmail) return result;
  const emailProf = professorEmail.trim().toLowerCase();
  return result.filter(
    (t) =>
      !t.professorEmail ||
      t.professorEmail.trim().toLowerCase() === emailProf
  );
}

export async function criarTreino(
  treino: Omit<Treino, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    const resultado = await db.runAsync(
      'INSERT INTO treinos (alunoNome, alunoEmail, professorNome, professorEmail, exercicioNome, divisao, diaSemana, carga, sincronizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        treino.alunoNome,
        treino.alunoEmail || '',
        treino.professorNome || '',
        treino.professorEmail || '',
        treino.exercicioNome,
        treino.divisao || 'Treino A',
        treino.diaSemana,
        treino.carga,
        sincronizado,
      ]
    );

    if (online && resultado.lastInsertRowId) {
      const docId = gerarIdDoc(treino.professorEmail, resultado.lastInsertRowId);
      await salvarNoFirestore('treinos_v2', docId, {
        id: resultado.lastInsertRowId,
        ...treino,
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao criar treino:', error);
    return false;
  }
}

export async function atualizarTreino(
  id: number,
  treino: Omit<Treino, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    await db.runAsync(
      'UPDATE treinos SET alunoNome = ?, alunoEmail = ?, professorNome = ?, professorEmail = ?, exercicioNome = ?, divisao = ?, diaSemana = ?, carga = ?, sincronizado = ? WHERE id = ?',
      [
        treino.alunoNome,
        treino.alunoEmail || '',
        treino.professorNome || '',
        treino.professorEmail || '',
        treino.exercicioNome,
        treino.divisao || 'Treino A',
        treino.diaSemana,
        treino.carga,
        sincronizado,
        id,
      ]
    );

    if (online) {
      const docId = gerarIdDoc(treino.professorEmail, id);
      await salvarNoFirestore('treinos_v2', docId, { id, ...treino });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar treino:', error);
    return false;
  }
}

export async function deletarTreino(
  id: number,
  online: boolean = true,
  professorEmail?: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM treinos WHERE id = ?', [id]);

    if (online) {
      const docId = gerarIdDoc(professorEmail, id);
      await deletarDoFirestore('treinos_v2', docId);
      await deletarDoFirestore('treinos_v2', id);
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar treino:', error);
    return false;
  }
}

export async function sincronizarTreinos(): Promise<number> {
  try {
    const db = await getDatabase();
    const pendentes = await db.getAllAsync<Treino>(
      'SELECT * FROM treinos WHERE sincronizado = 0'
    );

    for (const item of pendentes) {
      if (item.id) {
        const docId = gerarIdDoc(item.professorEmail, item.id);
        await salvarNoFirestore('treinos_v2', docId, item);
        await db.runAsync('UPDATE treinos SET sincronizado = 1 WHERE id = ?', [
          item.id,
        ]);
      }
    }

    return pendentes.length;
  } catch (error) {
    console.error('Erro ao sincronizar treinos:', error);
    return 0;
  }
}
