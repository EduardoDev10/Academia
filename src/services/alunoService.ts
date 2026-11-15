import { getDatabase } from './database';
import {
  salvarNoFirestore,
  deletarDoFirestore,
  desvincularAlunoNaNuvem,
  listarTodosAlunosNaNuvem,
} from './firebase';
import { Aluno } from '../types/Aluno';

function gerarIdDoc(professorEmail: string | undefined, id: number): string {
  const prefixo = (professorEmail || 'geral')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  return `${prefixo}_${id}`;
}

export async function listarAlunos(
  professorEmail?: string,
  online: boolean = true
): Promise<Aluno[]> {
  const db = await getDatabase();
  let result = await db.getAllAsync<Aluno>(
    'SELECT * FROM alunos ORDER BY id DESC'
  );

  // Se estiver online, verifica se algum aluno sincronizado se desvinculou na nuvem
  if (online) {
    try {
      const alunosNuvem = await listarTodosAlunosNaNuvem();
      const mapaNuvem = new Map<string, Aluno>();
      alunosNuvem.forEach((a) => {
        if (a.email) {
          mapaNuvem.set(a.email.trim().toLowerCase(), a);
        }
      });

      let houveAlteracao = false;
      for (const local of result) {
        const emailLocal = (local.email || '').trim().toLowerCase();
        const nuvemObj = mapaNuvem.get(emailLocal);
        if (local.sincronizado === 1 && !nuvemObj) {
          await db.runAsync('DELETE FROM alunos WHERE id = ?', [local.id!]);
          await db.runAsync(
            'DELETE FROM treinos WHERE LOWER(alunoEmail) = ? OR LOWER(alunoNome) = ?',
            [emailLocal, (local.nome || '').trim().toLowerCase()]
          );
          houveAlteracao = true;
        } else if (
          nuvemObj &&
          (nuvemObj.nome !== local.nome ||
            (nuvemObj.cep && nuvemObj.cep !== local.cep) ||
            (nuvemObj.endereco && nuvemObj.endereco !== local.endereco))
        ) {
          await db.runAsync(
            'UPDATE alunos SET nome = ?, cep = ?, endereco = ? WHERE id = ?',
            [
              nuvemObj.nome || local.nome,
              nuvemObj.cep || local.cep,
              nuvemObj.endereco || local.endereco,
              local.id!,
            ]
          );
          houveAlteracao = true;
        }
      }

      if (houveAlteracao) {
        result = await db.getAllAsync<Aluno>(
          'SELECT * FROM alunos ORDER BY id DESC'
        );
      }
    } catch (e) {}
  }

  if (!professorEmail) return result;
  const emailProf = professorEmail.trim().toLowerCase();
  return result.filter(
    (a) =>
      !a.professorEmail ||
      a.professorEmail.trim().toLowerCase() === emailProf
  );
}

export async function criarAluno(
  aluno: Omit<Aluno, 'id'>,
  online: boolean = true
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const sincronizado = online ? 1 : 0;

    const resultado = await db.runAsync(
      'INSERT INTO alunos (matricula, nome, email, cep, endereco, plano, professorNome, professorEmail, sincronizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        aluno.matricula,
        aluno.nome,
        aluno.email,
        aluno.cep,
        aluno.endereco,
        aluno.plano,
        aluno.professorNome || '',
        aluno.professorEmail || '',
        sincronizado,
      ]
    );

    if (online && resultado.lastInsertRowId) {
      const docId = gerarIdDoc(aluno.professorEmail, resultado.lastInsertRowId);
      await salvarNoFirestore('alunos_v2', docId, {
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
      'UPDATE alunos SET matricula = ?, nome = ?, email = ?, cep = ?, endereco = ?, plano = ?, professorNome = ?, professorEmail = ?, sincronizado = ? WHERE id = ?',
      [
        aluno.matricula,
        aluno.nome,
        aluno.email,
        aluno.cep,
        aluno.endereco,
        aluno.plano,
        aluno.professorNome || '',
        aluno.professorEmail || '',
        sincronizado,
        id,
      ]
    );

    if (online) {
      const docId = gerarIdDoc(aluno.professorEmail, id);
      await salvarNoFirestore('alunos_v2', docId, { id, ...aluno });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
    return false;
  }
}

export async function deletarAluno(
  id: number,
  online: boolean = true,
  professorEmail?: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM alunos WHERE id = ?', [id]);

    if (online) {
      const docId = gerarIdDoc(professorEmail, id);
      await deletarDoFirestore('alunos_v2', docId);
      await deletarDoFirestore('alunos_v2', id);
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar aluno:', error);
    return false;
  }
}

/**
 * Desvincula o aluno do professor atual (usado pelo aluno no Perfil para trocar de professor)
 */
export async function desvincularProfessorDoAluno(
  emailAluno: string,
  online: boolean = true,
  nomeAluno?: string
): Promise<boolean> {
  try {
    const emailLimpo = emailAluno.trim().toLowerCase();
    const db = await getDatabase();

    // Descobre também o nome cadastrado na tabela alunos para limpar treinos vinculados pelo nome
    const registrosAluno = await db.getAllAsync<Aluno>(
      'SELECT * FROM alunos WHERE LOWER(email) = ?',
      [emailLimpo]
    );
    const nomeCadastrado = (
      registrosAluno[0]?.nome ||
      nomeAluno ||
      ''
    )
      .trim()
      .toLowerCase();

    await db.runAsync('DELETE FROM alunos WHERE LOWER(email) = ?', [
      emailLimpo,
    ]);

    if (nomeCadastrado) {
      await db.runAsync(
        'DELETE FROM treinos WHERE LOWER(alunoEmail) = ? OR LOWER(alunoNome) = ?',
        [emailLimpo, nomeCadastrado]
      );
    } else {
      await db.runAsync('DELETE FROM treinos WHERE LOWER(alunoEmail) = ?', [
        emailLimpo,
      ]);
    }

    if (online) {
      await desvincularAlunoNaNuvem(emailLimpo, nomeCadastrado);
    }

    return true;
  } catch (error) {
    console.error('Erro ao desvincular professor do aluno:', error);
    return false;
  }
}

export async function sincronizarAlunos(): Promise<number> {
  try {
    const db = await getDatabase();
    const pendentes = await db.getAllAsync<Aluno>(
      'SELECT * FROM alunos WHERE sincronizado = 0'
    );

    for (const aluno of pendentes) {
      if (aluno.id) {
        const docId = gerarIdDoc(aluno.professorEmail, aluno.id);
        await salvarNoFirestore('alunos_v2', docId, aluno);
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
