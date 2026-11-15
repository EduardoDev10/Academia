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
import { criarTabela, EXERCICIOS_PREDEFINIDOS } from '../services/database';
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
  const [modalVisivel, setModalVisivel] = useState(false);
  const [listaOpcoesAberta, setListaOpcoesAberta] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
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

  function selecionarPredefinido(item: (typeof EXERCICIOS_PREDEFINIDOS)[0]) {
    setNome(item.nome);
    setGrupoMuscular(item.grupoMuscular);
    setEquipamento(item.equipamento);
    if (!series) {
      setSeries(item.series);
    }
    setListaOpcoesAberta(false);
  }

  async function salvar() {
    if (!nome.trim() || !series.trim()) {
      Alert.alert('Erro', 'Escolha um exercício e informe as séries/repetições.');
      return;
    }

    setLoading(true);
    const grupoDigitado = grupoMuscular.trim() || 'Geral';
    const grupoNormalizado =
      grupoDigitado.toLowerCase() === 'perna' ? 'Pernas' : grupoDigitado;
    const dados = {
      nome: nome.trim(),
      grupoMuscular: grupoNormalizado,
      equipamento: equipamento.trim() || 'Livre',
      series: series.trim(),
    };

    if (editandoId) {
      const ok = await atualizarExercicio(editandoId, dados, online);
      if (ok) {
        fecharModal();
        await carregarExercicios();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar exercício');
      }
    } else {
      const ok = await criarExercicio(dados, online);
      if (ok) {
        fecharModal();
        await carregarExercicios();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar exercício');
      }
    }

    setLoading(false);
  }

  function abrirNovo() {
    limpar();
    setModalVisivel(true);
  }

  function editar(exercicio: Exercicio) {
    setEditandoId(exercicio.id ?? null);
    setNome(exercicio.nome);
    setGrupoMuscular(exercicio.grupoMuscular);
    setEquipamento(exercicio.equipamento);
    setSeries(exercicio.series);
    setListaOpcoesAberta(false);
    setModalVisivel(true);
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
    setListaOpcoesAberta(false);
  }

  function fecharModal() {
    limpar();
    setModalVisivel(false);
  }

  if (loading && exercicios.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  function normalizarGrupo(grupo: string): string {
    const limpo = grupo.trim();
    if (limpo.toLowerCase() === 'perna') return 'Pernas';
    return limpo;
  }

  const categoriasBase = [
    'Todos',
    'Peito',
    'Costas',
    'Pernas',
    'Ombros',
    'Bíceps',
    'Tríceps',
    'Abdômen',
  ];

  const gruposExtras = exercicios
    .map((e) => normalizarGrupo(e.grupoMuscular))
    .filter(
      (g) =>
        g.length > 0 &&
        !categoriasBase.some((base) => base.toLowerCase() === g.toLowerCase())
    );

  const gruposDisponiveis = [
    ...categoriasBase,
    ...Array.from(new Set(gruposExtras)),
  ];

  const exerciciosFiltrados =
    grupoFiltro === 'Todos'
      ? exercicios
      : exercicios.filter(
          (e) =>
            normalizarGrupo(e.grupoMuscular).toLowerCase() ===
            grupoFiltro.trim().toLowerCase()
        );

  return (
    <View style={styles.container}>
      <View style={styles.topoLista}>
        <Text style={styles.contadorTexto}>
          {exerciciosFiltrados.length}{' '}
          {exerciciosFiltrados.length === 1 ? 'exercício' : 'exercícios'}
        </Text>
        <TouchableOpacity style={styles.botaoNovo} onPress={abrirNovo}>
          <Text style={styles.botaoNovoTexto}>+ Novo exercício</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtroContainer}>
        <View style={styles.filtroWrap}>
          {gruposDisponiveis.map((grp) => {
            const ativo = grupoFiltro.toLowerCase() === grp.toLowerCase();
            return (
              <TouchableOpacity
                key={grp}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                onPress={() => setGrupoFiltro(grp)}
              >
                <Text
                  style={[
                    styles.filtroChipTexto,
                    ativo && styles.filtroChipTextoAtivo,
                  ]}
                >
                  {grp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={exerciciosFiltrados}
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
              {item.grupoMuscular} · {item.equipamento} · Séries: {item.series}
            </Text>

            <View style={styles.acoesRow}>
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
            <Text style={styles.vazioTexto}>Nenhum exercício cadastrado.</Text>
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
                {editandoId ? 'Editar exercício' : 'Adicionar exercício'}
              </Text>
              <TouchableOpacity onPress={fecharModal}>
                <Text style={styles.fecharTexto}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Sugestões do catálogo</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setListaOpcoesAberta(!listaOpcoesAberta)}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !nome && { color: '#999999' },
                  ]}
                >
                  {nome || 'Selecionar da lista...'}
                </Text>
                <Ionicons
                  name={listaOpcoesAberta ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#666666"
                />
              </TouchableOpacity>

              {listaOpcoesAberta && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {EXERCICIOS_PREDEFINIDOS.map((item) => {
                    const selecionado = nome === item.nome;
                    return (
                      <TouchableOpacity
                        key={item.nome}
                        style={[
                          styles.dropdownItem,
                          selecionado && styles.dropdownItemAtivo,
                        ]}
                        onPress={() => selecionarPredefinido(item)}
                      >
                        <View>
                          <Text style={styles.dropdownItemTitulo}>
                            {item.nome}
                          </Text>
                          <Text style={styles.dropdownItemSub}>
                            {item.grupoMuscular} · {item.equipamento}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <Text style={styles.label}>Nome do exercício</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Supino Reto"
                placeholderTextColor="#999999"
                value={nome}
                onChangeText={setNome}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Grupo muscular</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Peito"
                    placeholderTextColor="#999999"
                    value={grupoMuscular}
                    onChangeText={setGrupoMuscular}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Séries padrão</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 4x12"
                    placeholderTextColor="#999999"
                    value={series}
                    onChangeText={setSeries}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.botaoSalvar} onPress={salvar}>
                <Text style={styles.textoBotaoSalvar}>
                  {editandoId ? 'Salvar' : 'Adicionar'}
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
  filtroContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filtroWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filtroChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  filtroChipAtivo: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  filtroChipTexto: {
    fontSize: 12,
    color: '#555555',
  },
  filtroChipTextoAtivo: {
    color: '#FFFFFF',
    fontWeight: '500',
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  statusSync: {
    fontSize: 11,
    color: '#888888',
  },
  subInfo: {
    fontSize: 13,
    color: '#555555',
    marginTop: 3,
  },
  acoesRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 8,
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#111111',
  },
  dropdownList: {
    backgroundColor: '#FAFAFA',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    marginBottom: 12,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  dropdownItemAtivo: {
    backgroundColor: '#EFEFEF',
  },
  dropdownItemTitulo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
  },
  dropdownItemSub: {
    fontSize: 12,
    color: '#666666',
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
