# Sistema de Academia — React Native (Expo + SQLite + Firebase)

Aplicativo mobile e web desenvolvido em **React Native (Expo + TypeScript)** com:
- **3 CRUDs completos**: Alunos, Exercícios e Fichas de Treino
- **Firebase Authentication**: Login e cadastro de usuários
- **Cloud Firestore + SQLite (`expo-sqlite`)**: Armazenamento local e sincronização automática com a nuvem
- **Consumo de API Externa**: Integração com a API **ViaCEP** no cadastro de alunos

---

## 💻 Como clonar e rodar em outra máquina

### 1. Pré-requisitos na máquina
Certifique-se de ter instalados:
- **Node.js** (versão LTS recomendada — baixe em [nodejs.org](https://nodejs.org/))
- **Git** (baixe em [git-scm.com](https://git-scm.com/))

> **Dica para Windows (PowerShell):** Caso o PowerShell bloqueie o comando `npm`, abra o PowerShell e rode uma única vez:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
> ```

### 2. Clonar o repositório
Abra o terminal (CMD, PowerShell ou Terminal do VS Code) e execute:

```bash
git clone https://github.com/EduardoDev10/Academia.git
cd Academia
```

### 3. Instalar as dependências (`node_modules`) e configurar o `.env`
Como a pasta `node_modules` e o arquivo `.env` não sobem para o GitHub, instale todos os pacotes com:

```bash
npm install
```

Em seguida, crie um arquivo chamado **`.env`** na raiz do projeto (copiando a base do `.env.example`) e preencha com as chaves do seu Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=SUA_API_KEY_AQUI
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:000000000000
```

### 4. Executar o projeto

- **Para abrir direto no Navegador Web (`http://localhost:8081`):**
  ```bash
  npm run web
  ```
  *(ou rode `npm start` e aperte a tecla **`w`** no terminal).*

- **Para abrir no Celular (Expo Go na mesma rede Wi-Fi):**
  ```bash
  npm start
  ```

- **Para abrir no Celular via Túnel (caso o Wi-Fi bloqueie a conexão local):**
  ```bash
  npm run tunnel
  ```
  *(Observação: se estiver usando o Expo Go no iPhone/Android sem estar logado no terminal, deslogue da conta dentro do app Expo Go do celular para ele abrir sem pedir login).*
