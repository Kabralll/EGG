# EGG — Plataforma de Estudos Gamificada

O EGG é uma aplicação web completa de estudos para estudantes do 6º ao 9º ano e do 1º ao 3º do EM. A plataforma combina educação com gamificação: pratica questões reais com comentários, ganha XP e sobe de nível, completa trilhas de estudos, desbloqueia conquistas, mantém a sequência (streak) diária, enfrenta o desafio diário e compete no ranking — tudo com dados reais persistidos no banco.

## Funcionalidades

- **Cadastro e autenticação** — cadastro, login, recuperação de senha via e-mail (JWT).
- **Prática de questões** — filtro por disciplina/assunto/dificuldade/ano, correção no servidor, explicação comentada após responder. A resposta certa nunca trafega antes do envio.
- **XP e níveis** — 10/20/30 XP por acerto (fácil/médio/difícil), 2 XP por erro, XP apenas na primeira tentativa (anti-farm). Nível derivado do XP com curva progressiva.
- **Sequência diária (streak)** — dias consecutivos de atividade.
- **Trilhas de estudos** — etapas com questões liberadas progressivamente, +100 XP ao concluir cada trilha.
- **Conquistas** — desbloqueio real baseado em estatísticas.
- **Desafio diário** — desafios rotativos por dia (acertos, XP, precisão, por disciplina), +50 XP.
- **Ranking** — geral e semanal, alimentado pelo livro-razão de XP (XpTransaction).
- **Desempenho** — estatísticas por disciplina/assunto, evolução e recomendações de estudo.
- **Painel administrativo** — visão geral, gestão de usuários, questões (CRUD completo), disciplinas/assuntos e trilhas/etapas.

## Arquitetura

```txt
Frontend (React 19 + Tailwind, porta 8000)
        ↓  requisições HTTP (JSON + JWT)
Backend (Express 5 + Prisma 6, porta 3000)
        ↓
      MySQL (banco "egg")
```

## Tecnologias

**Frontend:** React 19, React Router, Tailwind CSS 3, Axios  
**Backend:** Node.js, Express 5, Prisma 6, MySQL, JWT (bcrypt no hash de senhas)

## Pré-requisitos

- Node.js 18+
- MySQL 8 rodando localmente (padrão `localhost:3306`)

---

## Configuração

### 1. Backend

```bash
cd backend
npm install
```

Crie o arquivo `backend/.env` com o passo a passo exato para rodar em qualquer máquina:

```env
DATABASE_URL="mysql://root:2505@localhost:3306/egg"
JWT_SECRET="12345"
FRONT_URL="http://localhost:8000"
EMAIL=egg14128@gmail.com
APP_PASSWORD=hscsqfbtdssaxuau
```

> Os valores acima são os usados neste ambiente de desenvolvimento, para que o projeto suba sem ajustes em qualquer máquina com MySQL local. Em produção, troque `DATABASE_URL` (usuário/senha reais) e `JWT_SECRET` por valores fortes, e um `APP_PASSWORD` de aplicativo do próprio Gmail. As variáveis `EMAIL`/`APP_PASSWORD` são opcionais: sem elas, o link de recuperação de senha é apenas exibido no console do backend. O `.env` está no `.gitignore` e não deve ser commitado.

Resumo das variáveis do `backend/.env`:

| Variável | Descrição | Padrão deste projeto |
| --- | --- | --- |
| `DATABASE_URL` | Conexão com o MySQL (`mysql://USUARIO:SENHA@localhost:3306/egg`) | `root:2505`, banco `egg` |
| `JWT_SECRET` | Chave usada para assinar/validar os tokens JWT | `12345` |
| `FRONT_URL` | Origem permitida (CORS) e base dos links de e-mail | `http://localhost:8000` |
| `EMAIL` / `APP_PASSWORD` | Credenciais SMTP do Gmail para reset de senha (opcional) | `egg14128@gmail.com` |

### 2. Banco de dados

Crie o banco (se ainda não existir) e aplique o schema:

```bash
mysql -u root -p2505 -e "CREATE DATABASE IF NOT EXISTS egg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cd backend
npx prisma migrate deploy     # aplica as migrations existentes
npx prisma generate           # gera o Prisma Client
npm run seed                  # popula 7 disciplinas, 58 questões, trilhas e conquistas
```

> **Atenção:** não use `npx prisma migrate dev` em ambiente não interativo. Para alterar o schema, gere o SQL com
> `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` e aplique com `npx prisma migrate deploy`.

O seed também cria a conta de administrador:

```txt
E-mail: admin@egg.com
Senha:   admin123
```

Altere essa senha depois do primeiro login.

### 3. Frontend

```bash
cd frontend
npm install
```

Crie o arquivo `frontend/.env`:

```env
PORT="8000"
```

---

## Executando o projeto

Terminal 1 — backend (porta 3000):

```bash
cd backend
npm run dev
```

Terminal 2 — frontend (porta 8000):

```bash
cd frontend
npm start
```

Acesse **http://localhost:8000**, crie uma conta e use a aplicação.

---

## Estrutura do projeto

```txt
EGG/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # modelos do banco
│   │   ├── migrations/        # migrações aplicadas
│   │   └── seed.js            # conteúdo inicial (questões, trilhas, conquistas)
│   └── src/
│       ├── app.js             # Express + middlewares (CORS, rotas)
│       ├── routes/            # auth, users, subjects, questions, trails, gamification, stats, admin
│       ├── controllers/       # validação de entrada e respostas HTTP
│       ├── services/          # regras de negócio transacionais (XP, streak, desafios...)
│       └── middlewares/       # autenticação JWT e autorização (admin)
└── frontend/
│   └── src/
│       ├── context/           # AuthContext, ToastContext
│       ├── services/          # cliente API + módulos (practice, trail, gamification, admin...)
│       ├── components/        # UI compartilhada e Layout responsivo
│       ├── routes/            # rotas protegidas/guards
│       └── pages/             # Dashboard, Prática, Trilhas, Ranking, Desempenho, Admin...
```

---

## Segurança

- Senhas com hash (bcrypt), nunca em texto puro.
- Rotas privadas protegidas por middleware JWT; rotas administrativas checam `role`.
- A resposta correta e a explicação só são retornadas por `POST /questions/:id/answer`, validada no servidor.
- Mensagens de erro de login/recuperação genéricas (não revelam existência de conta).
- `.env` fora do versionamento (`.gitignore`). Este README traz os valores de desenvolvimento para facilitar a execução em qualquer máquina — **troque usuário/senha do banco, `JWT_SECRET` e `APP_PASSWORD` antes de usar em produção ou publicar o repositório**.
- Contadores de XP transacionais e registrados em `XpTransaction`, impedindo farm por repetição.

---

## Possíveis erros

**"execução de scripts foi desabilitada neste sistema" (Windows/npm.ps1)** — execute o PowerShell como administrador:

```powershell
Set-ExecutionPolicy RemoteSigned
```

**Porta ocupada** — backend usa 3000 e frontend 8000; ajuste `PORT` no `.env` do frontend ou libere a porta.

---

## Autores

Projeto desenvolvido por Enzo Giuliano, Gustavo Cabral e Gustavo Nicácio.
