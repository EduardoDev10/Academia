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
  listarTreinos,
  criarTreino,
  atualizarTreino,
  deletarTreino,
} from '../services/treinoService';
import { listarAlunos } from '../services/alunoService';
import { listarExercicios } from '../services/exercicioService';
import {
  PerfilUsuario,
  listarTodosTreinosNaNuvem,
} from '../services/firebase';
import { Treino } from '../types/Treino';
import { Aluno } from '../types/Aluno';
import { Exercicio } from '../types/Exercicio';

interface Props {
  online: boolean;
  professorLogado?: PerfilUsuario;
  alunoFiltro?: string;
  onMudarAlunoFiltro?: (nome: string) => void;
}

export default function TreinosScreen({
  online,
  professorLogado,
  alunoFiltro = 'Todos',
  onMudarAlunoFiltro,
}: Props) {
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [alunosCadastrados, setAlunosCadastrados] = useState<Aluno[]>([]);
  const [exerciciosCadastrados, setExerciciosCadastrados] = useState<Exercicio[]>([]);

  const [alunoNome, setAlunoNome] = useState('');
  const [exercicioNome, setExercicioNome] = useState('');
  const [divisao, setDivisao] = useState('Treino A');
  const [divisaoFiltro, setDivisaoFiltro] = useState('Todos');
  const [diaSemana, setDiaSemana] = useState('4x12');
  const [carga, setCarga] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [abrirListaAlunos, setAbrirListaAlunos] = useState(false);
  const [abrirListaExercicios, setAbrirListaExercicios] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inicializar();
  }, [online]);

  async function inicializar() {
    try {
      await criarTabela();
      await carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao inicializar banco');
    } finally {
      setLoading(false);
    }
  }

  async function carregarDados() {
    const [listaT, listaA, listaE] = await Promise.all([
      listarTreinos(professorLogado?.email),
      listarAlunos(professorLogado?.email, online),
      listarExercicios(),
    ]);

    const emailsAtivos = new Set(
      listaA.map((a) => (a.email || '').trim().toLowerCase())
    );
    const nomesAtivos = new Set(
      listaA.map((a) => (a.nome || '').trim().toLowerCase())
    );

    // Exibe apenas treinos dos alunos que continuam vinculados a este professor
    const treinosAtivos = listaT.filter((t) => {
      const emailT = (t.alunoEmail || '').trim().toLowerCase();
      const nomeT = (t.alunoNome || '').trim().toLowerCase();
      return (
        (emailT && emailsAtivos.has(emailT)) ||
        (nomeT && nomesAtivos.has(nomeT))
      );
    });

    setTreinos(treinosAtivos);
    setAlunosCadastrados(listaA);
    setExerciciosCadastrados(listaE);
  }

  // Lista completa com todos os exercícios predefinidos disponíveis
  const opcoesExercicios = [
    ...EXERCICIOS_PREDEFINIDOS,
    ...exerciciosCadastrados.filter(
      (cad) =>
        !EXERCICIOS_PREDEFINIDOS.some(
          (pre) => pre.nome.toLowerCase() === cad.nome.toLowerCase()
        )
    ),
  ];

  async function salvar() {
    if (!alunoNome.trim() || !exercicioNome.trim() || !diaSemana.trim()) {
      Alert.alert('Erro', 'Escolha o aluno, o exercício e informe as repetições.');
      return;
    }

    setLoading(true);
    const alunoObj = alunosCadastrados.find(
      (al) => al.nome.toLowerCase() === alunoNome.trim().toLowerCase()
    );

    const dados = {
      alunoNome: alunoNome.trim(),
      alunoEmail: alunoObj?.email ? alunoObj.email.trim().toLowerCase() : '',
      professorNome: professorLogado?.nome || 'Professor',
      professorEmail: professorLogado?.email || '',
      exercicioNome: exercicioNome.trim(),
      divisao: divisao || 'Treino A',
      diaSemana: diaSemana.trim(), // Armazena as Séries x Repetições (ex: 4x12)
      carga: carga.trim() || 'Livre',
    };

    if (editandoId) {
      const ok = await atualizarTreino(editandoId, dados, online);
      if (ok) {
        fecharModal();
        await carregarDados();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar treino');
      }
    } else {
      const ok = await criarTreino(dados, online);
      if (ok) {
        fecharModal();
        await carregarDados();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar treino');
      }
    }

    setLoading(false);
  }

  function abrirNovo() {
    limpar();
    if (alunoFiltro && alunoFiltro !== 'Todos') {
      setAlunoNome(alunoFiltro);
    } else if (alunosCadastrados.length > 0) {
      setAlunoNome(alunosCadastrados[0].nome);
    }
    setAbrirListaExercicios(true);
    setModalVisivel(true);
  }

  function editar(treino: Treino) {
    setEditandoId(treino.id ?? null);
    setAlunoNome(treino.alunoNome);
    setExercicioNome(treino.exercicioNome);
    setDivisao(treino.divisao || 'Treino A');
    setDiaSemana(treino.diaSemana);
    setCarga(treino.carga);
    setAbrirListaAlunos(false);
    setAbrirListaExercicios(false);
    setModalVisivel(true);
  }

  async function executarExclusao(id: number) {
    setLoading(true);
    const ok = await deletarTreino(id, online, professorLogado?.email);
    if (ok) {
      await carregarDados();
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
    setDivisao('Treino A');
    setDiaSemana('');
    setCarga('');
    setEditandoId(null);
    setAbrirListaAlunos(false);
    setAbrirListaExercicios(false);
  }

  function fecharModal() {
    limpar();
    setModalVisivel(false);
  }

  const treinosFiltrados = treinos.filter((item) => {
    const passaAluno =
      !alunoFiltro ||
      alunoFiltro === 'Todos' ||
      item.alunoNome.toLowerCase() === alunoFiltro.toLowerCase();
    const divItem = item.divisao || 'Treino A';
    const passaDivisao =
      divisaoFiltro === 'Todos' ||
      divItem.toLowerCase() === divisaoFiltro.toLowerCase();
    return passaAluno && passaDivisao;
  });

  if (loading && treinos.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topoLista}>
        <View style={styles.filtroWrap}>
          <TouchableOpacity
            style={[
              styles.filtroChip,
              alunoFiltro === 'Todos' && styles.filtroChipAtivo,
            ]}
            onPress={() => onMudarAlunoFiltro && onMudarAlunoFiltro('Todos')}
          >
            <Text
              style={[
                styles.filtroChipTexto,
                alunoFiltro === 'Todos' && styles.filtroChipTextoAtivo,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          {alunosCadastrados.map((al) => {
            const ativo = alunoFiltro === al.nome;
            return (
              <TouchableOpacity
                key={al.id}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                onPress={() => onMudarAlunoFiltro && onMudarAlunoFiltro(al.nome)}
              >
                <Text
                  style={[
                    styles.filtroChipTexto,
                    ativo && styles.filtroChipTextoAtivo,
                  ]}
                >
                  {al.nome}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.botaoNovo} onPress={abrirNovo}>
          <Text style={styles.botaoNovoTexto}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subFiltroBar}>
        {['Todos', 'Treino A', 'Treino B', 'Treino C'].map((div) => {
          const ativo = divisaoFiltro === div;
          return (
            <TouchableOpacity
              key={div}
              style={[styles.subFiltroBtn, ativo && styles.subFiltroBtnAtivo]}
              onPress={() => setDivisaoFiltro(div)}
            >
              <Text
                style={[
                  styles.subFiltroTexto,
                  ativo && styles.subFiltroTextoAtivo,
                ]}
              >
                {div}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={treinosFiltrados}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemTop}>
              <Text style={styles.nome}>{item.exercicioNome}</Text>
              <Text style={styles.statusSync}>
                {item.sincronizado ? 'Salvo na nuvem' : 'Offline'}
              </Text>
            </View>

            <Text style={styles.subInfo}>
              {item.divisao || 'Treino A'} · Aluno: {item.alunoNome}
              {item.professorNome ? ` · Prof: ${item.professorNome}` : ''}
            </Text>

            <Text style={styles.info}>
              Séries: {item.diaSemana} · Carga: {item.carga}
            </Text>

            <View style={styles.acoesRow}>
              <TouchableOpacity onPress={() => editar(item)}>
                <Text style={styles.linkSecundario}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => excluir(item.id!, item.alunoNome)}
              >
                <Text style={styles.linkExcluir}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vazioBox}>
            <Text style={styles.vazioTexto}>
              {alunoFiltro !== 'Todos'
                ? `Nenhum treino cadastrado para ${alunoFiltro}.`
                : 'Nenhuma ficha cadastrada.'}
            </Text>
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
                {editandoId ? 'Editar item da ficha' : 'Adicionar exercício à ficha'}
              </Text>
              <TouchableOpacity onPress={fecharModal}>
                <Text style={styles.fecharTexto}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Aluno</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  setAbrirListaAlunos(!abrirListaAlunos);
                  setAbrirListaExercicios(false);
                }}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !alunoNome && { color: '#999999' },
                  ]}
                >
                  {alunoNome || 'Selecionar aluno...'}
                </Text>
                <Ionicons
                  name={abrirListaAlunos ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#666666"
                />
              </TouchableOpacity>

              {abrirListaAlunos && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {alunosCadastrados.length === 0 ? (
                    <Text style={styles.avisoSemAluno}>
                      Cadastre um aluno primeiro na aba Alunos.
                    </Text>
                  ) : (
                    alunosCadastrados.map((al) => {
                      const selecionado = alunoNome === al.nome;
                      return (
                        <TouchableOpacity
                          key={al.id}
                          style={[
                            styles.dropdownItem,
                            selecionado && styles.dropdownItemAtivo,
                          ]}
                          onPress={() => {
                            setAlunoNome(al.nome);
                            setAbrirListaAlunos(false);
                          }}
                        >
                          <Text style={styles.dropdownItemTitulo}>
                            {al.nome}
                          </Text>
                          <Text style={styles.dropdownItemSub}>{al.email}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}

              <Text style={styles.label}>Divisão da ficha</Text>
              <View style={styles.divisaoRow}>
                {['Treino A', 'Treino B', 'Treino C'].map((op) => {
                  const ativo = divisao === op;
                  return (
                    <TouchableOpacity
                      key={op}
                      style={[
                        styles.divisaoOpcao,
                        ativo && styles.divisaoOpcaoAtiva,
                      ]}
                      onPress={() => setDivisao(op)}
                    >
                      <Text
                        style={[
                          styles.divisaoOpcaoTexto,
                          ativo && styles.divisaoOpcaoTextoAtivo,
                        ]}
                      >
                        {op}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Exercício</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  setAbrirListaExercicios(!abrirListaExercicios);
                  setAbrirListaAlunos(false);
                }}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !exercicioNome && { color: '#999999' },
                  ]}
                >
                  {exercicioNome || 'Selecionar exercício...'}
                </Text>
                <Ionicons
                  name={abrirListaExercicios ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#666666"
                />
              </TouchableOpacity>

              {abrirListaExercicios && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {opcoesExercicios.map((ex, idx) => {
                    const selecionado = exercicioNome === ex.nome;
                    return (
                      <TouchableOpacity
                        key={`${ex.nome}-${idx}`}
                        style={[
                          styles.dropdownItem,
                          selecionado && styles.dropdownItemAtivo,
                        ]}
                        onPress={() => {
                          setExercicioNome(ex.nome);
                          if (!diaSemana && ex.series) {
                            setDiaSemana(ex.series);
                          }
                          setAbrirListaExercicios(false);
                        }}
                      >
                        <Text style={styles.dropdownItemTitulo}>{ex.nome}</Text>
                        <Text style={styles.dropdownItemSub}>
                          {ex.grupoMuscular} · {ex.series}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Séries e repetições</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 4x12"
                    placeholderTextColor="#999999"
                    value={diaSemana}
                    onChangeText={setDiaSemana}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.label}>Carga</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 30kg"
                    placeholderTextColor="#999999"
                    value={carga}
                    onChangeText={setCarga}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  filtroWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
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
  subFiltroBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  subFiltroBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  subFiltroBtnAtivo: {
    borderColor: '#111111',
    backgroundColor: '#F5F5F5',
  },
  subFiltroTexto: {
    fontSize: 12,
    color: '#666666',
  },
  subFiltroTextoAtivo: {
    color: '#111111',
    fontWeight: '600',
  },
  divisaoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  divisaoOpcao: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FAFAFA',
  },
  divisaoOpcaoAtiva: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  divisaoOpcaoTexto: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  divisaoOpcaoTextoAtivo: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    paddingVertical: 15,
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
    color: '#444444',
    marginTop: 3,
  },
  info: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
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
  avisoSemAluno: {
    padding: 12,
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
  linha: {
    flexDirection: 'row',
    gap: 10,
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
