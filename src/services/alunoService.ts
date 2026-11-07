import { getDatabase } from './database';
import { salvarNoFirestore, deletarDoFirestore } from './firebase';
import { Aluno } from '../types/Aluno';

export async function listarAlunos(): Promise<Aluno[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Aluno>('SELECT * FROM alunos ORDER BY id DESC');
  return result;
}

export async function criarAluno(
  aluno: Omit<Aluno, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    const resultado = await db.runAsync(
      'INSERT INTO alunos (matricula, nome, email, cep, endereco, plano, sincronizado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        aluno.matricula,
        aluno.nome,
        aluno.email,
        aluno.cep,
        aluno.endereco,
        aluno.plano,
        sincronizado,
      ]
    );

    // Se estiver online, envia também para o Firestore (Banco na Nuvem)
    if (online && resultado.lastInsertRowId) {
      await salvarNoFirestore('alunos', resultado.lastInsertRowId, {
        id: resultado.lastInsertRowId,
        ...aluno,
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao criar aluno:', error);
    return false;
  }
}

export async function atualizarAluno(
  id: number,
  aluno: Omit<Aluno, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    await db.runAsync(
      'UPDATE alunos SET matricula = ?, nome = ?, email = ?, cep = ?, endereco = ?, plano = ?, sincronizado = ? WHERE id = ?',
      [
        aluno.matricula,
        aluno.nome,
        aluno.email,
        aluno.cep,
        aluno.endereco,
        aluno.plano,
        sincronizado,
        id,
      ]
    );

    // Se estiver online, atualiza também no Firestore
    if (online) {
      await salvarNoFirestore('alunos', id, { id, ...aluno });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
    return false;
  }
}

export async function deletarAluno(
  id: number,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM alunos WHERE id = ?', [id]);

    if (online) {
      await deletarDoFirestore('alunos', id);
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar aluno:', error);
    return false;
  }
}

/**
 * Sincroniza os alunos cadastrados sem internet (sincronizado = 0) do SQLite para o Firestore
 */
export async function sincronizarAlunos(): Promise<number> {
  try {
    const db = await getDatabase();
    const pendentes = await db.getAllAsync<Aluno>(
      'SELECT * FROM alunos WHERE sincronizado = 0'
    );

    for (const aluno of pendentes) {
      if (aluno.id) {
        await salvarNoFirestore('alunos', aluno.id, aluno);
        await db.runAsync('UPDATE alunos SET sincronizado = 1 WHERE id = ?', [
          aluno.id,
        ]);
      }
    }

    return pendentes.length;
  } catch (error) {
    console.error('Erro ao sincronizar alunos:', error);
    return 0;
  }
}
