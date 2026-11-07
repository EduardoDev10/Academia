import { getDatabase } from './database';
import { salvarNoFirestore, deletarDoFirestore } from './firebase';
import { Exercicio } from '../types/Exercicio';

export async function listarExercicios(): Promise<Exercicio[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Exercicio>(
    'SELECT * FROM exercicios ORDER BY id DESC'
  );
  return result;
}

export async function criarExercicio(
  exercicio: Omit<Exercicio, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    const resultado = await db.runAsync(
      'INSERT INTO exercicios (nome, grupoMuscular, equipamento, series, sincronizado) VALUES (?, ?, ?, ?, ?)',
      [
        exercicio.nome,
        exercicio.grupoMuscular,
        exercicio.equipamento,
        exercicio.series,
        sincronizado,
      ]
    );

    if (online && resultado.lastInsertRowId) {
      await salvarNoFirestore('exercicios', resultado.lastInsertRowId, {
        id: resultado.lastInsertRowId,
        ...exercicio,
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao criar exercício:', error);
    return false;
  }
}

export async function atualizarExercicio(
  id: number,
  exercicio: Omit<Exercicio, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    await db.runAsync(
      'UPDATE exercicios SET nome = ?, grupoMuscular = ?, equipamento = ?, series = ?, sincronizado = ? WHERE id = ?',
      [
        exercicio.nome,
        exercicio.grupoMuscular,
        exercicio.equipamento,
        exercicio.series,
        sincronizado,
        id,
      ]
    );

    if (online) {
      await salvarNoFirestore('exercicios', id, { id, ...exercicio });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar exercício:', error);
    return false;
  }
}

export async function deletarExercicio(
  id: number,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM exercicios WHERE id = ?', [id]);

    if (online) {
      await deletarDoFirestore('exercicios', id);
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar exercício:', error);
    return false;
  }
}

export async function sincronizarExercicios(): Promise<number> {
  try {
    const db = await getDatabase();
    const pendentes = await db.getAllAsync<Exercicio>(
      'SELECT * FROM exercicios WHERE sincronizado = 0'
    );

    for (const item of pendentes) {
      if (item.id) {
        await salvarNoFirestore('exercicios', item.id, item);
        await db.runAsync(
          'UPDATE exercicios SET sincronizado = 1 WHERE id = ?',
          [item.id]
        );
      }
    }

    return pendentes.length;
  } catch (error) {
    console.error('Erro ao sincronizar exercícios:', error);
    return 0;
  }
}
