# 🏋️‍♂️ Projeto 2 — Sistema de Academia (Baseado no Modelo do Professor)

Estrutura do projeto convertida exatamente para o padrão TypeScript + SQLite Web/Mobile ensinado pelo professor em aula:

```text
academia-fitsync/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx        # Tela de Autenticação (Firebase Authentication)
│   │   ├── AlunosScreen.tsx       # CRUD 1: Alunos + Consumo da API ViaCEP
│   │   ├── ExerciciosScreen.tsx   # CRUD 2: Exercícios da Academia
│   │   └── TreinosScreen.tsx      # CRUD 3: Fichas de Treino
│   ├── services/
│   │   ├── database.ts            # getDatabase() e criarTabela() no SQLite (academia.db)
│   │   ├── firebase.ts            # Configuração do Firebase Auth + Firestore
│   │   ├── alunoService.ts        # listarAlunos, criarAluno, atualizarAluno, deletarAluno, sincronizarAlunos
│   │   ├── exercicioService.ts    # listarExercicios, criarExercicio, atualizarExercicio, deletarExercicio, sincronizarExercicios
│   │   └── treinoService.ts       # listarTreinos, criarTreino, atualizarTreino, deletarTreino, sincronizarTreinos
│   └── types/
│       ├── Aluno.ts               # Interface Aluno
│       ├── Exercicio.ts           # Interface Exercicio
│       └── Treino.ts              # Interface Treino
├── App.tsx                        # App principal com abas dos 3 CRUDs e botão Online/Offline
├── metro.config.js                # Configuração .wasm e SharedArrayBuffer para o SQLite funcionar na Web
├── package.json
└── tsconfig.json
```

---

## 🚀 Como Executar o Projeto (No Navegador ou Celular)

No terminal, acesse a pasta do projeto e inicie com `-c` (para limpar o cache do Metro):

```powershell
cd "d:\Desenvolvimento\Desenvolvimento Mobile\academia-fitsync"
npx.cmd expo start -c
```

- Para abrir no **navegador Web** (`http://localhost:8081`), pressione a tecla **`w`** no terminal.
- Para abrir no **celular** via Expo Go, escaneie o QR Code (ou use `npx.cmd expo start --tunnel`).

---

## 🔥 Onde Colar as Chaves do Firebase

Abra o arquivo [`src/services/firebase.ts`](file:///d:/Desenvolvimento/Desenvolvimento%20Mobile/academia-fitsync/src/services/firebase.ts) e substitua o objeto `firebaseConfig` pelas chaves do seu projeto criado no [Firebase Console](https://console.firebase.google.com/):
1. Ative **Authentication** -> **E-mail/senha**.
2. Ative **Firestore Database** -> **Iniciar no modo de teste**.

*(Nota: Mesmo antes de colar as chaves do Firebase, você já pode testar o login e todos os 3 CRUDs no navegador ou celular!)*

---

## 👨‍🎓 Respostas Rápidas para as 2 Perguntas Individuais do Professor (2,0 Pontos)

1. **Para que serve o `metro.config.js` neste projeto?**
   - Ele adiciona a extensão `'wasm'` (`config.resolver.assetExts.push('wasm')`) e configura os cabeçalhos COOP/COEP (`SharedArrayBuffer`) para que o `expo-sqlite` consiga rodar WebAssembly no navegador Web.

2. **Como funciona o arquivo `src/services/database.ts`?**
   - A função `getDatabase()` abre o banco local `SQLite.openDatabaseAsync('academia.db')` e a função `criarTabela()` executa `CREATE TABLE IF NOT EXISTS` para criar as 3 tabelas (`alunos`, `exercicios` e `treinos`) com `id INTEGER PRIMARY KEY AUTOINCREMENT` e a coluna `sincronizado INTEGER DEFAULT 0`.

3. **Como funcionam as 4 operações do CRUD nos arquivos `*Service.ts`?**
   - **Listar (Read)**: `db.getAllAsync('SELECT * FROM ... ORDER BY id DESC')`
   - **Criar (Create)**: `db.runAsync('INSERT INTO ... VALUES (?, ?, ...)', [...])`
   - **Atualizar (Update)**: `db.runAsync('UPDATE ... SET ... WHERE id = ?', [...])`
   - **Deletar (Delete)**: `db.runAsync('DELETE FROM ... WHERE id = ?', [id])`
   - Os pontos de interrogação `?` são *placeholders* que protegem o banco contra ataques de **SQL Injection**.

4. **Como funciona a sincronização entre SQLite e Firestore quando fica sem internet?**
   - Quando o app está **Online**, ao cadastrar/atualizar no SQLite ele grava `sincronizado = 1` e envia imediatamente para o Firestore (`salvarNoFirestore`).
   - Quando está **Sem Internet (Offline)**, o app salva no SQLite com `sincronizado = 0`.
   - Quando a internet volta, as funções `sincronizarAlunos()`, `sincronizarExercicios()` e `sincronizarTreinos()` buscam todos os registros `WHERE sincronizado = 0`, enviam para o Firestore e atualizam `UPDATE ... SET sincronizado = 1 WHERE id = ?`.

5. **Qual API externa foi consumida e onde ela está no código?**
   - Consumimos a **API ViaCEP** (`https://viacep.com.br/ws/${cepLimpo}/json/`) na função `buscarCepApi` dentro de `src/screens/AlunosScreen.tsx`. Ao informar o CEP do aluno e clicar em **"Buscar CEP (API)"**, o app faz um `fetch` e preenche automaticamente o campo de endereço do aluno.
