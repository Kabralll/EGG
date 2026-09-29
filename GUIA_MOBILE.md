# 📱 EGG — Guia completo: Web → App Mobile (CapacitorJS)

> **React 19 + Tailwind (CRA)** · **Dexie/IndexedDB** · **Capacitor 8.5.2**
> Guia 100% executável a partir do terminal do VS Code.
>
> 🥚 **O app roda 100% offline** (padrão `REACT_APP_DATA_MODE=local`): todo o
> conteúdo e todas as regras de negócio vivem no aparelho — **não precisa de
> backend nem de internet**. Veja a **seção 7**. O modo online antigo continua
> disponível em `REACT_APP_DATA_MODE=http` (seção 7.6).

---

## ⚡ O que já está feito neste repositório

Você não precisa refazer nada abaixo — tudo já está aplicado e verificado
(`CI=true npx react-scripts build` → **Compiled successfully**, `npx eslint src` → **0 problemas**).

| # | Arquivo | O que foi feito |
|---|---------|-----------------|
| 1 | `frontend/capacitor.config.json` | Config do Capacitor (appId, webDir, cleartext, safe area, splash, teclado) |
| 2 | `frontend/android/` | Projeto nativo Android já criado (`npx cap add android`) |
| 3 | `frontend/.env.development` | `REACT_APP_API_URL=` **vazio** + `proxy` no `package.json` (dev sem CORS, funciona pelo celular) |
| 4 | `frontend/.env.production` | `REACT_APP_API_URL=http://192.168.15.9:3000` (para o build do app) |
| 5 | `frontend/package.json` | `"proxy": "http://localhost:3000"` + scripts `cap:sync`, `cap:android`, `cap:run`, `cap:livereload` |
| 6 | `frontend/src/services/api.js` | `BASE_URL` vazio no dev + header `Accept: application/json` (exigido pelo proxy do CRA) |
| 7 | `frontend/public/index.html` | `viewport-fit=cover`, `user-scalable=no`, meta de cor/app |
| 8 | `frontend/src/index.css` | Safe area, tap-highlight, user-select, pull-to-refresh, zoom de input |
| 9 | `frontend/src/hooks/useBackButton.js` | Botão "Voltar" do Android |
| 10 | `frontend/src/components/Layout.jsx` | Hook integrado + `pt-safe`/`pb-safe` nos cabeçalhos e rodapé |
| 11 | `frontend/src/context/ToastContext.jsx` | Toast respeita a status bar |
| 12 | `backend/src/app.js` | CORS configurável (`CORS_ORIGINS`) |
| 13 | `backend/src/server.js` | Sobe em `0.0.0.0` e imprime os IPs da rede local |
| 14 | Firewall do Windows | Regras `EGG-API-porta-3000` e `EGG-Web-porta-8000` já criadas (seção 3.6) |
| 15 | `frontend/src/offline/` | **Camada 100% local**: `localApi.js` (roteador), `db.js` (Dexie), `seed.js`, `auth.js`, `practice.js`, `gamification.js`, `stats.js`, `trails.js`, `subjects.js`, `admin.js`, `sha256.js` |
| 16 | `frontend/src/data/seed.json` | Conteúdo embutido no app: 7 disciplinas, 22 assuntos, 58 questões, 16 conquistas, 5 trilhas, 16 etapas |
| 17 | `frontend/src/services/api.js` | Ponto único de troca: delega para `localApi` (padrão) ou continua no `fetch` (`REACT_APP_DATA_MODE=http`) |
| 18 | `frontend/src/offline/seed.js` | Cria as tabelas e semeia conteúdo no **primeiro acesso** + conta `admin@egg.com` / `admin123` |
| 19 | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` | **APK gerado com sucesso** (4,9 MB) — instale no celular com `adb install -r` |

> **Caminho mais curto:** o backend **não é mais necessário** para usar o app.
> Rode só o front (`cd frontend && npm start`) ou instale o `.apk` da seção 9 —
> tudo funciona offline.

---

# 1. Pré-requisitos

## 1.1 O que seu PC já tem ✅

```bash
node -v      # v24.15.0  → Capacitor 8 exige Node 22+ ✅
npm -v       # 11.12.1   ✅
```

## 1.2 O que falta instalar (Android)

| Ferramenta | Versão mínima (Capacitor 8) | Situação |
|---|---|---|
| **Android Studio** | **2025.2.1** | ❌ não instalado |
| **Android SDK (Platforms)** | API **24** ou superior | ❌ vem com o Android Studio |
| **JDK** | — | ✅ **não precisa instalar**: o Android Studio instala o JDK junto |
| **adb** | — | ✅ vem com o Android Studio |

**Passo a passo:**

1. Baixe em <https://developer.android.com/studio> e instale (deixe as opções padrão).
2. Abra o Android Studio → **More Actions → SDK Manager** (ou `File → Settings → Languages & Frameworks → Android SDK`):
   - Aba **SDK Platforms** → marque **Android 16 (API 36)** ou pelo menos **API 24+** → *Apply*.
   - Aba **SDK Tools** → marque **Android SDK Build-Tools** e **Android SDK Platform-Tools** → *Apply*.
3. Feche e reabra o VS Code (para o `PATH` do `adb` ser reconhecido).
4. Confira:

```bash
adb version          # deve mostrar "Android Debug Bridge"
adb devices           # lista o emulador/celular conectado
```

> **Sem Android Studio?** Alternativas: `winget install Google.AndroidStudio` ou `scoop install androidstudio`.

## 1.3 iOS — atenção ⚠️

**Não é possível compilar iOS no Windows.** O build de iOS exige **macOS + Xcode 26.0+**.
Se você tiver um Mac disponível, os comandos do guia funcionam (`npm run cap:ios`); caso contrário,
foi preparada apenas a plataforma **Android**.

---

# 2. Instalação e configuração do Capacitor

> Já executado. Documentado para você entender/recriar.

## 2.1 Pacotes instalados em `frontend/`

```bash
cd frontend

# runtime + CLI + plataforma Android
npm install  @capacitor/core@latest @capacitor/android@latest
npm install -D @capacitor/cli@latest

# plugins usados pelo EGG
npm install @capacitor/app@latest         # botão Voltar / ciclo de vida
npm install @capacitor/keyboard@latest    # teclado virtual
npm install @capacitor/splash-screen@latest
```

Versões resultantes: `@capacitor/core` **8.5.2**, `@capacitor/app` **8.1.1**,
`@capacitor/keyboard` **8.0.5**, `@capacitor/splash-screen` **8.0.2**.

> ⚠️ Para iOS (só em Mac): `npm install @capacitor/ios@latest && npx cap add ios`

## 2.2 `npx cap init`

O comando interativo pede nome, id e `webDir`. Como já existe o arquivo, **não é
necessário rodar**. Equivalente não-interativo:

```bash
npx cap init "EGG" br.com.egg.app --web-dir build
```

- `appId` → `br.com.egg.app` (domínio invertido; é o nome do pacote do APK)
- `webDir` → **`build`** (é a pasta que o `react-scripts build` gera)

## 2.3 `frontend/capacitor.config.json` (arquivo atual)

```json
{
  "appId": "br.com.egg.app",
  "appName": "EGG",
  "webDir": "build",
  "backgroundColor": "#ffffff",
  "zoomEnabled": false,

  "server": {
    "androidScheme": "https",
    "cleartext": true
  },

  "android": {
    "allowMixedContent": true
  },

  "plugins": {
    "SystemBars": {
      "insetsHandling": "css",
      "initialViewportFitValueHint": "cover",
      "style": "LIGHT"
    },
    "SplashScreen": {
      "launchShowDuration": 1200,
      "backgroundColor": "#ffffff",
      "showSpinner": false
    },
    "Keyboard": {
      "resize": "native",
      "autoBackdropColor": "auto"
    }
  }
}
```

### O que cada chave faz (e por que está ali)

| Chave | Motivo no EGG |
|---|---|
| `webDir: "build"` | Saída do CRA. |
| `zoomEnabled: false` | **Desabilita o zoom de pinça** no WebView (padrão desde o Capacitor 6). |
| `server.androidScheme: "https"` | Origem do app vira `https://localhost` → `localStorage` (token JWT) funciona como contexto seguro. **Padrão recomendado — não mude.** |
| `server.cleartext: true` | Escreve `android:usesCleartextTraffic="true"` no manifest. **Obrigatório**: sem isso o Android 9+ **bloqueia** suas chamadas `http://192.168.x.x:3000`. |
| `android.allowMixedContent: true` | Como a origem é `https` e a API é `http`, é **mixed content** — bloqueado por padrão. Esta chave libera. |
| `SystemBars.insetsHandling: "css"` | Injeta as variáveis CSS `--safe-area-inset-*` (notch / barra de gestures). É o plugin que também cuida dos insets do teclado. |
| `SystemBars.initialViewportFitValueHint: "cover"` | Evita "pulo" de layout na inicialização (nosso `index.html` usa `viewport-fit=cover`). |
| `SystemBars.style: "LIGHT"` | Ícones **escuros** na status bar (nosso cabeçalho é branco). |
| `SplashScreen.*` | Tela branca de 1,2 s sem spinner (combina com o hero branco da landing). |
| `Keyboard.resize: "native"` | **iOS**: redimensiona a WebView quando o teclado abre (é o padrão). No Android quem cuida disso é o `SystemBars`. |
| `backgroundColor` | Cor da WebView para não haver "flash" branco/preto entre o splash e a página. |

> 🔒 **Para publicar na Play Store**: troque a API para **HTTPS** e remova
> `server.cleartext` e `android.allowMixedContent` (ambos marcados pela Capacitor
> como *"not intended for use in production"*). `webContentsDebuggingEnabled`
> não foi definido de propósito: ele liga sozinho só em build de debug e desliga em release.

---

# 3. Comunicação de rede (API URL + CORS)

## 3.1 Por que `localhost:3000` não funciona no celular

No celular, `localhost` é **o próprio celular**. Existem dois caminhos:

* **Dev (`npm start`)** → o front e a API ficam na **mesma origem** (`http://<IP>:8000`),
  porque o **proxy do CRA** repassa as chamadas para `localhost:3000`. Não há CORS
  nem IP fixo para se preocupar.
* **App mobile (`npm run build` + Capacitor)** → não existe proxy, então o código
  precisa do **IP absoluto da máquina**.

O EGG usa **`fetch`** (não Axios) — tudo passa por **`frontend/src/services/api.js`**:

```js
/*
  Desenvolvimento (npm start): VAZIO → caminho relativo ("/auth/login")
  e o proxy do CRA (campo "proxy" do package.json) encaminha para
  http://localhost:3000. Assim funciona do celular em http://<IP>:8000.
  Produção (npm run build): vem de .env.production com o IP da máquina.
*/
const BASE_URL = process.env.REACT_APP_API_URL || ""
```

> **Não existe `VITE_API_URL` aqui**: o projeto é **CRA (react-scripts)**, então a variável
> precisa do prefixo **`REACT_APP_`**. Qualquer outro nome é **ignorado silenciosamente**.

> ⚠️ **O header `Accept: "application/json"` não é opcional.** O proxy do CRA decide
> assim: *requisição `GET` só vai para o backend se o `Accept` **não** contiver
> `text/html`* (assim ele consegue separar navegação de página de chamada de API).
> Sem esse header, um `GET` da API poderia receber o `index.html` do SPA em vez da
> resposta da API — e o erro seria silencioso. Já os `POST/PUT/DELETE` vão sempre
> para o backend.

## 3.2 Descubra o IP da sua máquina

```bash
ipconfig | findstr /i "IPv4"
```

Nesta máquina o IP é **`192.168.15.9`**.

> 💡 Fixe o IP no roteador (DHCP estático) ou o endereço muda e o app para de achar o servidor.

## 3.3 Arquivos de ambiente (já criados)

O CRA aplica **uma** dessas entradas por modo — assim web e mobile convivem sem conflito:

**`frontend/.env.development`** → usado por `npm start` (web e navegador do celular)
```env
# vazio de propósito: no dev as chamadas são relativas e passam pelo proxy do CRA
REACT_APP_API_URL=
```

**`frontend/package.json`** → proxy do dev server (só existe em `npm start`):
```json
"proxy": "http://localhost:3000"
```

**`frontend/.env.production`** → usado por `npm run build` (é o que o app mobile embute)
```env
REACT_APP_API_URL=http://192.168.15.9:3000
```

> Por que o proxy? Ele resolve três problemas de uma vez: **sem CORS**, **sem IP
> fixo** no modo dev e **mesma URL** no PC e no celular. O Capacitor não tem proxy,
> por isso o build de produção continua usando o IP absoluto.

⚠️ **Variáveis de ambiente do CRA são embutidas no momento do build.** Se trocar o IP,
**rode `npm run build` de novo** e depois `npx cap sync`.

⚠️ Se outro colega for compilar, ele deve ajustar `.env.production` com o IP dele.

## 3.4 Backend: liberar acesso pela rede local

**`backend/src/server.js`** — agora sobe em todas as interfaces e mostra os IPs:

```js
app.listen(port, "0.0.0.0", () => {
  console.log(`EGG API rodando em http://localhost:${port}`)
  // imprime "Acesso pela rede local: http://192.168.15.9:3000"
})
```

### 3.5 CORS — `backend/src/app.js`

Por padrão `app.use(cors())` **já libera qualquer origem** (`Access-Control-Allow-Origin: *`), então
o app mobile já funciona sem mexer em nada. O código abaixo apenas torna isso **explícito e configurável**:

```js
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)                                  // curl / nativo
    if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes("*")) return callback(null, true)
    const allowed = CORS_ORIGINS.some(o => o.endsWith("*") ? origin.startsWith(o.slice(0, -1)) : origin === o)
    callback(null, allowed)
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}
app.use(cors(corsOptions))
```

**Origens que o app mobile envia:**

| Plataforma | `Origin` |
|---|---|
| Android | `https://localhost` |
| iOS | `capacitor://localhost` |
| Web (dev) | `http://localhost:8000` |

Para **travar** o CORS, adicione em `backend/.env`:

```env
CORS_ORIGINS=capacitor://localhost,https://localhost,http://localhost:8000,http://192.168.15.9:8000
```

> O app usa **token Bearer no header** (não cookies), por isso não é necessário `credentials: true`.

### 3.6 Firewall do Windows (passo que quase sempre esquecem)

Sem esta regra o celular dá *"Não foi possível conectar ao servidor"* mesmo com tudo certo:

```powershell
# PowerShell como Administrador — libera a API (3000) e o dev server web (8000)
netsh advfirewall firewall add rule name="EGG API - porta 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="EGG Web - porta 8000" dir=in action=allow protocol=TCP localport=8000
```

> As duas portas precisam estar liberadas: `3000` é a API e `8000` é o front
> (`npm start`). Sem a regra da `8000` o celular não abre a página.

E **a rede Wi-Fi precisa estar como "Privada"** no Windows (`Configurações → Rede & Internet`).

### 3.7 Teste antes de abrir o app

1. Suba o backend e veja se ele imprime `http://192.168.15.9:3000`.
2. Suba o front (`cd frontend && npm start`) e veja se ele imprime `On Your Network: http://192.168.15.9:8000`.
3. No PC: `curl http://192.168.15.9:8000/health` → `{"status":"ok"}` (chega ao backend pelo proxy).
4. No **celular**, abra `http://192.168.15.9:8000` (app) e `http://192.168.15.9:3000/health` (só API).
5. Se não responder, o problema é rede/firewall — não é código.

---

# 4. Build e sincronização

## 4.1 Scripts adicionados em `frontend/package.json`

```json
"proxy": "http://localhost:3000",
"cap:sync":       "npm run build && cap sync",
"cap:android":    "npm run build && cap sync android && cap open android",
"cap:ios":        "npm run build && cap sync ios && cap open ios",
"cap:run":        "npm run build && cap sync android && cap run android",
"cap:livereload": "cap run android --livereload"
```

> O `"proxy"` vale **só no `npm start`** (é lido pelo dev server). Ele é o que permite
> abrir o app pelo celular sem CORS — ver seções 3.1 e 5.2.

## 4.2 O que `cap sync` faz

```bash
npm run cap:sync
```

1. `react-scripts build` → gera `frontend/build/`
2. `cap sync`:
   - copia `build/` → `android/app/src/main/assets/public/`
   - copia `capacitor.config.json`
   - atualiza os plugins Gradle (`@capacitor/app`, `keyboard`, `splash-screen`)

**Sempre que mudar código React ou `.env`, rode `npm run cap:sync`.**

## 4.3 Comandos úteis

```bash
npx cap sync              # sincroniza todas as plataformas existentes
npx cap sync android      # só Android
npx cap copy android      # só copia assets (sem plugins)
npx cap ls                # lista plugins instalados
npx cap doctor            # diagnostica problemas de configuração
npx cap open android      # abre o Android Studio
```

---

# 5. Execução e teste

## 5.1 Backend (sempre primeiro)

```bash
cd backend
npm run dev
```

Saída esperada:

```
EGG API rodando em http://localhost:3000
Acesso pela rede local (use no app mobile):
  http://192.168.15.9:3000
```

## 5.2 Opção 0 — Navegador do celular (sem Android Studio)

**Não instala nada.** É o mesmo `npm start` de sempre, aberto pelo celular.
Único requisito: PC e celular no **mesmo Wi-Fi**.

**1) Libere as portas no firewall (uma única vez)** — PowerShell **como Administrador**:

```powershell
netsh advfirewall firewall add rule name="EGG-API-porta-3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="EGG-Web-porta-8000" dir=in action=allow protocol=TCP localport=8000
```

**2) Suba os dois servidores (dois terminais do VS Code):**

```bash
# Terminal 1 — API
cd backend
npm run dev
```

```bash
# Terminal 2 — front (sobe em 0.0.0.0, ou seja, aceita conexão da rede)
cd frontend
npm start
```

Confira se o terminal do front mostrar o endereço de rede:

```
On Your Network:  http://192.168.15.9:8000
```

**3) No celular, abra no navegador:**

```
http://192.168.15.9:8000
```

Pronto. Não precisa de `npm run build`, de `cap sync` nem de `.apk` — é o dev server,
com hot reload (atualiza sozinho quando você salva um arquivo).

**Teste rápido (rode no PC, antes de pegar o celular):**

```bash
curl http://192.168.15.9:8000/health      # {"status":"ok"} → front + proxy OK
curl http://192.168.15.9:3000/health      # {"status":"ok"} → API acessível pela rede
```

Se o primeiro responder e o segundo não, o problema é **firewall/rede**, não código.

**4) Quer o ícone na tela inicial?**

| Celular | Passo |
|---|---|
| **Android (Chrome)** | ⋮ → **Adicionar à tela inicial** |
| **iPhone (Safari)** | botão compartilhar → **Adicionar à Tela de Início** |

O `manifest.json` já está com `display: standalone`, ícones 192/512 e `theme-color`
laranja — abre em tela cheia, sem barra de endereço.

> **Limitações desta opção:** sem `.apk` não há splash nativo, permissões nativas,
> botão "Voltar" do Android nem publicação na Play Store. Quando precisar disso,
> vá para as Opções A–C (aí sim é preciso instalar o Android Studio — seção 1.2).

## 5.3 Opção A — Emulador Android (mais rápido)

```bash
# 1) Abra o Android Studio
cd frontend
npx cap open android

# 2) No Android Studio: Device Manager → cria um dispositivo (ex.: Pixel 8, API 36)

# 3) Compile e rode (ou aperte ▶ Run no Android Studio)
npm run cap:run
```

> O emulador acessa o PC pelo IP `10.0.2.2` **quando o backend roda no mesmo PC**.
> Como usamos `192.168.15.9` (IP real da placa de rede), o emulador também encontra —
> desde que esteja na mesma rede. Se não achar, troque por `http://10.0.2.2:3000`
> **apenas em `.env.production` de teste** e rebuild.

## 5.4 Opção B — Celular real via USB

1. No celular: **Configurações → Sobre o telefone → toque 7× em "Número da build"** (ativa *Opções do desenvolvedor*).
2. **Opções do desenvolvedor → Depuração USB → ative**.
3. Conecte o cabo e aceite o aviso *"Permitir depuração USB?"*.
4. Verifique:

```bash
adb devices        # deve listar o aparelho (não "unauthorized")
```

5. Compile e instale:

```bash
cd frontend
npm run cap:run
```

### 5.4.1 Via Wi-Fi (sem cabo)

```bash
adb pair <ip-do-celular>:<codigo-pareamento>   # emparelhar (Android 11+)
adb connect <ip-do-celular>:5555               # conectar
adb devices
npm run cap:run
```

## 5.5 Opção C — Só Android Studio

```bash
cd frontend
npm run cap:android      # build + sync + abre o Android Studio
```

No Android Studio: escolha o dispositivo no menu superior e clique em **▶ Run**.

## 5.6 Opção D — Extensões do VS Code (opcional)

```bash
code --install-extension vscapacitor.capacitor-tools
code --install-extension ms-vscode.android-devpack
```

Elas dão atalhos para `cap sync`/`cap open`, mas **o Android Studio continua obrigatório**
para compilar. Todo o restante do fluxo roda pelo terminal (`npm run cap:sync`, `npm run cap:run`).

## 5.7 Live Reload (desenvolvimento confortável)

Em vez de rebuildar a cada mudança:

```bash
cd frontend
npm start                       # terminal 1: dev server em http://localhost:8000
npm run cap:livereload          # terminal 2: pergunta a URL → http://192.168.15.9:8000
```

Isso aponta o app para o servidor de desenvolvimento — alterações aparecem **sem rebuild**.
Para voltar ao modo normal (assets empacotados), rode `npm run cap:sync`.

> O live reload **temporariamente** altera a `server.url`; a mudança **não é salva** no
> `capacitor.config.json`.

---

# 6. Responsividade, Layout Mobile e UX de App Nativo

## 6.1 Safe Area (notch / status bar / gesture bar)

### `frontend/public/index.html`

```html
<!-- viewport-fit=cover é OBRIGATÓRIO para env(safe-area-inset-*) funcionar -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
/>
<meta name="color-scheme" content="light" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="mobile-web-app-capable" content="yes" />
```

### `frontend/src/index.css` — utilitários criados

```css
@layer utilities {
  .pt-safe  { padding-top:    var(--safe-area-inset-top,    env(safe-area-inset-top, 0px)); }
  .pb-safe  { padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)); }
  .pl-safe  { padding-left:   var(--safe-area-inset-left,   env(safe-area-inset-left, 0px)); }
  .pr-safe  { padding-right:  var(--safe-area-inset-right,  env(safe-area-inset-right, 0px)); }
  .mt-safe  { margin-top:     var(--safe-area-inset-top,    env(safe-area-inset-top, 0px)); }
  .mb-safe  { margin-bottom:  var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)); }
  .h-safe-top    { height: var(--safe-area-inset-top,    env(safe-area-inset-top, 0px)); }
  .h-safe-bottom { height: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)); }
  .min-h-app { min-height: 100dvh; }   /* 100vh não considera as barras do mobile */
}
```

**Por que `var(..., env(...))`?**

- **iOS / navegadores**: `--safe-area-inset-*` não existe → cai no `env(safe-area-inset-top)` ✅
- **Android com WebView ≥ 140 + `viewport-fit=cover`**: o Capacitor fica *edge-to-edge* e
  injeta as variáveis com o valor **real** ✅
- **Android com WebView antigo**: o Capacitor faz padding nativo na WebView e injeta
  `0px` nas variáveis — que é o valor **correto**, já que a WebView já recuou ✅

Em **todos** os casos o resultado é o certo.

### Onde foi aplicado

| Elemento | Classe | Por quê |
|---|---|---|
| `PublicNavbar` / `AppNavbar` `<header>` | `pt-safe` | conteúdo não fica embaixo da câmera/status bar |
| `<footer>` | `pb-safe` | não é coberto pela barra de gestures |
| `<main>` (só páginas públicas) | `pb-safe` | landing/login não têm rodapé |
| Modais (`AdminQuestions`, `AdminSubjects`) | `pt-safe` + `pb-safe` | formulários acessíveis com notch |
| Toast (`ToastContext`) | `mt-safe` | não fica escondido sob a status bar |
| Painel do menu mobile | `top-full` | acompanha o header já deslocado pela safe area |

> O menu mobile foi trocado de `top-16` para **`top-full`** justamente porque o header
> agora tem `pt-safe` — com `top-16` o painel ficaria por baixo do cabeçalho.

## 6.2 Botão "Voltar" do Android

**`frontend/src/hooks/useBackButton.js`**

```jsx
import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"

const EXIT_PATHS = ["/", "/dashboard", "/login", "/register"]

export default function useBackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return   // no web/iOS não faz nada

    let handle = null
    let disposed = false

    App.addListener("backButton", ({ canGoBack }) => {
      // 1) menu mobile aberto → fecha o menu
      if (document.getElementById("mobile-menu")) {
        window.dispatchEvent(new Event("egg:close-menu"))
        return
      }

      const path = locationRef.current.pathname
      const emRotaDeSaida = EXIT_PATHS.some(p => p.toLowerCase() === path.toLowerCase())

      if (emRotaDeSaida || !canGoBack) App.exitApp()   // 2) tela inicial → sai
      else navigate(-1)                                 // 3) senão → volta
    }).then(listener => {
      if (disposed) { listener.remove(); return }       // desmontou antes da promise
      handle = listener
    })

    return () => {
      disposed = true
      if (handle) { handle.remove(); handle = null }
    }
  }, [navigate])
}
```

**Pontos importantes:**

- A documentação do Capacitor diz que *“escutar este evento desativa o comportamento padrão
  do botão voltar”* — por isso chamamos `navigate(-1)` explicitamente.
- O listener fica registrado **uma única vez**; a rota atual é lida via `locationRef`,
  evitando re-registrar a cada navegação.
- Sempre que o usuário abre o menu mobile, o voltar **fecha o menu** antes de navegar.

**Integração (`frontend/src/components/Layout.jsx`)** — o hook roda dentro do `<BrowserRouter>`:

```jsx
export default function Layout() {
  const location = useLocation()
  const { profile, logout } = useAuth()
  const isPublic = isPublicPath(location.pathname)

  useBackButton()   // ← adicionado

  return ( ... )
}
```

E no `AppNavbar`, para fechar o menu pelo evento:

```jsx
useEffect(() => {
  const closeMenu = () => setMenuOpen(false)
  window.addEventListener("egg:close-menu", closeMenu)
  return () => window.removeEventListener("egg:close-menu", closeMenu)
}, [])
```

## 6.3 Prevenção de comportamentos de navegador

Tudo em **`frontend/src/index.css`**:

```css
@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    scroll-padding-bottom: 8rem;   /* input focado não fica atrás do teclado */
    scroll-padding-top: 6rem;      /* não fica atrás do header sticky */
    overscroll-behavior-y: none;   /* desativa o PULL-TO-REFRESH */
  }

  body {
    -webkit-user-select: none;
    user-select: none;             /* evita seleção acidental ao tocar */
    -webkit-touch-callout: none;   /* sem balão "Copiar/Colar" no toque longo */
  }

  /* -webkit-tap-highlight-color NÃO é herdado → precisa do `*` */
  *, *::before, *::after {
    -webkit-tap-highlight-color: transparent;  /* sem destaque cinza ao tocar */
    -webkit-overflow-scrolling: touch;
  }

  /* remove o atraso de 300ms e o zoom por duplo toque */
  a, button, summary, label, .btn, [role="button"] {
    touch-action: manipulation;
  }

  /* EXCEÇÃO: onde é precisa digitar/selecionar volta ao normal */
  input, textarea, select,
  [contenteditable="true"], [contenteditable=""],
  .selectable {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
}
```

- **Zoom de pinça**: já bloqueado pelo Capacitor (`zoomEnabled: false`, padrão desde a v6)
  **e** pela meta `user-scalable=no` / `maximum-scale=1`.
- **Quer que um bloco de texto seja copiável?** Basta adicionar a classe **`selectable`**.

## 6.4 Teclado virtual nos formulários

### O que já cuida disso sozinho

1. **Capacitor 8 — plugin `SystemBars` (embutido no core)**: ele escuta os insets do teclado
   e redimensiona a WebView. O plugin `Keyboard` **cede a função para o `SystemBars`**
   quando ele está presente (`if (isSystemBarsPluginPresent()) return;`).
2. **`Keyboard.resize: "native"`** (iOS): redimensiona a WebView ao abrir o teclado.
3. **`scroll-padding-bottom: 8rem`** no `html`: quando o navegador rola até o input focado,
   ele sobe **8rem acima** da borda — o campo nunca fica atrás do teclado.

### O ajuste anti-zoom do iOS

O iOS só respeita o bloqueio de zoom se a fonte for **≥ 16px**. Como `.input` usa
`text-sm` (14px), foi adicionado em **`@layer utilities`** (não em `base`, senão perderia
a disputa de especificidade contra a classe `.input`):

```css
@layer utilities {
  @media (pointer: coarse) {          /* só telas de toque: visual do desktop não muda */
    .input, input, textarea, select {
      font-size: 16px;
    }
  }
}
```

### Se ainda assim o teclado cobrir o formulário (apenas Android)

Adicione ao `<activity>` em `frontend/android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:windowSoftInputMode="adjustResize"
    ... >
```

> Só faça isso se você **vir** o problema — o `SystemBars` do Capacitor 8 já trata os insets
> do teclado e o `adjustResize` pode "somar" com o tratamento dele.

## 6.5 Outros ajustes de layout feitos

- `min-h-app { min-height: 100dvh }` → `dvh` acompanha a barra do navegador; `100vh` não.
  (As páginas usam `min-h-screen` do Tailwind — troque para `min-h-app` onde quiser.)
- `scroll-padding-top: 6rem` → evita que o input fique atrás do header `sticky`.

## 6.6 Correção do "dashboard rolando para a direita" (overflow horizontal)

**Sintoma:** todas as tarjas do Dashboard (nível, desafio, recomendado, últimas
atividades, questões/acerto/ranking, conquistas, trilhas) ficavam **mais largas
que a tela** — a página rolava para a direita e cortava o conteúdo na direita.

**Causa raiz (medida em navegador real, viewport 320/360/390px):**

1. **Coluna de grid implícita.** `<div className="grid gap-6 lg:grid-cols-3">`
   não tinha `grid-cols-*` abaixo de `lg`. Sem definir colunas, o CSS cria uma
   trilha **implícita** com `grid-auto-columns: auto` = `minmax(auto, max-content)`,
   cujo mínimo é o **min-content** dos cards. O card de "Trilhas" sozinho pedia
   ~308px → a página virava 684px com dados reais.

   ```jsx
   // ❌ trilha implícita cresce além da tela
   <div className="grid gap-6 lg:grid-cols-3">
   // ✅ minmax(0, 1fr) trava a trilha na largura disponível
   <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
   ```

2. **`truncate` dentro de bloco.** `truncate` = `white-space: nowrap`, e o
   **min-content** de um texto sem quebra de linha é a largura **inteira** do
   texto — ele sobe por toda a hierarquia até o grid. O `min-w-0` **não**
   resolve isso (ele só permite encolher no layout, não altera o min-content).

   ```jsx
   // ❌ statement de ~550px contamina a largura mínima da página
   <p className="truncate text-sm font-medium text-slate-800">
   // ✅ quebra linha normalmente (min-content = palavra mais longa) e
   //    ainda mostra "…" na 1ª linha — visual praticamente idêntico
   <p className="line-clamp-1 text-sm font-medium text-slate-800">
   ```

**Arquivos alterados:**

| Arquivo | Mudança |
|---|---|
| `pages/Dashboard.jsx` | `grid gap-6 lg:grid-cols-3` → `grid grid-cols-1 gap-6 lg:grid-cols-3`; 4× `truncate` → `line-clamp-1` (statement, nome/descrição da conquista, título da trilha) |
| `pages/Achievements.jsx` | linha de filtros `flex gap-2` → `flex flex-wrap gap-2` (botão "Bloqueadas" estourava 6px em 320px) |
| `pages/Ranking.jsx` | card da tabela `overflow-hidden` → `overflow-x-auto` — a tabela tem ~372px mínimos e era **cortada sem como rolar**; agora ela rola dentro do card |

**Resultado medido (conta com dados reais, Chrome headless + CDP):**

| Rota | 320px | 360px | 390px |
|---|---|---|---|
| `/dashboard` | overflow **0** (era 364) | overflow **0** (era 324) | overflow **0** (era **294**) |
| `/subjects` `/trails` `/achievements` `/ranking` `/stats` `/profile` `/practice` | overflow **0** | — | overflow **0** |

> **Regra prática:** sempre que usar `grid` sem definir a coluna no breakpoint
> menor, adicione `grid-cols-1`. E nunca deixe texto imprevisível (statement,
> nome de conquista, título de trilha) com `truncate` — use `line-clamp-1`.

---

# 7. Modo 100% offline (padrão) — banco de dados local

> **Este é o modo padrão do app.** Nenhuma linha de rede é usada: `api()` nem
> alcança o `fetch`. Contas, questões, XP, sequência, conquistas, trilhas e
> ranking são gravados no **IndexedDB do aparelho** e sobrevivem a fechar o app.

## 7.1 Por que Dexie (IndexedDB) e não SQLite nativo

| Critério | **Dexie 4.4.6** (escolhido) | `@capacitor-community/sqlite` |
|---|---|---|
| Instalação | `npm i dexie` só | pacote + plugin nativo + `cap sync` |
| Roda no navegador de teste | ✅ idêntico | ❌ só em WebView/emulador |
| Precisa Android Studio para validar | ❌ não | ✅ sim |
| Volume de dados (58 questões / ~26 KB) | trivial | exagerado |
| Funciona no APK sem mudança | ✅ | ✅ |

Regra adotada: **a solução mais simples que resolve o problema inteiro.**
Dexie é JavaScript puro — o mesmo código roda no Chrome de teste, no dev server
e no WebView do APK.

## 7.2 Arquitetura: um único ponto de troca

```
páginas / componentes / services
              │
              ▼
   services/api.js ──── MODE=local (padrão) ──► offline/localApi.js
              │                                       │
              │ MODE=http                             ▼
              ▼                                IndexedDB (Dexie)
           fetch() ──► backend Express              "egg_offline"
```

`localApi.js` recebe **exatamente os mesmos caminhos** que o Express expunha e
os resolve contra o banco local:

| Área | Rotas atendidas localmente |
|---|---|
| Auth | `POST /auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` |
| Perfil | `GET` / `PATCH /user` |
| Conteúdo | `GET /subjects`, `/subjects/:id`, `/trails`, `/trails/:id` |
| Prática | `GET /questions/practice`, `POST /questions/:id/answer` |
| Gamificação | `GET /achievements`, `/daily-challenge`, `/ranking`, `/dashboard` |
| Estatísticas | `GET /stats` |
| Admin (exige `ADMIN`) | `/admin/overview`, `/admin/users[/:id/role]`, `/admin/subjects[/:id]`, `/admin/topics[/:id]`, `/admin/questions[/:id]`, `/admin/trails[/:id]` |

**Nenhuma página foi alterada.** Só `services/api.js` (e a chamada de recuperação
de senha) mudou.

## 7.3 Regras de negócio que migraram para o front

Todas portadas de `backend/src/services/*` para `frontend/src/offline/*`:

- **XP por questão** — `practice.js` (10 / 20 / 30 certas conforme dificuldade, 2 erradas).
- **Nível progressivo** — `gamification.js::xpRequiredForLevel` = `100×(L−1) + 50×(L−1)×(L−2)/2` → `0, 100, 250, 450, 700…`
- **Sequência diária (streak)** — `gamification.js::computeStreak` (quebra ao pular 1 dia, zera ao pular 2).
- **Desafio diário** — `gamification.js` (4 templates rotativos por data, progresso por dia, +50 XP).
- **Conquistas** — `gamification.js::evaluateAchievements` (16 badges).
- **Estatísticas / recomendação / ranking** — `stats.js`.
- **Trilhas com destravado progressivo** — `trails.js` + `practice.js`.
- **Login/sessão local** — `auth.js` (token `local.<payload>` no `localStorage`).
- **Ranking local** — `stats.js::getRanking` (geral e semanal, apurado por XP do mês).

## 7.4 Primeiro acesso e conta admin

`offline/seed.js` roda **uma vez**, dentro de `ensureSeeded()`:

1. Cria as 17 tabelas Dexie (o schema **v2** já nasce com todos os índices usados pelos `.where()`).
2. Importa `frontend/src/data/seed.json` (7 disciplinas, 22 assuntos, 58
   questões com alternativas, 16 conquistas, 5 trilhas, 16 etapas).
3. Grava a flag `meta/seeded = 1` para não repetir.
4. Garante a conta administradora local.

```bash
# Conta admin local (é o mesmo par que a tela de login já mostra)
#   e-mail : admin@egg.com
#   senha  : admin123
```

Para **recomeçar do zero** (apagar tudo e popular de novo) — funcionalidade de
desenvolvimento, execute no Console do navegador (F12 → Application → Console):

```js
indexedDB.deleteDatabase("egg_offline"); location.reload()
```

> ⚠️ Isso apaga **contas e progresso** do aparelho.

## 7.5 Recuperação de senha sem e-mail

Não existe caixa de entrada no modo offline, então o fluxo é local:

1. `POST /auth/forgot-password` cria um token de uso único (validade 30 min).
2. Como não há e-mail para enviar o link, `authService.forgotPassword` leva o
   usuário **direto** para `/reset-password/<token>`.
3. `POST /auth/reset-password` valida o token, grava o novo hash e o apaga.

Se o e-mail não existir, a resposta é genérica (não revela se há conta).

## 7.6 Como voltar ao modo online (legado)

```bash
# frontend/.env.production  (ou .env para o dev)
REACT_APP_DATA_MODE=http
REACT_APP_API_URL=http://192.168.15.9:3000
```

Sem essa variável o app fica em `local`. Só troque se quiser voltar ao
modelo cliente-servidor das seções 3 a 5.

## 7.7 Verificação executada

`npx eslint src` → **0 problemas** · `CI=true npx react-scripts build` →
**Compiled successfully** · `npx cap sync android` → **Sync finished** ·
`./gradlew assembleDebug` → **BUILD SUCCESSFUL in 3m 6s**.

Suíte E2E via Chrome DevTools Protocol (33 asserções, todas ✅):

| Verificação | Resultado |
|---|---|
| Cadastro → token local emitido (`local.…`) | ✅ |
| Dashboard renderiza com seed, sem erro de runtime | ✅ |
| Overflow horizontal em 390 px | ✅ `390 vs 390` |
| Responder questão → **XP +2**, **streak 1**, **1 conquista** | ✅ |
| Ranking, trilhas e conquistas com **rede OFFLINE** | ✅ |
| Login `admin@egg.com` / `admin123` + painel admin | ✅ |
| CRUD admin: criar questão → aparece → excluir → some | ✅ `total=58` |
| **Requisições `fetch`/`XHR` durante toda a sessão** | ✅ **0** |
| Dependências externas | ✅ só Google Fonts (decorativo; falha sem internet e cai pra fonte do sistema) |

> A única requisição externa é o CSS do Google Fonts. **Não é dependência de
> dados** — sem internet o app funciona normalmente, apenas com a fonte padrão
> do sistema. Para eliminar 100% das requisições, troque por uma fonte local
> ou remova o `<link>` do `frontend/public/index.html`.

---

# 8. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| *"Não foi possível conectar ao servidor"* | IP errado / firewall | Teste `http://192.168.15.9:3000/health` no navegador do **celular**; libere as portas **3000 e 8000** no firewall |
| Página do celular carrega mas a API não responde | porta 8000 (front) liberada e a 3000 (API) não, ou dev server sem proxy | `curl http://192.168.15.9:8000/health` no PC — se vier HTML em vez de `{"status":"ok"}`, o `proxy` do `package.json` não está sendo lido (reinicie o `npm start`) |
| Aparece `net::ERR_CONNECTION_REFUSED` só no celular | PC e celular em redes/Wi-Fi diferentes | Confira com `ipconfig` se o IP continua `192.168.15.9` |
| `net::ERR_CLEARTEXT_NOT_PERMITTED` | `cleartext` desativado | Confira `server.cleartext: true` e rode `npx cap sync android` |
| `Blocked loading request from origin 'https://localhost'... mixed content` | API em `http` | Confira `android.allowMixedContent: true` |
| `blocked by CORS policy` | CORS travado | Remova `CORS_ORIGINS` do `.env` ou adicione a origem |
| `REACT_APP_API_URL` não pega o IP novo | build cacheado | `npm run build` de novo + `npx cap sync` |
| Tela branca ao abrir | `webDir` errado ou sem build | `npm run cap:sync` |
| Rota interna dá 404 no app | — | Não deve acontecer: o Capacitor serve o `index.html` automaticamente (`html5mode` é **padrão `true`**) |
| Botão voltar não faz nada | listener não registrado | Confira `Capacitor.getPlatform() === "android"` e o hook no `Layout` |
| `SDK location not found` | Android Studio sem SDK | SDK Manager → instale uma Platform API 24+ |
| `JAVA_HOME is not set` | — | Não instale JDK manualmente; abra pelo Android Studio (ele gerencia o JDK) |
| `Execution failed for task ':app:...'` | cache do Gradle | `cd frontend/android && ./gradlew clean` |
| `adb: command not found` | PATH | Reabra o VS Code após instalar o Android Studio |

---

# 9. Publicando ( APK / AAB )

## 9.1 APK debug — já gerado neste repositório ✅

```bash
cd frontend
npm run build                 # build de produção
npx cap sync android          # copia build/ → android/app/src/main/assets/public

export JAVA_HOME="C:/Users/Gustavo Cabral/AppData/Local/opencode-android/jdk/jdk-21.0.12.1+1"
export ANDROID_HOME="C:/Users/Gustavo Cabral/AppData/Local/opencode-android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

cd android
./gradlew assembleDebug --no-daemon
```

**Saída:**

```
frontend/android/app/build/outputs/apk/debug/app-debug.apk     (4,9 MB)
```

Instalar no celular (com depuração USB ligada):

```bash
"$ANDROID_HOME/platform-tools/adb" install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

> O `.apk` debug **não exige keystore** e instala direto — é o indicado para
> entregar o trabalho. Como o app é offline, ele funciona **sem internet nenhuma**
> depois de instalado.

## 9.2 APK/AAB de release (Google Play)

```bash
cd frontend && npm run cap:sync     # build + sync

cd android
./gradlew assembleRelease           # APK → android/app/build/outputs/apk/release/
./gradlew bundleRelease             # AAB → android/app/build/outputs/bundle/release/
```

- O **APK de release** precisa de uma **keystore assinada** (o debug usa a keystore do Android Studio).
- No modo offline **não** é preciso trocar para HTTPS nem remover `cleartext`:
  não existe chamada de rede. Só faça isso se voltar ao modo `http` (seção 7.6).

---

# 10. Checklist rápido do dia a dia

## 🟢 Rota rápida — offline, sem backend e sem Android Studio

```bash
cd frontend && npm start

# No navegador: http://localhost:8000
# (REACT_APP_DATA_MODE não está definido → fica no modo local)
```

Não há segundo terminal: o backend não participa. Banco e conteúdo nascem sozinhos no primeiro acesso.

## 🟠 Rota completa — gerar o app instalável

```bash
# 1) Só o front (o backend é opcional no modo offline)
cd frontend && npm run cap:sync

# 2) APK debug pelo terminal — sem Android Studio
export JAVA_HOME="C:/Users/Gustavo Cabral/AppData/Local/opencode-android/jdk/jdk-21.0.12.1+1"
export ANDROID_HOME="C:/Users/Gustavo Cabral/AppData/Local/opencode-android/sdk"
cd frontend/android && ./gradlew assembleDebug --no-daemon

# Saída: android/app/build/outputs/apk/debug/app-debug.apk

# 3) Ou abrir o Android Studio
cd frontend && npx cap open android
```

---

## 📁 Estrutura final

```
EGG-main/
├── GUIA_MOBILE.md              ← este arquivo
├── backend/                    ← OPCIONAL: só usado com REACT_APP_DATA_MODE=http
│   └── src/
│       ├── app.js              ← CORS configurável
│       └── server.js           ← 0.0.0.0 + impressão de IP
└── frontend/
    ├── .env.development        ← vazio (usa o proxy do CRA no dev)
    ├── .env.production         ← REACT_APP_API_URL (IP da rede, só no modo http)
    ├── capacitor.config.json   ← config do app
    ├── android/                ← projeto nativo (commitável)
    │   └── app/build/outputs/apk/debug/app-debug.apk   ← APK gerado (4,9 MB)
    ├── public/index.html       ← viewport-fit=cover, zoom bloqueado
    └── src/
        ├── data/seed.json      ← conteúdo embutido (7 disciplinas / 58 questões)
        ├── offline/            ← ★ banco local + regras de negócio (seção 7)
        │   ├── db.js           ← schema Dexie (17 tabelas, v2)
        │   ├── seed.js         ← cria tabelas + semeia + conta admin
        │   ├── localApi.js     ← roteador: mesmas rotas do Express, sem rede
        │   ├── auth.js         ← login/sessão/perfil local
        │   ├── practice.js     ← questões + resposta + XP + streak + conquistas
        │   ├── gamification.js ← XP, nível, sequência, desafio, conquistas
        │   ├── stats.js        ← estatísticas, recomendação, ranking
        │   ├── trails.js       ← trilhas com destravado progressivo
        │   ├── subjects.js     ← disciplinas
        │   ├── admin.js        ← CRUD do painel administrador
        │   └── sha256.js       ← hash de senha (sem crypto.subtle)
        ├── services/api.js     ← ★ ponto único: local (padrão) ou http
        ├── hooks/useBackButton.js
        ├── index.css           ← safe area, UX nativa, anti-zoom
        └── components/Layout.jsx
```

> O `frontend/android/` **deve ser versionado** (o `.gitignore` do template já exclui
> os artefatos gerados: `build/`, `local.properties`, `app/src/main/assets/public`).
