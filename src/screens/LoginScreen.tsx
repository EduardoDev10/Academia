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
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface Props {
  onLoginSucesso: (emailUsuario: string) => void;
}

export default function LoginScreen({ onLoginSucesso }: Props) {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroTexto, setErroTexto] = useState('');
  const [carregando, setCarregando] = useState(false);

  function validarCampos(): boolean {
    setErroTexto('');
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
    try {
      if (modoCadastro) {
        await createUserWithEmailAndPassword(auth, email.trim(), senha);
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
        onLoginSucesso(email.trim());
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), senha);
        onLoginSucesso(email.trim());
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.titulo}>Sistema de Academia</Text>
        <Text style={styles.subtitulo}>
          {modoCadastro ? 'Crie sua conta para continuar' : 'Entre com sua conta'}
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor="#9CA3AF"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        {erroTexto ? <Text style={styles.erro}>{erroTexto}</Text> : null}

        <TouchableOpacity
          style={styles.botaoPrincipal}
          onPress={autenticar}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotaoPrincipal}>
              {modoCadastro ? 'Cadastrar' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoAlternar}
          onPress={() => {
            setModoCadastro(!modoCadastro);
            setErroTexto('');
          }}
        >
          <Text style={styles.textoAlternar}>
            {modoCadastro
              ? 'Já tem uma conta? Faça login'
              : 'Não tem conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  erro: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  botaoPrincipal: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  textoBotaoPrincipal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  botaoAlternar: {
    marginTop: 16,
    alignItems: 'center',
  },
  textoAlternar: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '500',
  },
});
