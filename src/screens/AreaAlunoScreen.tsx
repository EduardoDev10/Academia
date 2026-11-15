import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PerfilUsuario,
  buscarTreinosDoAlunoNaNuvem,
  buscarDadosAlunoNaNuvem,
} from '../services/firebase';
import {
  criarTabela,
  EXERCICIOS_PREDEFINIDOS,
  buscarProgressoDoDia,
  salvarProgressoDoDia,
} from '../services/database';
import { listarTreinos } from '../services/treinoService';
import { listarAlunos } from '../services/alunoService';
import { Treino } from '../types/Treino';
import { Aluno } from '../types/Aluno';

interface Props {
  usuario: PerfilUsuario;
  online: boolean;
}

export default function AreaAlunoScreen({ usuario, online }: Props) {
  const [meusTreinos, setMeusTreinos] = useState<Treino[]>([]);
  const [dadosMatricula, setDadosMatricula] = useState<Aluno | null>(null);
  const [concluidos, setConcluidos] = useState<Record<string, boolean>>({});
  const [divisaoAtiva, setDivisaoAtiva] = useState('Todos');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarFichaDoAluno();
  }, [online, usuario.email]);

  function obterDataHoje(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function gerarChaveExercicio(t: Treino): string {
    const div = (t.divisao || 'Treino A').trim().toLowerCase();
    return `${div}-${t.exercicioNome.trim().toLowerCase()}-${t.diaSemana.trim().toLowerCase()}`;
  }

  async function carregarFichaDoAluno() {
    setCarregando(true);
    try {
      await criarTabela();
      const emailLimpo = usuario.email.trim().toLowerCase();
      const dataHoje = obterDataHoje();

      // 1. Busca dados locais e progresso salvo do dia
      const [alunosLocais, treinosLocais, progressoSalvo] = await Promise.all([
        listarAlunos(),
        listarTreinos(),
        buscarProgressoDoDia(emailLimpo, dataHoje),
      ]);

      setConcluidos(progressoSalvo);

      let cadastroAluno =
        alunosLocais.find(
          (a) => a.email && a.email.trim().toLowerCase() === emailLimpo
        ) || null;

      // 2. Se estiver online, busca no Cloud Firestore (permite ver o treino feito em outro celular)
      let treinosNuvem: Treino[] = [];
      if (online) {
        const [alunoNuvem, listaNuvem] = await Promise.all([
          buscarDadosAlunoNaNuvem(emailLimpo),
          buscarTreinosDoAlunoNaNuvem(emailLimpo),
        ]);
        if (alunoNuvem) {
          cadastroAluno = alunoNuvem;
        }
        treinosNuvem = listaNuvem;
      }

      setDadosMatricula(cadastroAluno);

      // Se o professor ainda não cadastrou/vinculou o e-mail deste aluno, não exibe nenhum treino antigo
      if (!cadastroAluno) {
        setMeusTreinos([]);
        return;
      }

      const filtradosLocais = treinosLocais.filter(
        (t) =>
          Boolean(t.alunoEmail) &&
          t.alunoEmail!.trim().toLowerCase() === emailLimpo
      );

      // Mescla treinos da nuvem com os locais sem duplicar o mesmo exercício do mesmo professor
      const mapaUnico = new Map<string, Treino>();
      [...treinosNuvem, ...filtradosLocais].forEach((item) => {
        const profChave = (item.professorEmail || item.professorNome || '').toLowerCase();
        const divChave = (item.divisao || 'Treino A').toLowerCase();
        const chave = `${divChave}-${item.exercicioNome.toLowerCase()}-${item.diaSemana.toLowerCase()}-${profChave}`;
        if (!mapaUnico.has(chave)) {
          mapaUnico.set(chave, item);
        }
      });

      setMeusTreinos(Array.from(mapaUnico.values()));
    } catch (error) {
      console.error('Erro ao carregar ficha do aluno:', error);
    } finally {
      setCarregando(false);
    }
  }

  async function alternarConcluido(chave: string) {
    const novoValor = !concluidos[chave];
    setConcluidos((atual) => ({
      ...atual,
      [chave]: novoValor,
    }));
    await salvarProgressoDoDia(
      usuario.email,
      obterDataHoje(),
      chave,
      novoValor
    );
  }

  const treinosExibidos =
    divisaoAtiva === 'Todos'
      ? meusTreinos
      : meusTreinos.filter(
          (t) =>
            (t.divisao || 'Treino A').toLowerCase() ===
            divisaoAtiva.toLowerCase()
        );

  const totalExercicios = treinosExibidos.length;
  const totalFeitos = treinosExibidos.filter((t) => {
    const chave = gerarChaveExercicio(t);
    return Boolean(concluidos[chave]);
  }).length;

  return (
    <View style={styles.container}>
      <View style={styles.topoAluno}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planoTexto}>
            {dadosMatricula
              ? `Matrícula ${dadosMatricula.matricula} · Plano ${
                  dadosMatricula.plano || 'Mensal'
                }`
              : 'E-mail ainda não vinculado a um professor'}
          </Text>
          {totalExercicios > 0 && (
            <Text style={styles.progressoTexto}>
              {totalFeitos} de {totalExercicios} concluídos hoje
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.botaoAtualizar}
          onPress={carregarFichaDoAluno}
          disabled={carregando}
        >
          <Text style={styles.textoAtualizar}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      {meusTreinos.length > 0 && (
        <View style={styles.divisaoBar}>
          {['Todos', 'Treino A', 'Treino B', 'Treino C'].map((div) => {
            const ativo = divisaoAtiva === div;
            return (
              <TouchableOpacity
                key={div}
                style={[styles.divisaoTab, ativo && styles.divisaoTabAtiva]}
                onPress={() => setDivisaoAtiva(div)}
              >
                <Text
                  style={[
                    styles.divisaoTabTexto,
                    ativo && styles.divisaoTabTextoAtivo,
                  ]}
                >
                  {div}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#111111" />
        </View>
      ) : (
        <FlatList
          data={treinosExibidos}
          keyExtractor={(item, index) => `${item.exercicioNome}-${index}`}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const chave = gerarChaveExercicio(item);
            const feito = Boolean(concluidos[chave]);
            const infoPredefinida = EXERCICIOS_PREDEFINIDOS.find(
              (ex) =>
                ex.nome.toLowerCase() === item.exercicioNome.toLowerCase()
            );

            return (
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => alternarConcluido(chave)}
                activeOpacity={0.7}
              >
                <View style={styles.itemEsquerda}>
                  <Text
                    style={[
                      styles.exercicioTitulo,
                      feito && styles.exercicioTituloFeito,
                    ]}
                  >
                    {item.exercicioNome}
                  </Text>

                  <Text style={styles.detalheTexto}>
                    {item.divisao || 'Treino A'} · Séries: {item.diaSemana} ·
                    Carga: {item.carga}
                    {infoPredefinida
                      ? ` · ${infoPredefinida.grupoMuscular}`
                      : ''}
                  </Text>

                  <Text style={styles.professorTexto}>
                    Professor: {item.professorNome || 'Academia'}
                  </Text>
                </View>

                <Ionicons
                  name={feito ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={feito ? '#111111' : '#999999'}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.vazioBox}>
              <Text style={styles.vazioTitulo}>Nenhum treino disponível.</Text>
              <Text style={styles.vazioSub}>
                Informe seu e-mail ({usuario.email}) ao professor para ele
                montar sua ficha.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topoAluno: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  planoTexto: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  progressoTexto: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  botaoAtualizar: {
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
  },
  textoAtualizar: {
    fontSize: 12,
    color: '#222222',
    fontWeight: '500',
  },
  divisaoBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  divisaoTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  divisaoTabAtiva: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  divisaoTabTexto: {
    fontSize: 12,
    color: '#555555',
  },
  divisaoTabTextoAtivo: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  itemEsquerda: {
    flex: 1,
    paddingRight: 12,
  },
  exercicioTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  exercicioTituloFeito: {
    textDecorationLine: 'line-through',
    color: '#888888',
  },
  detalheTexto: {
    fontSize: 13,
    color: '#444444',
    marginTop: 3,
  },
  professorTexto: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  vazioBox: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  vazioTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  vazioSub: {
    fontSize: 13,
    color: '#777777',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});
