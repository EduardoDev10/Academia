import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  auth,
  PerfilUsuario,
  salvarPerfilUsuario,
  buscarPerfilPorEmail,
  buscarDadosAlunoNaNuvem,
} from '../services/firebase';

interface Props {
  onLoginSucesso: (usuario: PerfilUsuario) => void;
}

export default function LoginScreen({ onLoginSucesso }: Props) {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [tipoConta, setTipoConta] = useState<'aluno' | 'professor'>('aluno');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroTexto, setErroTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  const [googlePendente, setGooglePendente] = useState<{
    nome: string;
    email: string;
  } | null>(null);

  function validarCampos(): boolean {
    setErroTexto('');
    if (modoCadastro && !nome.trim()) {
      setErroTexto('Informe seu nome completo.');
      return false;
    }
    if (!email.trim() || !senha.trim()) {
      setErroTexto('Preencha o e-mail e a senha.');
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErroTexto('Digite um e-mail válido.');
      return false;
    }
    if (senha.length < 6) {
      setErroTexto('A senha precisa ter pelo menos 6 caracteres.');
      return false;
    }
    return true;
  }

  async function autenticar() {
    if (!validarCampos()) return;

    setCarregando(true);
    const emailLimpo = email.trim().toLowerCase();

    try {
      if (modoCadastro) {
        await createUserWithEmailAndPassword(auth, emailLimpo, senha);
        const novoPerfil: PerfilUsuario = {
          nome: nome.trim(),
          email: emailLimpo,
          tipo: tipoConta,
        };
        await salvarPerfilUsuario(novoPerfil);
        Alert.alert(
          'Conta criada!',
          tipoConta === 'aluno'
            ? 'Sua conta de Aluno foi criada. Informe seu e-mail ao professor para ele montar seu treino!'
            : 'Sua conta de Professor foi criada com sucesso!'
        );
        onLoginSucesso(novoPerfil);
      } else {
        await signInWithEmailAndPassword(auth, emailLimpo, senha);

        let perfil = await buscarPerfilPorEmail(emailLimpo);

        if (!perfil) {
          const alunoNuvem = await buscarDadosAlunoNaNuvem(emailLimpo);
          if (alunoNuvem) {
            perfil = {
              nome: alunoNuvem.nome,
              email: emailLimpo,
              tipo: 'aluno',
            };
          } else {
            perfil = {
              nome: emailLimpo.split('@')[0],
              email: emailLimpo,
              tipo: 'professor',
            };
          }
        }

        onLoginSucesso(perfil);
      }
    } catch (error: any) {
      const codigo = error?.code || '';
      if (codigo === 'auth/email-already-in-use') {
        setErroTexto('Este e-mail já está cadastrado.');
      } else if (
        codigo === 'auth/wrong-password' ||
        codigo === 'auth/user-not-found' ||
        codigo === 'auth/invalid-credential'
      ) {
        setErroTexto('E-mail ou senha incorretos.');
      } else {
        setErroTexto('Erro ao autenticar. Verifique seus dados.');
      }
    } finally {
      setCarregando(false);
    }
  }

  async function autenticarComGoogle() {
    setErroTexto('');

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Login com Google',
        'No Expo Go pelo celular, utilize o login com E-mail e Senha (o popup direto do Google é suportado na versão Web).'
      );
      return;
    }

    setCarregandoGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const resultado = await signInWithPopup(auth, provider);
      const user = resultado.user;
      const emailGoogle = (user.email || '').trim().toLowerCase();
      const nomeGoogle =
        (user.displayName || '').trim() || emailGoogle.split('@')[0];

      const perfilExistente = await buscarPerfilPorEmail(emailGoogle);

      if (perfilExistente) {
        onLoginSucesso(perfilExistente);
        return;
      }

      if (modoCadastro) {
        const novoPerfil: PerfilUsuario = {
          nome: nome.trim() || nomeGoogle,
          email: emailGoogle,
          tipo: tipoConta,
        };
        await salvarPerfilUsuario(novoPerfil);
        onLoginSucesso(novoPerfil);
        return;
      }

      setGooglePendente({
        nome: nomeGoogle,
        email: emailGoogle,
      });
    } catch (error: any) {
      const codigo = error?.code || '';
      if (codigo === 'auth/popup-closed-by-user') {
        setErroTexto('A janela de login do Google foi fechada.');
      } else if (
        codigo === 'auth/operation-not-allowed' ||
        codigo === 'auth/configuration-not-found'
      ) {
        setErroTexto(
          'Ative o login com Google no Firebase Console (Authentication > Sign-in method > Google).'
        );
      } else {
        setErroTexto('Não foi possível entrar com o Google.');
      }
    } finally {
      setCarregandoGoogle(false);
    }
  }

  async function concluirPrimeiroAcessoGoogle(
    tipoEscolhido: 'aluno' | 'professor'
  ) {
    if (!googlePendente) return;
    setCarregandoGoogle(true);
    try {
      const novoPerfil: PerfilUsuario = {
        nome: googlePendente.nome,
        email: googlePendente.email,
        tipo: tipoEscolhido,
      };
      await salvarPerfilUsuario(novoPerfil);
      setGooglePendente(null);
      onLoginSucesso(novoPerfil);
    } finally {
      setCarregandoGoogle(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerArea}>
          <Text style={styles.titulo}>FitSync</Text>
          <Text style={styles.subtitulo}>
            Gestão de fichas de treino que conecta personal trainers e alunos em
            tempo real.
          </Text>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, !modoCadastro && styles.tabBtnAtivo]}
            onPress={() => {
              setModoCadastro(false);
              setErroTexto('');
            }}
          >
            <Text
              style={[styles.tabTexto, !modoCadastro && styles.tabTextoAtivo]}
            >
              Entrar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, modoCadastro && styles.tabBtnAtivo]}
            onPress={() => {
              setModoCadastro(true);
              setErroTexto('');
            }}
          >
            <Text
              style={[styles.tabTexto, modoCadastro && styles.tabTextoAtivo]}
            >
              Criar conta
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formArea}>
          {modoCadastro && (
            <>
              <Text style={styles.label}>Tipo de conta</Text>
              <View style={styles.seletorTipo}>
                <TouchableOpacity
                  style={[
                    styles.opcaoTipo,
                    tipoConta === 'aluno' && styles.opcaoTipoAtiva,
                  ]}
                  onPress={() => setTipoConta('aluno')}
                >
                  <Text
                    style={[
                      styles.textoTipo,
                      tipoConta === 'aluno' && styles.textoTipoAtivo,
                    ]}
                  >
                    Aluno
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.opcaoTipo,
                    tipoConta === 'professor' && styles.opcaoTipoAtiva,
                  ]}
                  onPress={() => setTipoConta('professor')}
                >
                  <Text
                    style={[
                      styles.textoTipo,
                      tipoConta === 'professor' && styles.textoTipoAtivo,
                    ]}
                  >
                    Professor
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#999999"
                value={nome}
                onChangeText={setNome}
              />
            </>
          )}

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#999999"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          {erroTexto ? <Text style={styles.erro}>{erroTexto}</Text> : null}

          <TouchableOpacity
            style={styles.botaoPrincipal}
            onPress={autenticar}
            disabled={carregando || carregandoGoogle}
          >
            {carregando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBotaoPrincipal}>
                {modoCadastro ? 'Cadastrar' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoGoogle}
            onPress={autenticarComGoogle}
            disabled={carregando || carregandoGoogle}
          >
            {carregandoGoogle ? (
              <ActivityIndicator color="#222222" />
            ) : (
              <Text style={styles.textoBotaoGoogle}>
                Entrar com conta Google
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(googlePendente)}
        transparent
        animationType="fade"
        onRequestClose={() => setGooglePendente(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Escolha seu perfil</Text>
            <Text style={styles.modalSub}>
              Como você vai usar o aplicativo com o e-mail{' '}
              {googlePendente?.email}?
            </Text>

            <TouchableOpacity
              style={styles.botaoEscolhaAluno}
              onPress={() => concluirPrimeiroAcessoGoogle('aluno')}
            >
              <Text style={styles.textoEscolha}>Aluno</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoEscolhaProfessor}
              onPress={() => concluirPrimeiroAcessoGoogle('professor')}
            >
              <Text style={[styles.textoEscolha, { color: '#222222' }]}>
                Professor
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  headerArea: {
    marginBottom: 28,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  subtitulo: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 24,
    gap: 24,
  },
  tabBtn: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnAtivo: {
    borderBottomColor: '#111111',
  },
  tabTexto: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '500',
  },
  tabTextoAtivo: {
    color: '#111111',
    fontWeight: '600',
  },
  formArea: {
    width: '100%',
  },
  seletorTipo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  opcaoTipo: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  opcaoTipoAtiva: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  textoTipo: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  textoTipoAtivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111111',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  erro: {
    color: '#C53030',
    fontSize: 13,
    marginBottom: 12,
  },
  botaoPrincipal: {
    backgroundColor: '#111111',
    paddingVertical: 13,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  textoBotaoPrincipal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  botaoGoogle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  textoBotaoGoogle: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 19,
    marginBottom: 16,
  },
  botaoEscolhaAluno: {
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  botaoEscolhaProfessor: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    paddingVertical: 12,
    borderRadius: 6,
  },
  textoEscolha: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
