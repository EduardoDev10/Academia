import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import LoginScreen from './src/screens/LoginScreen';
import AlunosScreen from './src/screens/AlunosScreen';
import ExerciciosScreen from './src/screens/ExerciciosScreen';
import TreinosScreen from './src/screens/TreinosScreen';
import { sincronizarAlunos } from './src/services/alunoService';
import { sincronizarExercicios } from './src/services/exercicioService';
import { sincronizarTreinos } from './src/services/treinoService';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState<string | null>(null);
  const [telaAtiva, setTelaAtiva] = useState<'alunos' | 'exercicios' | 'treinos'>('alunos');

  const [redeFisicaOnline, setRedeFisicaOnline] = useState(true);
  const [simularOffline, setSimularOffline] = useState(false);

  const online = redeFisicaOnline && !simularOffline;
  const onlineAnteriorRef = useRef(online);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const conectado = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setRedeFisicaOnline(conectado);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const estavaOffline = !onlineAnteriorRef.current;
    onlineAnteriorRef.current = online;

    if (online && estavaOffline) {
      executarSincronizacao();
    }
  }, [online]);

  async function executarSincronizacao() {
    const qtdAlunos = await sincronizarAlunos();
    const qtdExercicios = await sincronizarExercicios();
    const qtdTreinos = await sincronizarTreinos();
    const total = qtdAlunos + qtdExercicios + qtdTreinos;

    if (total > 0) {
      Alert.alert(
        'Sincronização',
        `${total} registro(s) salvos offline foram sincronizados com o Firestore.`
      );
    }
  }

  if (!usuarioLogado) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <LoginScreen onLoginSucesso={(email) => setUsuarioLogado(email)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Cabeçalho simples */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tituloApp}>Sistema de Academia</Text>
          <Text style={styles.subtituloUsuario}>{usuarioLogado}</Text>
        </View>

        <View style={styles.headerBotoes}>
          <TouchableOpacity
            style={[
              styles.btnConexao,
              online ? styles.btnOnline : styles.btnOffline,
            ]}
            onPress={() => setSimularOffline(!simularOffline)}
          >
            <Text
              style={[
                styles.textoConexao,
                online ? styles.textoOnline : styles.textoOffline,
              ]}
            >
              {online ? 'Online' : 'Offline (SQLite)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSair}
            onPress={() => setUsuarioLogado(null)}
          >
            <Text style={styles.textoSair}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Abas dos 3 CRUDs */}
      <View style={styles.abasContainer}>
        <TouchableOpacity
          style={[styles.aba, telaAtiva === 'alunos' && styles.abaAtiva]}
          onPress={() => setTelaAtiva('alunos')}
        >
          <Text
            style={[
              styles.textoAba,
              telaAtiva === 'alunos' && styles.textoAbaAtiva,
            ]}
          >
            Alunos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aba, telaAtiva === 'exercicios' && styles.abaAtiva]}
          onPress={() => setTelaAtiva('exercicios')}
        >
          <Text
            style={[
              styles.textoAba,
              telaAtiva === 'exercicios' && styles.textoAbaAtiva,
            ]}
          >
            Exercícios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aba, telaAtiva === 'treinos' && styles.abaAtiva]}
          onPress={() => setTelaAtiva('treinos')}
        >
          <Text
            style={[
              styles.textoAba,
              telaAtiva === 'treinos' && styles.textoAbaAtiva,
            ]}
          >
            Treinos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      <View style={styles.conteudo}>
        <View style={styles.wrapper}>
          {telaAtiva === 'alunos' && <AlunosScreen online={online} />}
          {telaAtiva === 'exercicios' && <ExerciciosScreen online={online} />}
          {telaAtiva === 'treinos' && <TreinosScreen online={online} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tituloApp: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  subtituloUsuario: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  headerBotoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnConexao: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnOnline: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  btnOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  textoConexao: {
    fontSize: 12,
    fontWeight: '600',
  },
  textoOnline: {
    color: '#166534',
  },
  textoOffline: {
    color: '#92400E',
  },
  btnSair: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  textoSair: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  abasContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  aba: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  abaAtiva: {
    backgroundColor: '#2563EB',
  },
  textoAba: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  textoAbaAtiva: {
    color: '#FFFFFF',
  },
  conteudo: {
    flex: 1,
    alignItems: 'center',
  },
  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
  },
});
