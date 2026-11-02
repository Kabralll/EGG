# EGG — Pitches de 3 minutos

> **Site:** https://egg-estudos-gamificados.web.app
> **APK:** `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (5,6 MB)
> **Equipe:** Enzo Giuliano, Gustavo Cabral e Gustavo Nicácio — ETEC Zona Leste

---

## Ficha rápida (para consultar antes de apresentar)

| Item | Número |
|---|---|
| Público | 6º ao 9º ano do Fundamental e 1º ao 3º do EM |
| Disciplinas | 7 (Matemática, Português, História, Geografia, Física, Química, Biologia) |
| Conteúdo embutido | 195 questões comentadas · 43 assuntos · 26 trilhas · 75 etapas · 16 conquistas |
| XP | 10/20/30 por acerto (fácil/médio/difícil), 2 por erro, só na 1ª tentativa |
| Bônus | +50 XP desafio diário · +100 XP trilha · +150 XP desafio semanal PRO |
| Planos | Na Casca (grátis) · Fora da Casca R$ 9,90/mês ou R$ 79,90/ano (7 dias grátis) |
| Site | React 19 + Tailwind + React Router · IndexedDB (Dexie) · Firebase Hosting |
| App | Capacitor 8 · Android 7+ (minSdk 24) · 5,6 MB · 0 requisições de rede |
| Backend opcional | Express 5 + Prisma 6 + MySQL · JWT + bcrypt |

**Regra de ouro da apresentação:** fale 140–150 palavras por minuto. Cada roteiro abaixo tem ~450 palavras — dá os 3 minutos com folga para respirar e mostrar a tela.

---

# 🖥️ PITCH 1 — VERSÃO SITE (3 min)

### 0:00–0:15 — Gancho
**[Tela: landing page do EGG]**

> Quem aqui já viu um estudante passar quarenta minutos no celular e desistir de estudar em dez?
> O problema não é falta de conteúdo. É falta de **progresso visível**.
> O EGG existe para resolver exatamente isso.

### 0:15–0:40 — Problema
**[Tela: dashboard com XP, streak e nível]**

> Hoje o aluno do 6º ano ao 3º do Ensino Médio tem acesso a milhares de videoaulas e listas de exercícios. Mas nada disso responde à pergunta que ele realmente faz: *“eu estou evoluindo?”*
> A maioria das plataformas entrega conteúdo. Poucas entregam **sensação de progresso**. E quase nenhuma junta as duas coisas com o currículo brasileiro.

### 0:40–1:10 — Solução
**[Tela: prática de questão]**

> O EGG é uma plataforma web de estudos gamificada. O nome é o que ele faz: **Educação Geral Gamificada**.
> O aluno escolhe disciplina, assunto e dificuldade, responde questões reais e recebe correção na hora, com explicação comentada.
> Cada acerto vale 10, 20 ou 30 XP conforme a dificuldade. Cada erro vale 2 XP — porque errar também ensina.
> O XP só conta na primeira tentativa: acabou o farm de repetição.

### 1:10–1:50 — Demonstração
**[Clique em “Praticar agora” → responda uma questão → mostre o toast de XP]**

> Ao responder, o aluno vê o XP subir, a barra de nível avançar e, se for o caso, uma conquista desbloquear.
> O dashboard reúne sequência diária, desafio do dia, trilha em andamento, últimas atividades e ranking.
> As trilhas têm etapas com desbloqueio progressivo: do conceito básico ao desafio final, com +100 XP ao concluir.
> Em Desempenho, o aluno vê acerto por disciplina, evolução e uma recomendação do que estudar em seguida.
> E na Comunidade ele adiciona amigos, monta grupos de até 12 pessoas e disputa ranking de grupo.

### 1:50–2:20 — Como foi feito
**[Tela: código ou diagrama da arquitetura]**

> Por baixo, o site é React 19 com Tailwind e React Router. Os dados ficam em um banco local no navegador — IndexedDB, com 17 tabelas — então o site **funciona até sem backend e sem internet**.
> Existe também o modo online: Express 5, Prisma 6 e MySQL, com autenticação JWT e senhas em bcrypt. A troca entre os dois modos é uma única variável de ambiente.
> E tem o painel administrativo: gestão de usuários, CRUD de questões, disciplinas, assuntos, trilhas e etapas. É o que permite uma escola manter o conteúdo vivo sem mexer em código.
> O site está publicado no Firebase Hosting.

### 2:20–2:45 — Diferencial e modelo
**[Tela: planos / upgrade]**

> O modelo é freemium: o plano **Na Casca** é gratuito para sempre. O **Fora da Casca** custa R$ 9,90 por mês ou R$ 79,90 por ano e libera corações infinitos, relatórios de 90 dias, skins, congelamento de sequência e desafio semanal.
> No ambiente acadêmico o pagamento é simulado. Em produção, entra um gateway como Stripe ou Mercado Pago.
> O diferencial é a combinação: currículo brasileiro + questões comentadas + gamificação real + painel para escolas.

### 2:45–3:00 — Fechamento
**[Tela: landing page novamente]**

> O EGG não promete transformar estudo em diversão. Ele transforma estudo em **progressão visível**.
> Site no ar, código aberto para a banca e uma pergunta: quer testar agora?
> Obrigado. Sou o Gustavo, e esses são o Enzo e o Gustavo Nicácio.

---

# 📱 PITCH 2 — VERSÃO APP MOBILE (3 min)

### 0:00–0:15 — Gancho
**[Tela: celular na mão, app abrindo]**

> E se o cursinho inteiro coubesse no bolso — e funcionasse **sem internet**?
> Esse é o EGG no celular. Cinco megabytes e meio. Abre, estuda, fecha. Sem servidor, sem plano de dados, sem desculpa.

### 0:15–0:35 — Problema
**[Tela: dashboard do app]**

> A realidade do estudante brasileiro é esta: o celular é o principal dispositivo de estudo, mas a conexão é instável e o plano de dados acaba.
> Aplicativos nativos costumam ser pesados, exigem login, exigem rede e cobram caro.
> E a maioria dos projetos web simplesmente não funciona quando a internet cai.

### 0:35–1:05 — Solução
**[Tela: login local → dashboard]**

> O EGG mobile é o mesmo EGG do site, empacotado como aplicativo Android.
> Tudo o que o aluno precisa já vem dentro do APK: 195 questões comentadas, 43 assuntos, 26 trilhas, 75 etapas e 16 conquistas.
> O progresso — XP, nível, sequência, conquistas, trilhas, ranking e até a comunidade — fica no banco local do aparelho.
> Fechou o app? Abriu de novo? Está tudo lá. Sem conta na nuvem, sem sincronização obrigatória.

### 1:05–1:50 — Demonstração
**[Abra o app → responda uma questão → mostre XP e conquista → abra Perfil e troque a skin]**

> Vamos ao fluxo real. Abro o app, entro na minha conta local e caio no dashboard.
> Escolho Matemática, respondo uma questão de porcentagem. Correção imediata, explicação comentada, +20 XP.
> A barra de nível avança, a sequência do dia registra e, se eu bater a meta, uma conquista aparece.
> O desafio diário fica ali no topo, com progresso e recompensa.
> Nas trilhas, cada etapa só abre quando a anterior é concluída.
> No perfil, eu troco a skin do ovo — a clássica é grátis, as outras são do plano PRO.
> E se eu errar cinco vezes no plano gratuito, os corações acabam: é o gancho natural para o upgrade.

### 1:50–2:20 — Como foi feito
**[Tela: diagrama React → build → Capacitor → APK]**

> A parte boa: **não reescrevemos o app**. O mesmo código React 19 roda no site e no celular.
> O build gera arquivos estáticos, o Capacitor 8 copia esses arquivos para dentro de um projeto Android e o Gradle compila o APK.
> O código nativo tem três linhas: uma classe que estende a BridgeActivity.
> O resto é a nossa aplicação: Dexie/IndexedDB com 17 tabelas, regras de negócio de XP, streak, conquistas e trilhas, tudo no dispositivo.
> E os detalhes de app de verdade: safe area para notch, teclado que não cobre o formulário, botão voltar do Android e splash screen.
> Resultado medido: **zero requisições de rede** durante toda a sessão. O APK tem 5,6 MB, roda do Android 7 em diante e pede só a permissão de internet — que nem usa.

### 2:20–2:45 — Por que isso importa
**[Tela: app funcionando em modo avião]**

> Isso muda o jogo para inclusão digital: funciona em celular simples, em escola sem Wi-Fi, no ônibus, em casa.
> Custo de infraestrutura: zero. O conteúdo vai junto com o app.
> E o caminho para a Play Store já está desenhado: assinatura de release, versionCode e, se quisermos, sincronização opcional com Firebase no futuro.

### 2:45–3:00 — Fechamento
**[Tela: ícone do EGG na home do celular]**

> O EGG mobile é a prova de que dá para levar educação de qualidade para qualquer lugar — mesmo onde a internet não chega.
> O APK está pronto para instalar. Quer testar?
> Obrigado. Enzo, Gustavo Cabral e Gustavo Nicácio.

---

# 🎬 Checklist de demonstração

## Antes de apresentar
- [ ] APK instalado no celular **e** site aberto no notebook (plano B).
- [ ] Conta de teste com XP, streak e uma trilha em andamento (não comece do zero na frente da banca).
- [ ] Modo avião testado no celular para a demonstração offline.
- [ ] Aba do painel admin já logada no notebook.
- [ ] Cronômetro de 3 minutos visível para o apresentador.

## Roteiro de cliques (site)
1. Landing → “Criar conta grátis” (ou login de teste).
2. Dashboard: aponte XP, nível, streak e desafio do dia.
3. “Praticar agora” → responda 1 questão → mostre XP e explicação.
4. Trilhas → abra uma trilha → mostre etapa desbloqueada.
5. Desempenho → gráfico por disciplina e recomendação.
6. Admin → liste questões (mostre que é CRUD real).
7. Upgrade → planos e comparação.

## Roteiro de cliques (app)
1. Ícone do EGG → splash → login local.
2. Dashboard → responda 1 questão → mostre o toast de XP.
3. Ative o modo avião e repita uma questão (prova do offline).
4. Trilhas → etapa concluída.
5. Comunidade → grupo e ranking.
6. Perfil → troque a skin.
7. Feche e reabra o app → progresso preservado.

---

# 💬 Perguntas prováveis da banca

**“Isso não vicia o aluno?”**
> A gamificação é acoplada ao estudo real, não a recompensas vazias. O XP só conta na primeira tentativa, não existe compra de vantagem e o erro também gera aprendizado. O objetivo é criar hábito, não dependência.

**“Precisa de internet?”**
> O site funciona no navegador com banco local e o app funciona 100% offline. O modo online com MySQL existe, mas é opcional.

**“Como vocês ganham dinheiro?”**
> Freemium: gratuito para sempre e PRO a R$ 9,90/mês ou R$ 79,90/ano, com 7 dias de teste. No futuro, licenciamento para escolas usando o painel administrativo. No ambiente acadêmico, o checkout é simulado.

**“Qual a diferença de Duolingo ou Khan Academy?”**
> Currículo brasileiro do 6º ano ao 3º do EM, questões comentadas, trilhas com desbloqueio progressivo, ranking, comunidade e painel para escolas — tudo em português e funcionando offline.

**“E a segurança?”**
> Senhas com hash, JWT nas rotas privadas, permissão de admin verificada e o gabarito nunca trafega antes da resposta. No app, os dados ficam no aparelho.

**“Dá para escalar?”**
> Sim. O mesmo código atende web e Android. O modo local elimina custo de servidor; o modo online usa Express/Prisma/MySQL; e o site já está no Firebase Hosting.

**“Por que não React Native?”**
> Porque o Capacitor permite reaproveitar 100% do código React. Não reescrevemos telas, navegação nem regras de negócio — só empacotamos. O resultado é um APK de 5,6 MB com o mesmo produto do site.

---

# 🗂️ Estrutura sugerida dos slides (opcional)

| # | Slide | Tempo |
|---|---|---|
| 1 | Logo + frase: “Estudar pode ser como subir de nível” | 0:00 |
| 2 | Problema: conteúdo existe, progresso não aparece | 0:15 |
| 3 | Solução: 6 pilares (XP, trilhas, desafio, conquistas, ranking, desempenho) | 0:40 |
| 4 | Demo ao vivo | 1:10 |
| 5 | Arquitetura (React + banco local + backend opcional) | 1:50 |
| 6 | Modelo freemium e painel escolar | 2:20 |
| 7 | Números + equipe + CTA | 2:45 |
