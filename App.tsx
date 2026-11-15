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
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import AlunosScreen from './src/screens/AlunosScreen';
import ExerciciosScreen from './src/screens/ExerciciosScreen';
import TreinosScreen from './src/screens/TreinosScreen';
import AreaAlunoScreen from './src/screens/AreaAlunoScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import { PerfilUsuario } from './src/services/firebase';
import { sincronizarAlunos } from './src/services/alunoService';
import { sincronizarExercicios } from './src/services/exercicioService';
import { sincronizarTreinos } from './src/services/treinoService';

type AbaAtiva = 'alunos' | 'exercicios' | 'treinos' | 'meu_treino' | 'perfil';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState<PerfilUsuario | null>(null);
  const [telaAtiva, setTelaAtiva] = useState<AbaAtiva>('alunos');
  const [alunoSelecionadoTreino, setAlunoSelecionadoTreino] = useState<string>('Todos');

  const [redeFisicaOnline, setRedeFisicaOnline] = useState(true);
  const [simularOffline, setSimularOffline] = useState(false);
  const [syncKey, setSyncKey] = useState(0);
  const [avisoSync, setAvisoSync] = useState('');

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

    setSyncKey((prev) => prev + 1);

    if (total > 0) {
      const msg = `${total} registro(s) salvo(s) offline foram sincronizados com a nuvem.`;
      setAvisoSync(msg);
      setTimeout(() => setAvisoSync(''), 5000);
      if (Platform.OS !== 'web') {
        Alert.alert('Sincronização Concluída', msg);
      }
    }
  }

  const ehAluno = usuarioLogado?.tipo === 'aluno';

  const tituloTela =
    telaAtiva === 'perfil'
      ? 'Perfil'
      : ehAluno
      ? 'Minha Ficha'
      : telaAtiva === 'alunos'
      ? 'Alunos'
      : telaAtiva === 'exercicios'
      ? 'Catálogo'
      : 'Fichas';

  return (
    <View style={styles.outerBackground}>
      <SafeAreaView style={styles.mobileFrame}>
        <StatusBar barStyle="dark-content" />

        {!usuarioLogado ? (
          <LoginScreen
            onLoginSucesso={(perfil) => {
              setUsuarioLogado(perfil);
              setTelaAtiva(perfil.tipo === 'aluno' ? 'meu_treino' : 'alunos');
            }}
          />
        ) : (
          <>
            {/* Topo simples e direto */}
            <View style={styles.appBar}>
              <View>
                <Text style={styles.appBarTitle}>{tituloTela}</Text>
                <Text style={styles.userSub}>
                  {usuarioLogado.nome} ({ehAluno ? 'Aluno' : 'Professor'})
                </Text>
              </View>

              <View style={styles.appBarRight}>
                <TouchableOpacity
                  style={styles.statusBtn}
                  onPress={() => setSimularOffline(!simularOffline)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: online ? '#16A34A' : '#D97706' },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {online ? 'Online' : 'Offline'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setUsuarioLogado(null)}>
                  <Text style={styles.logoutText}>Sair</Text>
                </TouchableOpacity>
              </View>
            </View>

            {avisoSync ? (
              <View style={styles.syncBanner}>
                <Text style={styles.syncBannerText}>{avisoSync}</Text>
              </View>
            ) : null}

            {/* Corpo da Tela */}
            <View style={styles.screenBody} key={syncKey}>
              {telaAtiva === 'perfil' ? (
                <PerfilScreen
                  usuario={usuarioLogado}
                  online={online}
                  onAtualizarPerfil={(novoPerfil) =>
                    setUsuarioLogado(novoPerfil)
                  }
                  onExcluirConta={() => setUsuarioLogado(null)}
                />
              ) : ehAluno ? (
                <AreaAlunoScreen usuario={usuarioLogado} online={online} />
              ) : (
                <>
                  {telaAtiva === 'alunos' && (
                    <AlunosScreen
                      online={online}
                      professorLogado={usuarioLogado}
                      onVerTreinoAluno={(nomeAluno) => {
                        setAlunoSelecionadoTreino(nomeAluno);
                        setTelaAtiva('treinos');
                      }}
                    />
                  )}
                  {telaAtiva === 'exercicios' && (
                    <ExerciciosScreen online={online} />
                  )}
                  {telaAtiva === 'treinos' && (
                    <TreinosScreen
                      online={online}
                      professorLogado={usuarioLogado}
                      alunoFiltro={alunoSelecionadoTreino}
                      onMudarAlunoFiltro={setAlunoSelecionadoTreino}
                    />
                  )}
                </>
              )}
            </View>

            {/* Barra de Navegação Inferior com Ícone + Texto (sem formato de botão) */}
            <View style={styles.bottomTabBar}>
              {ehAluno ? (
                <>
                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setTelaAtiva('meu_treino')}
                  >
                    <Ionicons
                      name={
                        telaAtiva === 'meu_treino'
                          ? 'barbell'
                          : 'barbell-outline'
                      }
                      size={22}
                      color={
                        telaAtiva === 'meu_treino' ? '#111111' : '#888888'
                      }
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        telaAtiva === 'meu_treino' && styles.tabLabelActive,
                      ]}
                    >
                      Meu Treino
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setTelaAtiva('perfil')}
                  >
                    <Ionicons
                      name={
                        telaAtiva === 'perfil' ? 'person' : 'person-outline'
                      }
                      size={22}
                      color={telaAtiva === 'perfil' ? '#111111' : '#888888'}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        telaAtiva === 'perfil' && styles.tabLabelActive,
                      ]}
                    >
                      Perfil
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setTelaAtiva('alunos')}
                  >
                    <Ionicons
                      name={
                        telaAtiva === 'alunos' ? 'people' : 'people-outline'
                      }
                      size={22}
                      color={telaAtiva === 'alunos' ? '#111111' : '#888888'}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        telaAtiva === 'alunos' && styles.tabLabelActive,
                      ]}
                    >
                      Alunos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setTelaAtiva('exercicios')}
                  >
                    <Ionicons
                      name={
                        telaAtiva === 'exercicios'
                          ? 'barbell'
                          : 'barbell-outline'
                      }
                      size={22}
                      color={
                        telaAtiva === 'exercicios' ? '#111111' : '#888888'
                      }
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        telaAtiva === 'exercicios' && styles.tabLabelActive,
                      ]}
                    >
                      Exercícios
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setTelaAtiva('treinos')}
                  >
                    <Ionicons
                      name={
                        telaAtiva === 'treinos'
                          ? 'clipboard'
                          : 'clipboard-outline'
                      }
                      size={22}
                      color={telaAtiva === 'treinos' ? '#111111' : '#888888'}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        telaAtiva === 'treinos' && styles.tabLabelActive,
                      ]}
                    >
                      Treinos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setTelaAtiva('perfil')}
                  >
                    <Ionicons
                      name={
                        telaAtiva === 'perfil' ? 'person' : 'person-outline'
                      }
                      size={22}
                      color={telaAtiva === 'perfil' ? '#111111' : '#888888'}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        telaAtiva === 'perfil' && styles.tabLabelActive,
                      ]}
                    >
                      Perfil
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBackground: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#EBEBEB' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    maxHeight: Platform.OS === 'web' ? 860 : undefined,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    ...(Platform.OS === 'web'
      ? {
          borderWidth: 1,
          borderColor: '#D4D4D4',
        }
      : {}),
  },
  appBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  appBarTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111111',
  },
  userSub: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#555555',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C53030',
  },
  syncBanner: {
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  syncBannerText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  screenBody: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888888',
  },
  tabLabelActive: {
    color: '#111111',
    fontWeight: '700',
  },
});
