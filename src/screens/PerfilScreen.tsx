import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updatePassword, updateProfile, deleteUser } from 'firebase/auth';
import {
  auth,
  PerfilUsuario,
  salvarPerfilUsuario,
  buscarPerfilPorEmail,
  deletarDoFirestore,
  buscarDadosAlunoNaNuvem,
} from '../services/firebase';
import {
  listarAlunos,
  atualizarAluno,
  desvincularProfessorDoAluno,
} from '../services/alunoService';
import { Aluno } from '../types/Aluno';

interface Props {
  usuario: PerfilUsuario;
  online?: boolean;
  onAtualizarPerfil: (novoPerfil: PerfilUsuario) => void;
  onExcluirConta: () => void;
}

export default function PerfilScreen({
  usuario,
  online = true,
  onAtualizarPerfil,
  onExcluirConta,
}: Props) {
  const [nome, setNome] = useState(usuario.nome);
  const [cep, setCep] = useState(usuario.cep || '');
  const [endereco, setEndereco] = useState(usuario.endereco || '');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [cadastroAluno, setCadastroAluno] = useState<Aluno | null>(null);
  const [mensagemFeedback, setMensagemFeedback] = useState('');
  const [erroFeedback, setErroFeedback] = useState('');

  useEffect(() => {
    carregarDadosPerfil();
  }, [usuario.email, online]);

  async function carregarDadosPerfil() {
    try {
      const emailLimpo = usuario.email.trim().toLowerCase();

      if (online) {
        const perfilNuvem = await buscarPerfilPorEmail(emailLimpo);
        if (perfilNuvem) {
          if (perfilNuvem.cep) setCep(perfilNuvem.cep);
          if (perfilNuvem.endereco) setEndereco(perfilNuvem.endereco);
        }
      }

      if (usuario.tipo === 'aluno') {
        const locais = await listarAlunos();
        let encontrado =
          locais.find((a) => a.email.trim().toLowerCase() === emailLimpo) ||
          null;

        if (online) {
          const nuvem = await buscarDadosAlunoNaNuvem(emailLimpo);
          if (nuvem) {
            encontrado = nuvem;
          }
        }
        setCadastroAluno(encontrado);

        if (encontrado) {
          if (encontrado.cep && !cep) setCep(encontrado.cep);
          if (encontrado.endereco && !endereco)
            setEndereco(encontrado.endereco);
        }
      }
    } catch (e) {}
  }

  async function buscarCepNoPerfil() {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      mostrarErro('Digite um CEP válido com 8 números.');
      return;
    }

    try {
      setBuscandoCep(true);
      setErroFeedback('');
      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      const dados = await resposta.json();

      if (dados.erro) {
        mostrarErro('CEP não encontrado.');
        return;
      }

      setEndereco(
        `${dados.logradouro}, ${dados.bairro} - ${dados.localidade}/${dados.uf}`
      );
    } catch (error) {
      mostrarErro('Não foi possível consultar o CEP.');
    } finally {
      setBuscandoCep(false);
    }
  }

  function mostrarSucesso(msg: string) {
    setErroFeedback('');
    setMensagemFeedback(msg);
    if (Platform.OS !== 'web') {
      Alert.alert('Sucesso', msg);
    }
  }

  function mostrarErro(msg: string) {
    setMensagemFeedback('');
    setErroFeedback(msg);
    if (Platform.OS !== 'web') {
      Alert.alert('Atenção', msg);
    }
  }

  async function salvarNovoNome() {
    if (!nome.trim()) {
      mostrarErro('Digite um nome válido.');
      return;
    }

    setSalvandoNome(true);
    try {
      const novoPerfil: PerfilUsuario = {
        ...usuario,
        nome: nome.trim(),
        cep: cep.trim(),
        endereco: endereco.trim(),
      };

      await salvarPerfilUsuario(novoPerfil);

      // Se for aluno e já estiver vinculado a um professor, atualiza também o cadastro dele
      if (usuario.tipo === 'aluno' && cadastroAluno && cadastroAluno.id) {
        const atualizado: Aluno = {
          ...cadastroAluno,
          nome: nome.trim(),
          cep: cep.trim(),
          endereco: endereco.trim(),
        };
        await atualizarAluno(cadastroAluno.id, atualizado, online);
        setCadastroAluno(atualizado);
      }

      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: nome.trim() });
        } catch (e) {}
      }

      onAtualizarPerfil(novoPerfil);
      mostrarSucesso('Dados do perfil salvos com sucesso!');
    } catch (error) {
      mostrarErro('Não foi possível salvar os dados do perfil.');
    } finally {
      setSalvandoNome(false);
    }
  }

  async function salvarNovaSenha() {
    if (!novaSenha.trim()) {
      mostrarErro('Digite a nova senha.');
      return;
    }
    if (novaSenha.length < 6) {
      mostrarErro('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      mostrarErro('As senhas digitadas não coincidem.');
      return;
    }

    if (!auth.currentUser) {
      mostrarErro('Usuário não autenticado no Firebase.');
      return;
    }

    setSalvandoSenha(true);
    try {
      await updatePassword(auth.currentUser, novaSenha);
      setNovaSenha('');
      setConfirmarSenha('');
      mostrarSucesso('Senha alterada com sucesso!');
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        mostrarErro(
          'Por segurança, saia e entre novamente na conta antes de alterar a senha.'
        );
      } else {
        mostrarErro('Não foi possível alterar a senha.');
      }
    } finally {
      setSalvandoSenha(false);
    }
  }

  async function executarDesvinculoProfessor() {
    setDesvinculando(true);
    try {
      const ok = await desvincularProfessorDoAluno(
        usuario.email,
        online,
        cadastroAluno?.nome || usuario.nome
      );
      if (ok) {
        setCadastroAluno(null);
        mostrarSucesso(
          'Você ficou sem professor vinculado. Agora outro professor já pode te cadastrar!'
        );
      } else {
        mostrarErro('Não foi possível desvincular o professor.');
      }
    } finally {
      setDesvinculando(false);
    }
  }

  function confirmarDesvinculoProfessor() {
    const msg =
      'Deseja realmente trocar de professor? Você ficará sem professor vinculado até que o novo professor cadastre o seu e-mail.';

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        executarDesvinculoProfessor();
      }
      return;
    }

    Alert.alert('Trocar de Professor', msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: executarDesvinculoProfessor,
      },
    ]);
  }

  async function executarExclusaoConta() {
    setExcluindo(true);
    try {
      // Se for aluno, limpa também os vínculos
      if (usuario.tipo === 'aluno') {
        await desvincularProfessorDoAluno(
          usuario.email,
          online,
          cadastroAluno?.nome || usuario.nome
        );
      }

      // Remove o perfil da coleção 'usuarios' no Firestore
      await deletarDoFirestore('usuarios', usuario.email.trim().toLowerCase());

      // Remove a conta do Firebase Authentication
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      onExcluirConta();
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        mostrarErro(
          'Por segurança, faça login novamente antes de excluir sua conta.'
        );
      } else {
        onExcluirConta();
      }
    } finally {
      setExcluindo(false);
    }
  }

  function confirmarExclusaoConta() {
    if (Platform.OS === 'web') {
      const confirmou = window.confirm(
        'Tem certeza que deseja excluir seu perfil permanentemente? Essa ação não pode ser desfeita.'
      );
      if (confirmou) {
        executarExclusaoConta();
      }
      return;
    }

    Alert.alert(
      'Excluir Perfil',
      'Tem certeza que deseja excluir seu perfil permanentemente? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Conta',
          style: 'destructive',
          onPress: executarExclusaoConta,
        },
      ]
    );
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
        <View style={styles.secao}>
          <Text style={styles.nomeTopo}>{usuario.nome}</Text>
          <Text style={styles.emailTopo}>
            {usuario.email} · {usuario.tipo === 'aluno' ? 'Aluno' : 'Professor'}
          </Text>
        </View>

        {mensagemFeedback ? (
          <Text style={styles.textoSucesso}>{mensagemFeedback}</Text>
        ) : null}

        {erroFeedback ? (
          <Text style={styles.textoErro}>{erroFeedback}</Text>
        ) : null}

        {usuario.tipo === 'aluno' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Professor responsável</Text>
            {cadastroAluno ? (
              <>
                <Text style={styles.infoProfessor}>
                  {cadastroAluno.professorNome ||
                    cadastroAluno.professorEmail ||
                    'Professor da Academia'}
                </Text>
                <TouchableOpacity
                  style={styles.botaoOutline}
                  onPress={confirmarDesvinculoProfessor}
                  disabled={desvinculando}
                >
                  {desvinculando ? (
                    <ActivityIndicator color="#222222" />
                  ) : (
                    <Text style={styles.textoOutline}>
                      Trocar de professor (desvincular)
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.semProfessorTexto}>
                Nenhum professor vinculado no momento.
              </Text>
            )}
          </View>
        )}

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Dados pessoais e endereço</Text>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor="#999999"
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>CEP</Text>
          <View style={styles.linhaCep}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="01001000"
              placeholderTextColor="#999999"
              value={cep}
              onChangeText={setCep}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.botaoCep}
              onPress={buscarCepNoPerfil}
              disabled={buscandoCep}
            >
              <Text style={styles.textoBotaoCep}>
                {buscandoCep ? '...' : 'Buscar CEP'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Endereço</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, bairro, cidade/UF"
            placeholderTextColor="#999999"
            value={endereco}
            onChangeText={setEndereco}
          />

          <TouchableOpacity
            style={styles.botaoSalvar}
            onPress={salvarNovoNome}
            disabled={salvandoNome}
          >
            {salvandoNome ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBotaoSalvar}>Salvar dados</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Alterar senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Nova senha (mín. 6 caracteres)"
            placeholderTextColor="#999999"
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar nova senha"
            placeholderTextColor="#999999"
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.botaoOutline}
            onPress={salvarNovaSenha}
            disabled={salvandoSenha}
          >
            {salvandoSenha ? (
              <ActivityIndicator color="#222222" />
            ) : (
              <Text style={styles.textoOutline}>Atualizar senha</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.secao, { borderBottomWidth: 0 }]}>
          <Text style={styles.descricaoPerigo}>
            Atenção: sua conta será excluída permanentemente.
          </Text>
          <TouchableOpacity
            style={styles.botaoExcluirConta}
            onPress={confirmarExclusaoConta}
            disabled={excluindo}
          >
            {excluindo ? (
              <ActivityIndicator color="#C53030" />
            ) : (
              <Text style={styles.textoBotaoExcluir}>Excluir conta</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  secao: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  nomeTopo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  emailTopo: {
    fontSize: 13,
    color: '#666666',
    marginTop: 3,
  },
  textoSucesso: {
    color: '#15803D',
    fontSize: 13,
    marginTop: 12,
  },
  textoErro: {
    color: '#C53030',
    fontSize: 13,
    marginTop: 12,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 10,
  },
  infoProfessor: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 10,
  },
  semProfessorTexto: {
    fontSize: 13,
    color: '#777777',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#444444',
    marginBottom: 4,
  },
  linhaCep: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  botaoCep: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  textoBotaoCep: {
    color: '#222222',
    fontWeight: '500',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    marginBottom: 10,
  },
  botaoSalvar: {
    backgroundColor: '#111111',
    paddingVertical: 11,
    borderRadius: 5,
    alignItems: 'center',
  },
  textoBotaoSalvar: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  botaoOutline: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  textoOutline: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '500',
  },
  descricaoPerigo: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
  },
  botaoExcluirConta: {
    borderWidth: 1,
    borderColor: '#E5A3A3',
    backgroundColor: '#FFF5F5',
    paddingVertical: 11,
    borderRadius: 5,
    alignItems: 'center',
  },
  textoBotaoExcluir: {
    color: '#C53030',
    fontSize: 14,
    fontWeight: '500',
  },
});
