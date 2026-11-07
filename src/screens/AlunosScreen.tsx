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
} from 'react-native';
import { criarTabela } from '../services/database';
import {
  listarAlunos,
  criarAluno,
  atualizarAluno,
  deletarAluno,
} from '../services/alunoService';
import { Aluno } from '../types/Aluno';

interface Props {
  online: boolean;
}

export default function AlunosScreen({ online }: Props) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [plano, setPlano] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);

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
    const dados = await listarAlunos();
    setAlunos(dados);
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

    setLoading(true);
    const dadosAluno = {
      matricula: matricula.trim(),
      nome: nome.trim(),
      email: email.trim(),
      cep: cep.trim(),
      endereco: endereco.trim(),
      plano: plano.trim() || 'Mensal',
    };

    if (editandoId) {
      const ok = await atualizarAluno(editandoId, dadosAluno, online);
      if (ok) {
        limpar();
        await carregarAlunos();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar aluno');
      }
    } else {
      const ok = await criarAluno(dadosAluno, online);
      if (ok) {
        limpar();
        await carregarAlunos();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar aluno');
      }
    }

    setLoading(false);
  }

  function editar(aluno: Aluno) {
    setEditandoId(aluno.id ?? null);
    setMatricula(aluno.matricula);
    setNome(aluno.nome);
    setEmail(aluno.email);
    setPlano(aluno.plano || '');
    setCep(aluno.cep || '');
    setEndereco(aluno.endereco || '');
  }

  async function executarExclusao(id: number) {
    setLoading(true);
    const ok = await deletarAluno(id, online);
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
    setEditandoId(null);
  }

  if (loading && alunos.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.titulo}>
              {editandoId ? 'Editar Aluno' : 'Cadastro de Alunos'}
            </Text>

            <View style={styles.linha}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Matrícula"
                placeholderTextColor="#9CA3AF"
                value={matricula}
                onChangeText={setMatricula}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Plano (Ex: Mensal, Anual)"
                placeholderTextColor="#9CA3AF"
                value={plano}
                onChangeText={setPlano}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#9CA3AF"
              value={nome}
              onChangeText={setNome}
            />

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.linha}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="CEP (somente números)"
                placeholderTextColor="#9CA3AF"
                value={cep}
                onChangeText={setCep}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.botaoCep}
                onPress={buscarCepApi}
                disabled={buscandoCep}
              >
                <Text style={styles.textoBotaoCep}>
                  {buscandoCep ? 'Buscando...' : 'Buscar CEP'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Endereço (preenchido pelo CEP)"
              placeholderTextColor="#9CA3AF"
              value={endereco}
              onChangeText={setEndereco}
            />

            <View style={styles.botoesForm}>
              <TouchableOpacity style={styles.botaoSalvar} onPress={salvar}>
                <Text style={styles.textoBotao}>
                  {editandoId ? 'Atualizar' : 'Cadastrar'}
                </Text>
              </TouchableOpacity>

              {editandoId && (
                <TouchableOpacity style={styles.botaoCancelar} onPress={limpar}>
                  <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <View style={styles.topoCard}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text
                  style={[
                    styles.tagSync,
                    item.sincronizado ? styles.syncOk : styles.syncPendente,
                  ]}
                >
                  {item.sincronizado ? 'Sincronizado' : 'Salvo offline'}
                </Text>
              </View>

              <Text style={styles.info}>
                Matrícula: {item.matricula} • Plano: {item.plano || 'Mensal'}
              </Text>
              <Text style={styles.info}>{item.email}</Text>
              {item.endereco ? (
                <Text style={styles.info}>{item.endereco}</Text>
              ) : null}
            </View>

            <View style={styles.acoes}>
              <TouchableOpacity
                style={styles.btnEditar}
                onPress={() => editar(item)}
              >
                <Text style={styles.textoEditar}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnExcluir}
                onPress={() => excluir(item.id!, item.nome)}
              >
                <Text style={styles.textoExcluir}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum aluno cadastrado.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  lista: {
    padding: 16,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  linha: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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
    marginBottom: 10,
  },
  botaoCep: {
    backgroundColor: '#374151',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  textoBotaoCep: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  botoesForm: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  botaoSalvar: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoCancelar: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  textoBotaoCancelar: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  topoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nome: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  tagSync: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncOk: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  syncPendente: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  info: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  acoes: {
    flexDirection: 'row',
    gap: 8,
  },
  btnEditar: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  textoEditar: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  btnExcluir: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  textoExcluir: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  vazio: {
    textAlign: 'center',
    marginTop: 30,
    color: '#6B7280',
    fontSize: 14,
  },
});
