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
  listarExercicios,
  criarExercicio,
  atualizarExercicio,
  deletarExercicio,
} from '../services/exercicioService';
import { Exercicio } from '../types/Exercicio';

interface Props {
  online: boolean;
}

export default function ExerciciosScreen({ online }: Props) {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [nome, setNome] = useState('');
  const [grupoMuscular, setGrupoMuscular] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [series, setSeries] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inicializar();
  }, [online]);

  async function inicializar() {
    try {
      await criarTabela();
      await carregarExercicios();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao inicializar banco');
    } finally {
      setLoading(false);
    }
  }

  async function carregarExercicios() {
    const dados = await listarExercicios();
    setExercicios(dados);
  }

  async function salvar() {
    if (!nome.trim() || !grupoMuscular.trim() || !equipamento.trim() || !series.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos do exercício.');
      return;
    }

    setLoading(true);
    const dados = {
      nome: nome.trim(),
      grupoMuscular: grupoMuscular.trim(),
      equipamento: equipamento.trim(),
      series: series.trim(),
    };

    if (editandoId) {
      const ok = await atualizarExercicio(editandoId, dados, online);
      if (ok) {
        limpar();
        await carregarExercicios();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar exercício');
      }
    } else {
      const ok = await criarExercicio(dados, online);
      if (ok) {
        limpar();
        await carregarExercicios();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar exercício');
      }
    }

    setLoading(false);
  }

  function editar(exercicio: Exercicio) {
    setEditandoId(exercicio.id ?? null);
    setNome(exercicio.nome);
    setGrupoMuscular(exercicio.grupoMuscular);
    setEquipamento(exercicio.equipamento);
    setSeries(exercicio.series);
  }

  async function executarExclusao(id: number) {
    setLoading(true);
    const ok = await deletarExercicio(id, online);
    if (ok) {
      await carregarExercicios();
    } else {
      Alert.alert('Erro', 'Falha ao excluir');
    }
    setLoading(false);
  }

  async function excluir(id: number, nomeExercicio: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir ${nomeExercicio}?`)) {
        await executarExclusao(id);
      }
      return;
    }

    Alert.alert('Confirmar', `Deseja excluir ${nomeExercicio}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => executarExclusao(id) },
    ]);
  }

  function limpar() {
    setNome('');
    setGrupoMuscular('');
    setEquipamento('');
    setSeries('');
    setEditandoId(null);
  }

  if (loading && exercicios.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={exercicios}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.titulo}>
              {editandoId ? 'Editar Exercício' : 'Cadastro de Exercícios'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do exercício (Ex: Supino Reto)"
              placeholderTextColor="#9CA3AF"
              value={nome}
              onChangeText={setNome}
            />

            <View style={styles.linha}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Grupo muscular (Ex: Peito)"
                placeholderTextColor="#9CA3AF"
                value={grupoMuscular}
                onChangeText={setGrupoMuscular}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Séries (Ex: 4x12)"
                placeholderTextColor="#9CA3AF"
                value={series}
                onChangeText={setSeries}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Equipamento (Ex: Barra, Halteres, Polia)"
              placeholderTextColor="#9CA3AF"
              value={equipamento}
              onChangeText={setEquipamento}
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
                Grupo: {item.grupoMuscular} • Séries: {item.series}
              </Text>
              <Text style={styles.info}>Equipamento: {item.equipamento}</Text>
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
          <Text style={styles.vazio}>Nenhum exercício cadastrado.</Text>
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
