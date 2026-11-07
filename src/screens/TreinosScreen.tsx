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
  listarTreinos,
  criarTreino,
  atualizarTreino,
  deletarTreino,
} from '../services/treinoService';
import { Treino } from '../types/Treino';

interface Props {
  online: boolean;
}

export default function TreinosScreen({ online }: Props) {
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [alunoNome, setAlunoNome] = useState('');
  const [exercicioNome, setExercicioNome] = useState('');
  const [diaSemana, setDiaSemana] = useState('');
  const [carga, setCarga] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inicializar();
  }, [online]);

  async function inicializar() {
    try {
      await criarTabela();
      await carregarTreinos();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao inicializar banco');
    } finally {
      setLoading(false);
    }
  }

  async function carregarTreinos() {
    const dados = await listarTreinos();
    setTreinos(dados);
  }

  async function salvar() {
    if (!alunoNome.trim() || !exercicioNome.trim() || !diaSemana.trim() || !carga.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos da ficha de treino.');
      return;
    }

    setLoading(true);
    const dados = {
      alunoNome: alunoNome.trim(),
      exercicioNome: exercicioNome.trim(),
      diaSemana: diaSemana.trim(),
      carga: carga.trim(),
    };

    if (editandoId) {
      const ok = await atualizarTreino(editandoId, dados, online);
      if (ok) {
        limpar();
        await carregarTreinos();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar treino');
      }
    } else {
      const ok = await criarTreino(dados, online);
      if (ok) {
        limpar();
        await carregarTreinos();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar treino');
      }
    }

    setLoading(false);
  }

  function editar(treino: Treino) {
    setEditandoId(treino.id ?? null);
    setAlunoNome(treino.alunoNome);
    setExercicioNome(treino.exercicioNome);
    setDiaSemana(treino.diaSemana);
    setCarga(treino.carga);
  }

  async function executarExclusao(id: number) {
    setLoading(true);
    const ok = await deletarTreino(id, online);
    if (ok) {
      await carregarTreinos();
    } else {
      Alert.alert('Erro', 'Falha ao excluir');
    }
    setLoading(false);
  }

  async function excluir(id: number, descricao: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir treino de ${descricao}?`)) {
        await executarExclusao(id);
      }
      return;
    }

    Alert.alert('Confirmar', `Deseja excluir o treino de ${descricao}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => executarExclusao(id) },
    ]);
  }

  function limpar() {
    setAlunoNome('');
    setExercicioNome('');
    setDiaSemana('');
    setCarga('');
    setEditandoId(null);
  }

  if (loading && treinos.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={treinos}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.titulo}>
              {editandoId ? 'Editar Ficha de Treino' : 'Fichas de Treino'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do aluno"
              placeholderTextColor="#9CA3AF"
              value={alunoNome}
              onChangeText={setAlunoNome}
            />

            <TextInput
              style={styles.input}
              placeholder="Exercício (Ex: Agachamento Livre)"
              placeholderTextColor="#9CA3AF"
              value={exercicioNome}
              onChangeText={setExercicioNome}
            />

            <View style={styles.linha}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Dia / Treino (Ex: Segunda - A)"
                placeholderTextColor="#9CA3AF"
                value={diaSemana}
                onChangeText={setDiaSemana}
              />
              <TextInput
                style={[styles.input, { width: 120 }]}
                placeholder="Carga (30kg)"
                placeholderTextColor="#9CA3AF"
                value={carga}
                onChangeText={setCarga}
              />
            </View>

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
                <Text style={styles.nome}>{item.alunoNome}</Text>
                <Text
                  style={[
                    styles.tagSync,
                    item.sincronizado ? styles.syncOk : styles.syncPendente,
                  ]}
                >
                  {item.sincronizado ? 'Sincronizado' : 'Salvo offline'}
                </Text>
              </View>

              <Text style={styles.info}>Exercício: {item.exercicioNome}</Text>
              <Text style={styles.info}>
                Dia: {item.diaSemana} • Carga: {item.carga}
              </Text>
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
                onPress={() => excluir(item.id!, item.alunoNome)}
              >
                <Text style={styles.textoExcluir}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhuma ficha de treino cadastrada.</Text>
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
