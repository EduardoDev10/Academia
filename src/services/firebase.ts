import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';

// CONFIGURAÇÃO DO FIREBASE LIDA DO ARQUIVO .env (não vai para o GitHub)
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
    await setDoc(doc(firestoreDb, colecao, String(id)), dados, { merge: true });
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
