import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { criarTabela } from '../services/database';
import {
  PerfilUsuario,
  buscarPerfilPorEmail,
  buscarDadosAlunoNaNuvem,
} from '../services/firebase';
import {
  listarAlunos,
  criarAluno,
  atualizarAluno,
  deletarAluno,
} from '../services/alunoService';
import { Aluno } from '../types/Aluno';

interface Props {
  online: boolean;
  professorLogado?: PerfilUsuario;
  onVerTreinoAluno?: (nomeAluno: string) => void;
}

export default function AlunosScreen({
  online,
  professorLogado,
  onVerTreinoAluno,
}: Props) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [plano, setPlano] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoConta, setBuscandoConta] = useState(false);
  const [avisoConta, setAvisoConta] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    inicializar();
  }, [online]);

  async function inicializar() {
    try {
      await criarTabela();
      await carregarAlunos();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao inicializar banco');
    } finally {
      setLoading(false);
    }
  }

  async function carregarAlunos() {
    const dados = await listarAlunos(professorLogado?.email, online);
    setAlunos(dados);
  }

  async function buscarContaAluno() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Atenção', 'Digite o e-mail que o aluno usou para criar a conta.');
      return;
    }

    const emailBusca = email.trim().toLowerCase();

    // Verifica se este mesmo professor já cadastrou o aluno
    const jaNaMinhaLista = alunos.find(
      (a) => a.email.trim().toLowerCase() === emailBusca && a.id !== editandoId
    );
    if (jaNaMinhaLista) {
      setAvisoConta('Este aluno já está cadastrado na sua lista!');
      return;
    }

    setBuscandoConta(true);
    setAvisoConta('');
    try {
      const todosLocais = await listarAlunos();
      const cadastroExistente =
        (online ? await buscarDadosAlunoNaNuvem(emailBusca) : null) ||
        todosLocais.find((a) => a.email.trim().toLowerCase() === emailBusca) ||
        null;

      const meuEmailProf = (professorLogado?.email || '').trim().toLowerCase();

      // Se o aluno já estiver vinculado a outro professor, bloqueia!
      if (
        cadastroExistente &&
        cadastroExistente.professorEmail &&
        cadastroExistente.professorEmail.trim().toLowerCase() !== meuEmailProf
      ) {
        const nomeProfAtual =
          cadastroExistente.professorNome || cadastroExistente.professorEmail;
        setAvisoConta(
          `Bloqueado: Este aluno já está vinculado ao Prof(a). ${nomeProfAtual}. Para trocar, o aluno deve se desvincular na aba Perfil dele.`
        );
        return;
      }

      const perfil = await buscarPerfilPorEmail(emailBusca);

      if (perfil) {
        setNome(perfil.nome);
        if (perfil.cep) {
          setCep(perfil.cep);
        }
        if (perfil.endereco) {
          setEndereco(perfil.endereco);
        }
        if (!matricula.trim()) {
          setMatricula(String(todosLocais.length + 1).padStart(3, '0'));
        }
        if (!plano.trim()) {
          setPlano('Mensal');
        }
        setAvisoConta(
          `Conta encontrada: dados de ${perfil.nome} preenchidos automaticamente!`
        );
      } else {
        if (!matricula.trim()) {
          setMatricula(String(todosLocais.length + 1).padStart(3, '0'));
        }
        setAvisoConta(
          'Conta ainda não encontrada com este e-mail. Você pode preencher o nome manualmente.'
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar a conta.');
    } finally {
      setBuscandoConta(false);
    }
  }

  async function buscarCepApi() {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      Alert.alert('Atenção', 'Digite um CEP válido com 8 números.');
      return;
    }

    try {
      setBuscandoCep(true);
      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const dados = await resposta.json();

      if (dados.erro) {
        Alert.alert('Erro', 'CEP não encontrado.');
        return;
      }

      setEndereco(
        `${dados.logradouro}, ${dados.bairro} - ${dados.localidade}/${dados.uf}`
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar o CEP.');
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvar() {
    if (!matricula.trim() || !nome.trim() || !email.trim()) {
      Alert.alert('Erro', 'Preencha matrícula, nome e e-mail.');
      return;
    }

    const emailLimpo = email.trim().toLowerCase();
    const meuEmailProf = (professorLogado?.email || '').trim().toLowerCase();

    if (!editandoId) {
      const duplicado = alunos.find(
        (a) => a.email.trim().toLowerCase() === emailLimpo
      );
      if (duplicado) {
        Alert.alert('Atenção', 'Este aluno já está cadastrado na sua lista.');
        return;
      }

      // Verifica se o aluno já possui outro professor vinculado
      const todosLocais = await listarAlunos();
      const cadastroExistente =
        (online ? await buscarDadosAlunoNaNuvem(emailLimpo) : null) ||
        todosLocais.find((a) => a.email.trim().toLowerCase() === emailLimpo) ||
        null;

      if (
        cadastroExistente &&
        cadastroExistente.professorEmail &&
        cadastroExistente.professorEmail.trim().toLowerCase() !== meuEmailProf
      ) {
        const nomeProfAtual =
          cadastroExistente.professorNome || cadastroExistente.professorEmail;
        const msg = `Este aluno já possui professor (${nomeProfAtual}). O aluno precisa se desvincular no Perfil dele antes de trocar de professor.`;
        setAvisoConta(`Bloqueado: ${msg}`);
        Alert.alert('Aluno já possui professor', msg);
        return;
      }
    }

    setLoading(true);
    const dadosAluno = {
      matricula: matricula.trim(),
      nome: nome.trim(),
      email: emailLimpo,
      cep: cep.trim(),
      endereco: endereco.trim(),
      plano: plano.trim() || 'Mensal',
      professorNome: professorLogado?.nome || 'Professor',
      professorEmail: professorLogado?.email || '',
    };

    if (editandoId) {
      const ok = await atualizarAluno(editandoId, dadosAluno, online);
      if (ok) {
        fecharModal();
        await carregarAlunos();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar aluno');
      }
    } else {
      const ok = await criarAluno(dadosAluno, online);
      if (ok) {
        fecharModal();
        await carregarAlunos();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar aluno');
      }
    }

    setLoading(false);
  }

  function abrirNovo() {
    limpar();
    setModalVisivel(true);
  }

  function editar(aluno: Aluno) {
    setEditandoId(aluno.id ?? null);
    setMatricula(aluno.matricula);
    setNome(aluno.nome);
    setEmail(aluno.email);
    setPlano(aluno.plano || '');
    setCep(aluno.cep || '');
    setEndereco(aluno.endereco || '');
    setModalVisivel(true);
  }

  async function executarExclusao(id: number) {
    setLoading(true);
    const ok = await deletarAluno(id, online, professorLogado?.email);
    if (ok) {
      await carregarAlunos();
    } else {
      Alert.alert('Erro', 'Falha ao excluir');
    }
    setLoading(false);
  }

  async function excluir(id: number, nomeAluno: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir ${nomeAluno}?`)) {
        await executarExclusao(id);
      }
      return;
    }

    Alert.alert('Confirmar', `Deseja excluir ${nomeAluno}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => executarExclusao(id) },
    ]);
  }

  function limpar() {
    setMatricula('');
    setNome('');
    setEmail('');
    setPlano('');
    setCep('');
    setEndereco('');
    setAvisoConta('');
    setEditandoId(null);
  }

  function fecharModal() {
    limpar();
    setModalVisivel(false);
  }

  if (loading && alunos.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  const termoBusca = busca.trim().toLowerCase();
  const alunosFiltrados = !termoBusca
    ? alunos
    : alunos.filter(
        (a) =>
          a.nome.toLowerCase().includes(termoBusca) ||
          a.matricula.toLowerCase().includes(termoBusca) ||
          a.email.toLowerCase().includes(termoBusca)
      );

  return (
    <View style={styles.container}>
      <View style={styles.topoLista}>
        <Text style={styles.contadorTexto}>
          {alunosFiltrados.length}{' '}
          {alunosFiltrados.length === 1 ? 'aluno' : 'alunos'}
        </Text>
        <TouchableOpacity style={styles.botaoNovo} onPress={abrirNovo}>
          <Text style={styles.botaoNovoTexto}>+ Cadastrar aluno</Text>
        </TouchableOpacity>
      </View>

      {alunos.length > 0 && (
        <View style={styles.buscaContainer}>
          <View style={styles.buscaBox}>
            <Ionicons name="search-outline" size={16} color="#888888" />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar aluno por nome, matrícula ou e-mail..."
              placeholderTextColor="#999999"
              value={busca}
              onChangeText={setBusca}
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => setBusca('')}>
                <Text style={styles.limparBusca}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={alunosFiltrados}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemTop}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.statusSync}>
                {item.sincronizado ? 'Salvo na nuvem' : 'Offline'}
              </Text>
            </View>

            <Text style={styles.subInfo}>
              Matrícula {item.matricula} · Plano {item.plano || 'Mensal'}
            </Text>
            <Text style={styles.info}>{item.email}</Text>
            {item.endereco ? (
              <Text style={styles.info} numberOfLines={1}>
                {item.endereco}
              </Text>
            ) : null}

            <View style={styles.acoesRow}>
              {onVerTreinoAluno && (
                <TouchableOpacity
                  onPress={() => onVerTreinoAluno(item.nome)}
                >
                  <Text style={styles.linkPrincipal}>Ver ficha</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => editar(item)}>
                <Text style={styles.linkSecundario}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => excluir(item.id!, item.nome)}>
                <Text style={styles.linkExcluir}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vazioBox}>
            <Text style={styles.vazioTexto}>Nenhum aluno cadastrado.</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisivel}
        animationType="fade"
        transparent
        onRequestClose={fecharModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {editandoId ? 'Editar aluno' : 'Cadastrar aluno'}
              </Text>
              <TouchableOpacity onPress={fecharModal}>
                <Text style={styles.fecharTexto}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>E-mail do aluno</Text>
              <View style={styles.linha}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="aluno@email.com"
                  placeholderTextColor="#999999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={buscarContaAluno}
                  disabled={buscandoConta}
                >
                  <Text style={styles.textoBotaoSecundario}>
                    {buscandoConta ? '...' : 'Verificar'}
                  </Text>
                </TouchableOpacity>
              </View>

              {avisoConta ? (
                <Text
                  style={[
                    styles.avisoContaTexto,
                    avisoConta.startsWith('Conta encontrada')
                      ? { color: '#15803D' }
                      : avisoConta.startsWith('Bloqueado')
                      ? { color: '#C53030' }
                      : { color: '#B45309' },
                  ]}
                >
                  {avisoConta}
                </Text>
              ) : null}

              <Text style={[styles.label, { marginTop: 12 }]}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do aluno"
                placeholderTextColor="#999999"
                value={nome}
                onChangeText={setNome}
              />

              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Matrícula</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="001"
                    placeholderTextColor="#999999"
                    value={matricula}
                    onChangeText={setMatricula}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Plano</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mensal"
                    placeholderTextColor="#999999"
                    value={plano}
                    onChangeText={setPlano}
                  />
                </View>
              </View>

              <Text style={styles.label}>CEP</Text>
              <View style={styles.linha}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="01001000"
                  placeholderTextColor="#999999"
                  value={cep}
                  onChangeText={setCep}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={buscarCepApi}
                  disabled={buscandoCep}
                >
                  <Text style={styles.textoBotaoSecundario}>
                    {buscandoCep ? '...' : 'Buscar CEP'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Endereço</Text>
              <TextInput
                style={styles.input}
                placeholder="Rua, bairro, cidade"
                placeholderTextColor="#999999"
                value={endereco}
                onChangeText={setEndereco}
              />

              <TouchableOpacity style={styles.botaoSalvar} onPress={salvar}>
                <Text style={styles.textoBotaoSalvar}>
                  {editandoId ? 'Salvar' : 'Cadastrar'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topoLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  contadorTexto: {
    fontSize: 13,
    color: '#666666',
  },
  botaoNovo: {
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
  },
  botaoNovoTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  buscaContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  buscaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 5,
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  buscaInput: {
    flex: 1,
    fontSize: 13,
    color: '#111111',
    paddingVertical: 2,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  limparBusca: {
    fontSize: 12,
    color: '#666666',
  },
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  statusSync: {
    fontSize: 11,
    color: '#888888',
  },
  subInfo: {
    fontSize: 13,
    color: '#444444',
    marginTop: 3,
  },
  info: {
    fontSize: 13,
    color: '#777777',
    marginTop: 2,
  },
  acoesRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
  },
  linkPrincipal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    textDecorationLine: 'underline',
  },
  linkSecundario: {
    fontSize: 13,
    color: '#555555',
  },
  linkExcluir: {
    fontSize: 13,
    color: '#C53030',
  },
  vazioBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  vazioTexto: {
    fontSize: 14,
    color: '#777777',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  fecharTexto: {
    fontSize: 13,
    color: '#666666',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 5,
  },
  linha: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  botaoSecundario: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  textoBotaoSecundario: {
    color: '#222222',
    fontWeight: '500',
    fontSize: 13,
  },
  avisoContaTexto: {
    fontSize: 12,
    marginTop: 5,
  },
  botaoSalvar: {
    backgroundColor: '#111111',
    paddingVertical: 13,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 6,
  },
  textoBotaoSalvar: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
