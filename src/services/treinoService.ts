import { getDatabase } from './database';
import { salvarNoFirestore, deletarDoFirestore } from './firebase';
import { Treino } from '../types/Treino';

export async function listarTreinos(): Promise<Treino[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Treino>(
    'SELECT * FROM treinos ORDER BY id DESC'
  );
  return result;
}

export async function criarTreino(
  treino: Omit<Treino, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    const resultado = await db.runAsync(
      'INSERT INTO treinos (alunoNome, exercicioNome, diaSemana, carga, sincronizado) VALUES (?, ?, ?, ?, ?)',
      [
        treino.alunoNome,
        treino.exercicioNome,
        treino.diaSemana,
        treino.carga,
        sincronizado,
      ]
    );

    if (online && resultado.lastInsertRowId) {
      await salvarNoFirestore('treinos', resultado.lastInsertRowId, {
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
      'UPDATE treinos SET alunoNome = ?, exercicioNome = ?, diaSemana = ?, carga = ?, sincronizado = ? WHERE id = ?',
      [
        treino.alunoNome,
        treino.exercicioNome,
        treino.diaSemana,
        treino.carga,
        sincronizado,
        id,
      ]
    );

    if (online) {
      await salvarNoFirestore('treinos', id, { id, ...treino });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar treino:', error);
    return false;
  }
}

export async function deletarTreino(
  id: number,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM treinos WHERE id = ?', [id]);

    if (online) {
      await deletarDoFirestore('treinos', id);
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
        await salvarNoFirestore('treinos', item.id, item);
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
