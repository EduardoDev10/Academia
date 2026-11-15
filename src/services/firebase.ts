import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { Treino } from '../types/Treino';
import { Aluno } from '../types/Aluno';

export interface PerfilUsuario {
  nome: string;
  email: string;
  tipo: 'aluno' | 'professor';
  cep?: string;
  endereco?: string;
}

// CONFIGURAÇÃO DO FIREBASE 
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const firestoreDb = getFirestore(app);

/**
 * Envia um registro para o Firestore (Banco na Nuvem)
 */
export async function salvarNoFirestore(
  colecao: string,
  id: number | string,
  dados: Record<string, any>
): Promise<boolean> {
  try {
    await setDoc(doc(firestoreDb, colecao, String(id)), dados);
    return true;
  } catch (error) {
    console.error(`Erro ao salvar na coleção ${colecao} do Firestore:`, error);
    return false;
  }
}

/**
 * Remove um documento do Firestore (Banco na Nuvem)
 */
export async function deletarDoFirestore(
  colecao: string,
  id: number | string
): Promise<boolean> {
  try {
    await deleteDoc(doc(firestoreDb, colecao, String(id)));
    return true;
  } catch (error) {
    console.error(`Erro ao deletar da coleção ${colecao} do Firestore:`, error);
    return false;
  }
}

/**
 * Salva o perfil do usuário (Aluno ou Professor) no Firestore ao criar conta
 */
export async function salvarPerfilUsuario(perfil: PerfilUsuario): Promise<boolean> {
  try {
    const idDoc = perfil.email.trim().toLowerCase();
    const payload: Record<string, any> = {
      nome: perfil.nome.trim(),
      email: idDoc,
      tipo: perfil.tipo,
    };
    if (perfil.cep !== undefined) {
      payload.cep = perfil.cep.trim();
    }
    if (perfil.endereco !== undefined) {
      payload.endereco = perfil.endereco.trim();
    }
    await setDoc(doc(firestoreDb, 'usuarios', idDoc), payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao salvar perfil do usuário:', error);
    return false;
  }
}

/**
 * Busca os dados de conta de um usuário (ex: quando o professor pesquisa o e-mail do aluno)
 */
export async function buscarPerfilPorEmail(
  email: string
): Promise<PerfilUsuario | null> {
  try {
    const idDoc = email.trim().toLowerCase();
    const snap = await getDoc(doc(firestoreDb, 'usuarios', idDoc));
    if (snap.exists()) {
      const dados = snap.data();
      return {
        nome: dados.nome || '',
        email: dados.email || idDoc,
        tipo: dados.tipo === 'aluno' ? 'aluno' : 'professor',
        cep: dados.cep || '',
        endereco: dados.endereco || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar perfil por e-mail:', error);
    return null;
  }
}

/**
 * Busca os dados de matrícula/plano do aluno na coleção 'alunos_v2' do Firestore
 */
export async function buscarDadosAlunoNaNuvem(
  emailAluno: string
): Promise<Aluno | null> {
  try {
    const emailLimpo = emailAluno.trim().toLowerCase();
    const snap = await getDocs(collection(firestoreDb, 'alunos_v2'));
    for (const d of snap.docs) {
      const dados = d.data() as Aluno;
      if (dados.email && dados.email.trim().toLowerCase() === emailLimpo) {
        return dados;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar dados do aluno na nuvem:', error);
    return null;
  }
}

/**
 * Busca na nuvem (Firestore) todos os treinos montados pelo professor exclusivamente para o e-mail daquele aluno
 */
export async function buscarTreinosDoAlunoNaNuvem(
  emailAluno: string
): Promise<Treino[]> {
  try {
    const emailLimpo = emailAluno.trim().toLowerCase();
    if (!emailLimpo) return [];

    const snap = await getDocs(collection(firestoreDb, 'treinos_v2'));
    const lista: Treino[] = [];

    snap.forEach((docSnap) => {
      const dados = docSnap.data() as Treino;
      const bateEmail =
        Boolean(dados.alunoEmail) &&
        dados.alunoEmail!.trim().toLowerCase() === emailLimpo;

      if (bateEmail) {
        lista.push({
          ...dados,
          id: dados.id ?? Number(docSnap.id) ?? lista.length + 1,
        });
      }
    });

    return lista;
  } catch (error) {
    console.error('Erro ao buscar treinos do aluno na nuvem:', error);
    return [];
  }
}

/**
 * Busca todos os alunos vinculados na nuvem
 */
export async function listarTodosAlunosNaNuvem(): Promise<Aluno[]> {
  try {
    const snap = await getDocs(collection(firestoreDb, 'alunos_v2'));
    const lista: Aluno[] = [];
    snap.forEach((docSnap) => {
      const dados = docSnap.data() as Aluno;
      lista.push({
        ...dados,
        id: dados.id ?? lista.length + 1000,
      });
    });
    return lista;
  } catch (error) {
    console.error('Erro ao listar alunos da nuvem:', error);
    return [];
  }
}

/**
 * Busca todos os treinos na nuvem
 */
export async function listarTodosTreinosNaNuvem(): Promise<Treino[]> {
  try {
    const snap = await getDocs(collection(firestoreDb, 'treinos_v2'));
    const lista: Treino[] = [];
    snap.forEach((docSnap) => {
      const dados = docSnap.data() as Treino;
      lista.push({
        ...dados,
        id: dados.id ?? lista.length + 1000,
      });
    });
    return lista;
  } catch (error) {
    console.error('Erro ao listar todos os treinos da nuvem:', error);
    return [];
  }
}

/**
 * Remove o vínculo do aluno com o professor atual e limpa os treinos antigos na nuvem
 */
export async function desvincularAlunoNaNuvem(
  emailAluno: string,
  nomeAluno?: string
): Promise<boolean> {
  try {
    const emailLimpo = emailAluno.trim().toLowerCase();
    let nomeLimpo = (nomeAluno || '').trim().toLowerCase();

    const [snapAlunos, snapTreinos] = await Promise.all([
      getDocs(collection(firestoreDb, 'alunos_v2')),
      getDocs(collection(firestoreDb, 'treinos_v2')),
    ]);

    for (const d of snapAlunos.docs) {
      const dados = d.data() as Aluno;
      if (dados.email && dados.email.trim().toLowerCase() === emailLimpo) {
        if (!nomeLimpo && dados.nome) {
          nomeLimpo = dados.nome.trim().toLowerCase();
        }
        await deleteDoc(doc(firestoreDb, 'alunos_v2', d.id));
      }
    }

    for (const d of snapTreinos.docs) {
      const dados = d.data() as Treino;
      const bateEmail =
        Boolean(dados.alunoEmail) &&
        dados.alunoEmail!.trim().toLowerCase() === emailLimpo;
      const bateNome =
        Boolean(nomeLimpo) &&
        Boolean(dados.alunoNome) &&
        dados.alunoNome.trim().toLowerCase() === nomeLimpo;

      if (bateEmail || bateNome) {
        await deleteDoc(doc(firestoreDb, 'treinos_v2', d.id));
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao desvincular aluno na nuvem:', error);
    return false;
  }
}
