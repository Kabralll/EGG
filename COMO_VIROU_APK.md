# 📦 Como o site EGG virou um aplicativo Android (APK)

> **Guia pedagógico da transformação Web → Android**
> Para quem já conhece o projeto web (React, frontend, backend, APIs, npm)
> e quer entender **o que foi feito depois**, passo a passo.

---

## Resposta em uma frase

> **Ninguém reescreveu nada.**
> A gente pegou o site que já funcionava, transformou ele em arquivos estáticos
> (igual faria pra colocar num servidor) e **enfiou esses arquivos dentro de uma
> "casaca" Android**. O app no celular é literalmente o mesmo JavaScript que roda
> no navegador.

---

## Índice

1. [O ponto de partida](#1-o-ponto-de-partida)
2. [Qual tecnologia foi usada — e como ter certeza](#2-qual-tecnologia-foi-usada--e-como-ter-certeza)
3. [O fluxo completo](#3-o-fluxo-completo)
4. [O `npm run build`](#4-o-npm-run-build)
5. [O Capacitor em nível de mecanismo](#5-o-capacitor-em-nível-de-mecanismo)
6. [A pasta `android/`](#6-a-pasta-android)
7. [Android Studio × Gradle](#7-android-studio--gradle)
8. [Como o APK foi gerado](#8-como-o-apk-foi-gerado)
9. [O caminho dos arquivos React até o APK](#9-o-caminho-dos-arquivos-react-até-o-apk)
10. [O que acontece quando você abre o app](#10-o-que-acontece-quando-você-abre-o-app)
11. [Comunicação com o backend](#11-comunicação-com-o-backend)
12. [O que mudou vs. o que não mudou](#12-o-que-mudou-vs-o-que-não-mudou)
13. [O que continuou igual](#13-o-que-continuou-igual)
14. [Nativo × Web empacotado nesta arquitetura](#14-nativo--web-empacotado-nesta-arquitetura)
15. [Diagrama final da arquitetura](#15-diagrama-final-da-arquitetura)
16. [Os comandos, na ordem](#16-os-comandos-na-ordem)
17. [Resposta direto à pergunta principal](#17-resposta-direto-à-pergunta-principal)

---

## 1. O ponto de partida

Já existia tudo pronto:

| Parte | Estado |
|---|---|
| `frontend/` | React 19 + CRA (`react-scripts`) + Tailwind, funcionando |
| `backend/` | Express + Prisma + MySQL, funcionando |
| Acesso | rodava no navegador sem problema |

**A pergunta era:** como transformar isso num `.apk` instalável?

**Resposta do processo inteiro:**

```text
código React  →  build estático  →  copiar pra pasta Android  →  compilar  →  APK
```

Nada além disso. Não teve reescrita.

---

## 2. Qual tecnologia foi usada — e como ter certeza

Foi **Capacitor 8.5.2** (da Ionic).

Isso não é achismo — dá pra confirmar lendo os arquivos:

| Se fosse... | Estaria assim... | O que temos no projeto |
|---|---|---|
| **Capacitor** ✅ | `capacitor.config.json` + pastas `@capacitor/*` no `package.json` | **bate exato** |
| React Native | `metro.config.js`, `index.js` com `AppRegistry` | não existe |
| PWA / TWA | arquivo `assetlinks.json` pra instalar pela Play Store | não existe |
| Cordova puro | `cordova_plugins.js` com conteúdo | existe mas **vazio (0 bytes)** — é só a camada de compat que o Capacitor sempre gera |
| Android Studio direto | Studio instalado no PC | **Android Studio nem está instalado** |

### Pacotes instalados

```bash
@capacitor/core          # o coração
@capacitor/cli           # o comando "cap"
@capacitor/android       # o "molde" do projeto Android
@capacitor/app           # botão voltar, sair do app
@capacitor/keyboard      # controle do teclado nativo
@capacitor/splash-screen # tela de abertura
dexie                    # banco de dados local (modo offline)
```

### Por que Capacitor e não React Native?

Porque **React Native não roda React web**. Ele exige reescrever a interface toda
(trocar `<div>` por `<View>`, CSS por `StyleSheet`, `react-router` por navegação
nativa...).

O Capacitor faz o oposto: ele **não olha pro seu código**. Ele só pergunta:

> *"Cadê a pasta com o site pronto?"*

E você responde numa linha:

```jsonc
// frontend/capacitor.config.json
{
  "appId": "br.com.egg.app",   // nome do pacote no Android
  "appName": "EGG",            // texto no ícone
  "webDir": "build",           // ← A ÚNICA COISA QUE ELE PRECISA SABER
  "server": { "androidScheme": "https", "cleartext": true },
  "android": { "allowMixedContent": true },
  "plugins": { "SplashScreen": {...}, "Keyboard": {...} }
}
```

Essa linha `webDir` é **a ponte inteira** entre o React e o Android.

---

## 3. O fluxo completo (o real)

```text
  frontend/src/                      ← seu código React
       │
       │  npm run build
       ▼
  frontend/build/                    ← site "empacotado" (HTML + CSS + JS)
       │
       │  npx cap sync android       ← COPIA pro projeto Android
       ▼
  frontend/android/                  ← projeto Android (gerado pelo Capacitor)
       │
       │  ./gradlew assembleDebug    ← compila o Android
       ▼
  app-debug.apk                      ← 4,9 MB, pronto pra instalar
       │
       │  copiar pro celular + tocar
       ▼
  Celular
```

**Cada seta = um comando.** Cada etapa será detalhada nas próximas seções.

---

## 4. O `npm run build`

```bash
npm run build     # roda react-scripts build
```

**Gera a pasta `frontend/build/`**
(atenção: o CRA usa `build`, **não** `dist/`).

```text
build/
├── index.html                          1,3 KB
├── static/js/main.77d9c9ac.js         555 KB   ← todo o app num arquivo só
├── static/css/main.6030cfc4.css        47 KB
├── static/js/551.7cebb104.chunk.js     lazy chunk
├── *.map, manifest.json, favicon.ico, logo192/512, robots.txt
```

Esse `main.77d9c9ac.js` tem **tudo junto**: React, suas páginas, Tailwind,
React Router, Dexie, regras de negócio — todo minificado.

### Por que isso é necessário pro mobile?

Porque o Android **não sabe o que é JSX, npm ou webpack**. Ele só entende três
coisas: `HTML`, `CSS` e `JS` puros.

O build serve como **tradutor**: transforma o código-fonte numa versão que
qualquer navegador — ou qualquer WebView — consegue ler.

### Esses arquivos vão pro app?

**Sim, 100%.** Não tem filtro nem seleção. Tudo que está em `build/` vai pro APK.

### Como o Capacitor utiliza essa saída?

Pela chave `"webDir": "build"` do `capacitor.config.json`.
Se mudasse pra `"webDir": "dist"`, o `cap sync` procuraria `dist/` e daria erro.

### Houve alteração na configuração de build pro mobile?

**Não.** Nenhum plugin, nenhuma config de webpack, nenhuma variável de ambiente
nova obrigatória. As **únicas** mexidas foram meta-tags no `public/index.html`:

```html
<!-- Pra funcionar o recorte do notch e a barra de gestos -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1,
               user-scalable=no, viewport-fit=cover" />

<!-- Evita flash branco/escuro na abertura -->
<meta name="color-scheme" content="light" />

<!-- Cor da status bar -->
<meta name="theme-color" content="#f97316" />

<!-- Comportamento de app (iOS) -->
<meta name="mobile-web-app-capable" content="yes" />
```

> **`viewport-fit=cover`** é condição obrigatória pra `env(safe-area-inset-*)`
> (o recorte do notch) funcionar.

---

## 5. O Capacitor em nível de mecanismo

### A analogia principal

Pense no Capacitor como uma **mudança de endereço**, não como uma tradução.

> Você continua morando na mesma casa (o código React). O Capacitor só
> constrói um **prédio novo** com uma janela gigante (a WebView) e coloca
> a sua casa dentro.

### O que ele faz (3 coisas)

| # | O que faz | Evidência |
|---|---|---|
| 1 | **Cria o projeto Android** (um molde) | `npx cap add android` → gera `frontend/android/` |
| 2 | **Copia o site** pra dentro desse projeto | `npx cap sync` → `build/` vai parar em `android/.../assets/public/` |
| 3 | **Conecta JS ↔ Android** (ponte) | registra os plugins Java que o JS pode chamar |

### E o que ele NÃO faz?

Aqui mora a maior confusão:

- ❌ **Não converte React pra Java/Kotlin** — seu JS continua sendo JS dentro do APK
- ❌ **Não compila seu código** — isso é trabalho do `react-scripts`
- ❌ **Não faz bundling** — também é do webpack
- ❌ **Não fornece a tela** — quem renderiza é a WebView do próprio celular
- ❌ **Não gerencia roteamento** — o `react-router` continua mandando

### Então o que é a WebView?

É um **navegador embutido no Android**, invisível. Todo app feito com Capacitor é,
por baixo, um site rodando num navegador escondido.

A diferença entre "site" e "app" aqui é só: o navegador está dentro de um ícone
na tela do celular, abre em tela cheia, sem barra de endereço.

### Onde o código React continua existindo?

Dentro do APK, em:

```text
assets/public/static/js/main.77d9c9ac.js   →  555.017 bytes
```

Como **arquivo de asset** — não como código compilado.

### Como o bundle é carregado?

```text
MainActivity (3 linhas)
   └── BridgeActivity.onCreate()
         ├── cria a WebView (activity_main.xml)
         ├── lê assets/capacitor.config.json
         ├── registra os plugins de capacitor.plugins.json
         └── webView.loadUrl("https://localhost/")
                    │
                    ▼
         WebViewLocalServer lê de assets/public/
                    │
                    ▼
         index.html  →  <script src="/static/js/main.js">
```

### Como a WebView participa

Ela é o **container de renderização**. Todo HTML/CSS/JS é interpretado pelo
Chromium do aparelho.

`androidScheme: "https"` significa que a origem é `https://localhost` — e isso
importa por dois motivos:

1. em contexto "seguro" algumas APIs do navegador ficam disponíveis;
2. qualquer chamada pra `http://` seria **mixed content bloqueado** → por isso
   existe `allowMixedContent: true`.

### Como o web conversa com a API nativa

```text
JS:    import { App } from "@capacitor/app"
       App.addListener("backButton", cb)
          │
          ▼  ponte injetada pelo Capacitor no WebView
Java:  com.capacitorjs.plugins.app.AppPlugin
          │
          ▼
Android: OnBackPressedDispatcher (botão voltar)
```

**No projeto isso aparece em `src/hooks/useBackButton.js`:**

```js
// O evento 'backButton' só existe no Android
if (Capacitor.getPlatform() !== "android") return

App.addListener("backButton", ({ canGoBack }) => {
  if (menuAberto)              { fechaMenu(); return }
  if (emRotaDeSaida || !canGoBack) App.exitApp()   // fecha o app
  else navigate(-1)                                // volta uma tela
})
```

### Como o projeto Android foi criado

A partir de um template que já vem dentro do pacote `@capacitor/android`.

Prova de que é gerado (e não escrito à mão):

```groovy
// android/capacitor.settings.gradle
// DO NOT EDIT THIS FILE! IT IS GENERATED EACH TIME "capacitor update" IS RUN
```

> "Não edite este arquivo — ele é regerado a cada sync."

---

## 6. A pasta `android/`

### Estrutura e pra que serve cada parte

```text
frontend/android/
│
├── capacitor.config.json      ← NÃO EDITAR (cópia da config da raiz)
├── capacitor.settings.gradle  ← NÃO EDITAR (liga os plugins ao Gradle)
├── settings.gradle            ← lista os módulos do projeto
├── build.gradle               ← de onde baixar as bibliotecas
├── variables.gradle           ← versões do Android (min 24 / alvo 36)
├── gradlew / gradlew.bat      ← o "botão de build" (wrapper do Gradle)
├── local.properties           ← ONDE ESTÁ O SDK (não é versionado)
│
└── app/
    ├── build.gradle           ← applicationId, versão, dependências
    ├── capacitor.build.gradle ← NÃO EDITAR (Java 21 + deps dos plugins)
    │
    └── src/main/
        ├── AndroidManifest.xml           ← IDENTIDADE do app
        ├── java/br/com/egg/app/
        │       MainActivity.java         ← ponto de entrada (3 linhas!)
        │
        ├── assets/
        │   ├── capacitor.config.json     ← config dentro do app (gerada)
        │   ├── capacitor.plugins.json    ← mapeia JS → classes Java
        │   └── public/                   ← ★ AQUI FICA O SEU SITE ★
        │       ├── index.html            (1.311 B)
        │       ├── cordova.js            (0 B — placeholder)
        │       └── static/{js,css}/...
        │
        └── res/
            ├── values/strings.xml        ← nome "EGG"
            ├── values/styles.xml         ← tema + splash
            ├── layout/activity_main.xml  ← um <WebView> tela cheia
            ├── drawable*/splash.png      ← telas de abertura
            ├── mipmap-*/ic_launcher*.png ← ícones (padrões do Capacitor)
            └── xml/{config.xml,file_paths.xml}
```

### Perguntas diretas

| Pergunta | Resposta |
|---|---|
| Onde ficam as configurações do app? | `frontend/capacitor.config.json` |
| Onde está o `AndroidManifest.xml`? | `android/app/src/main/AndroidManifest.xml` |
| Onde ficam as configs do Gradle? | `android/build.gradle` + `android/app/build.gradle` + `variables.gradle` |
| Onde ficam os recursos (ícone, splash)? | `android/app/src/main/res/` |
| Qual é a Activity principal? | `android/app/src/main/java/br/com/egg/app/MainActivity.java` |
| Como o Capacitor inicializa? | `MainActivity` → `extends BridgeActivity` |

### O MainActivity — o coração da coisa

```java
package br.com.egg.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
```

**Três linhas, sendo que uma é chave.** Essa é a prova visual de que nada foi
reescrito.

`BridgeActivity` é uma classe **pronta, escrita pela equipe do Capacitor**
(ela mora dentro do seu `node_modules`). Ela que cria a WebView e carrega o
nosso site. O nosso código só "a usa".

### O Manifest — a identidade do app

```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"      <!-- "EGG" -->
    android:theme="@style/AppTheme">

  <activity
      android:name=".MainActivity"
      android:configChanges="orientation|keyboardHidden|keyboard|screenSize|..."
      android:launchMode="singleTask"
      android:exported="true">
    <intent-filter>
      <action android:name="android.intent.action.MAIN"/>        <!-- app principal -->
      <category android:name="android.intent.category.LAUNCHER"/> <!-- aparece no menu -->
    </intent-filter>
  </activity>

  <uses-permission android:name="android.permission.INTERNET"/>
</application>
```

Sem o trecho `MAIN` + `LAUNCHER`, **não existiria ícone** na tela do celular.

Perceba: só **UMA** permissão (`INTERNET`). Nada de câmera, localização, contatos.

Detalhes relevantes:

- `configChanges` inclui `orientation|screenSize|...` → a Activity **não é
  recriada ao girar a tela**; quem lida com a rotação é a WebView.
- **Não existe** `android:screenOrientation` → **nenhuma trava de orientação**.

### O que pode editar vs. o que NÃO pode

| ✅ Pode editar | ❌ Não pode (é regerado a cada `cap sync`) |
|---|---|
| `capacitor.config.json` (raiz) | `capacitor.settings.gradle` |
| `AndroidManifest.xml` | `app/src/main/assets/public/` |
| `app/build.gradle` | `assets/capacitor.config.json` |
| `res/values/strings.xml` | `assets/capacitor.plugins.json` |
| ícones e splash em `res/` | `app/capacitor.build.gradle` |
| `MainActivity.java` | `capacitor-cordova-android-plugins/` |

Tudo da coluna da direita já está no `.gitignore` do `android/` — ou seja,
**não é versionado**, é sempre reconstruído.

---

## 7. Android Studio × Gradle

### 🚨 Surpresa: o Android Studio NÃO foi usado

Dá pra provar:

```text
C:/Program Files/Android/Android Studio      →  NÃO EXISTE
C:/Users/.../AppData/Local/Android/Sdk       →  NÃO EXISTE (é onde o Studio instala)
C:/Users/.../AppData/Local/opencode-android/ →  EXISTE (SDK instalado à mão)
```

E o `local.properties` confirma:

```properties
sdk.dir=C:\Users\...\opencode-android\sdk     ← caminho fora do padrão do Studio
```

### Então qual foi o papel de cada um?

| Ferramenta | O que é, em uma frase | Foi usada? |
|---|---|---|
| **Android Studio** | Um **editor gráfico** que *por acaso* chama o Gradle por você | ❌ **Não** |
| **Gradle** | A **máquina que realmente constrói** o app inteiro | ✅ **Sim, via terminal** |
| **JDK 21** | A "linguagem" que entende o código Java | ✅ Sim |
| **Android SDK** | As peças de Android (empacotador, instalador, etc.) | ✅ Sim |

**Analogia:**

- **Android Studio** = o *supervisor* que olha pra obra e aponta o que fazer
- **Gradle** = o *robô de fábrica* que de fato constrói

Neste projeto não teve supervisor. Foi direto na máquina:

```bash
export JAVA_HOME=".../opencode-android/jdk/jdk-21.0.12.1+1"
export ANDROID_HOME=".../opencode-android/sdk"

cd frontend/android
./gradlew assembleDebug --no-daemon
# BUILD SUCCESSFUL in 3m 6s   (183 actionable tasks)
```

### Toolchain provisionada

```text
opencode-android/
├── jdk/jdk-21.0.12.1+1/          ← JDK 21
└── sdk/
    ├── cmdline-tools/             ← gerenciador do SDK
    ├── build-tools/36.0.0/        ← empacotador + aapt2
    ├── platforms/android-36/      ← APIs do Android
    ├── platform-tools/            ← adb (instalar no celular)
    └── licenses/                  ← licenças aceitas
```

### O que o Gradle baixou

| Origem | Dependência |
|---|---|
| Google/Maven | `com.android.tools.build:gradle:8.13.0` (o "empacotador" / AGP) |
| Google/Maven | `androidx.appcompat:1.7.1` |
| Google/Maven | `androidx.coordinatorlayout:1.3.0` |
| Google/Maven | `androidx.core:core-splashscreen:1.2.0` |
| Google/Maven | `org.apache.cordova:framework:14.0.1` (compat, app nenhum usa) |
| Google/Maven | `androidx.test.*` (só pra testes) |
| **node_modules** | `:capacitor-android`, `:capacitor-app`, `:capacitor-keyboard`, `:capacitor-splash-screen` |

> Detalhe bonito: **o código nativo dos plugins não é baixado da internet.**
> Ele já vem dentro do seu `node_modules`, junto com tudo o mais — e é
> compilado a partir de lá.

O `google-services:4.4.4` **não foi aplicado** porque não existe
`google-services.json` (o `build.gradle` só registra um log e segue).

---

## 8. Como o APK foi gerado

**Comando:** `./gradlew assembleDebug --no-daemon`
**Saída:**

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk    4,9 MB
```

### O que dá pra conferir dentro dele (via `aapt2 dump badging`)

| Campo | Valor |
|---|---|
| Nome do pacote | `br.com.egg.app` |
| `versionName` | `1.0` |
| `versionCode` | `1` |
| Android mínimo (`minSdk`) | **24** → Android 7.0 |
| Android alvo (`targetSdk`) | **36** |
| `compileSdk` | 36 |
| Ícone / label | `EGG` |
| Activity inicial | `br.com.egg.app.MainActivity` |
| Permissões | só `INTERNET` |
| Arquivos no APK | **456** (total 12,6 MB) |
| Debugável? | sim |

### De onde vem cada configuração

| Config | Arquivo |
|---|---|
| `applicationId`, `versionCode`, `versionName` | `android/app/build.gradle` |
| `minSdk 24`, `compileSdk 36`, `targetSdk 36` | `android/variables.gradle` |
| permissões | `AndroidManifest.xml` |

### Debug × Release (neste projeto)

| | **debug** (o que foi feito) | **release** (não foi feito) |
|---|---|---|
| Comando | `assembleDebug` | `assembleRelease` / `bundleRelease` |
| Assinatura | automática (`~/.android/debug.keystore`) | ⚠️ **`build.gradle` não tem bloco `signingConfigs`** → sairia APK **não assinado** |
| Instala direto? | **sim** | não |
| Serve pra Play Store? | não | sim (com ajustes) |
| Minificação | não (`minifyEnabled false`) | `false` também |

**Conclusão:** o APK atual é perfeito pra **entregar e instalar no celular**,
mas ainda **não está pronto pra loja** (precisa de keystore e subir o
`versionCode`).

---

## 9. O caminho dos arquivos React até o APK

Esta é a parte mais importante — e é **simples**:

```text
src/
   │  npm run build   (webpack transforma tudo)
   ▼
build/
   │  main.77d9c9ac.js   →   555.017 bytes
   │
   │  npx cap sync       (COPIA, não converte)
   ▼
android/app/src/main/assets/public/
   │  main.77d9c9ac.js   →   555.017 bytes    ← MESMO arquivo
   │
   │  ./gradlew assembleDebug   (zip dentro do APK)
   ▼
app-debug.apk
      assets/public/static/js/main.77d9c9ac.js  →  555.017 bytes  ✓
```

**Mesmo nome, mesmo tamanho, nos 3 lugares.**
Não teve transformação nenhuma — só **cópia**.

### O papel exato de `android/app/src/main/assets/public/`

É o **endereço do seu site dentro do app**.

Quando o celular abre o app, a WebView vai até `https://localhost/`
(un endereço falso, só pra parecer um site) e **lê os arquivos de lá**.

E se o usuário abrir `meuapp.com/dashboard`?

A WebView **não acha** esse arquivo → então o Capacitor **entrega o
`index.html`** mesmo assim → e o React Router assume o controle.

**É por isso que as rotas funcionam sem servidor.**

> ⚠️ **Armadilha clássica:** essa pasta **não é versionada** (está no
> `.gitignore`). Se você rodar `npm run build` e **esquecer** o `cap sync`,
> o APK fica com os arquivos **antigos** — o Gradle não faz ideia de que
> `frontend/src/` existe. É o erro mais comum dessa stack.

---

## 10. O que acontece quando você abre o app

```text
1. Você toca no ícone "EGG"
        │
        ▼
2. O Android procura a Activity com etiqueta LAUNCHER
   → br.com.egg.app.MainActivity
        │
        ▼
3. MainActivity roda (3 linhas)
   → chama BridgeActivity
        │
        ▼
4. O Bridge cria a WebView (navegador invisível)
   e lê a config: "webDir = build"
        │
        ▼
5. A WebView abre https://localhost/
   → o Capacitor serve os arquivos de assets/public/
        │
        ▼
6. index.html carrega <script src="/static/js/main.js">
        │
        ▼
7. O JavaScript executa → React monta <div id="root">
        │
        ▼
8. O React Router lê a URL e mostra a tela certa
        │
        ▼
9. O app está no ar
```

### Detalhes

- **Primeiro código nativo executado:** `MainActivity` → `BridgeActivity.onCreate()`
- **De onde vêm os arquivos web:** de dentro do APK (`assets/public/`)
- **Como funcionam as rotas:** o Capacitor entrega `index.html` pra qualquer
  caminho → o `BrowserRouter` (que já usávamos no site) **funciona igualzinho**,
  sem mudar uma linha
- **Persistência:** o `localStorage` (token) e o `IndexedDB` (banco local)
  funcionam normalmente dentro da WebView

### E as chamadas de API?

Aqui tem uma decisão importante:

```js
// services/api.js
export const MODE = process.env.REACT_APP_DATA_MODE || "local"

if (MODE !== "http") {
  return await localApi(path, options)   // ← vai pro banco local (IndexedDB)
}
res = await fetch(BASE_URL + path, ...)  // ← chamada de rede (só se MODE=http)
```

Como **nenhum `.env` define** `REACT_APP_DATA_MODE`, ele fica no **default
`"local"`**.

**Resultado: o APK não faz NENHUMA chamada de rede.** Os dados vêm do
IndexedDB do próprio celular. Testado: **0 requisições `fetch`/`XHR`** durante
toda a sessão de teste.

---

## 11. Comunicação com o backend

### O problema do "localhost" — foi relevante?

**Sim, e é o problema clássico** da stack mobile:

| Onde | O que `localhost` significa |
|---|---|
| No seu PC | o seu PC ✅ |
| No celular | **o celular** ❌ |

Se o app dissesse "chama `localhost:3000`", ele tentaria conectar **nele mesmo**.

### Caminho A — conectar pela rede local (configurado, mas não é o padrão)

**1. `.env.production`:**
```properties
REACT_APP_API_URL=http://192.168.15.9:3000    ← IP fixo do PC na Wi-Fi
```

> O build embute o IP **fixo**, porque o Capacitor **não tem proxy** (o
> `proxy` do CRA só vale no dev server).

**2. `.env.development`:**
```properties
REACT_APP_API_URL=          ← VAZIO de propósito
```
Caminhos relativos passam pelo proxy do CRA (só no dev), permitindo abrir
pelo celular em `http://<IP>:8000` sem CORS.

**3. Backend precisou mudar (`server.js`):**
```js
// antes: app.listen(port)      → só o próprio PC (loopback)
app.listen(port, "0.0.0.0", …)  → aceita conexão da rede local
// + imprime os IPs da máquina no console
```

**4. Backend precisou mudar (`app.js`) — CORS:**
```js
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "").split(",")
app.use(cors(corsOptions))
// vazio ou "*" → libera tudo (comportamento do app mobile)
// exemplo de travamento sugerido no próprio comentário do código:
//   CORS_ORIGINS=capacitor://localhost,https://localhost,http://localhost:8000
```

**5. Capacitor precisou liberar HTTP:**
```jsonc
"server":  { "androidScheme": "https", "cleartext": true },
"android": { "allowMixedContent": true }
```

- Origem do app = `https://localhost` → chamar `http://192.168.15.9:3000` seria
  **mixed content bloqueado** → `allowMixedContent` resolve
- `cleartext` → permite tráfego HTTP simples (Android 9+ bloqueia por padrão)

### Caminho B — modo offline (**é o que está no APK**)

Como `REACT_APP_DATA_MODE` não está definido, o default é `local`:

```text
api()  →  localApi()  →  IndexedDB ("egg_offline")
```

| Pergunta | Resposta |
|---|---|
| Precisa de internet? | **Não** |
| Precisa do backend ligado? | **Não** |
| Precisa de firewall? | **Não** |
| CORS? | não se aplica |
| IP / hostname? | não existe |
| URL de API no APK? | **nenhuma é usada** |
| HTTP vs HTTPS? | irrelevante no modo `local` |

O backend continua aí, funcionando pro site normalmente. **O app simplesmente
não o usa.**

### O Google Fonts

A **única** requisição externa que o app faz é o CSS da fonte Inter:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:..." rel="stylesheet">
```

**Não é dependência de dados.** Sem internet o app funciona normalmente — só
usa a fonte padrão do sistema. (Se quiser eliminar 100% das requisições,
remova esse `<link>` ou use uma fonte local.)

---

## 12. O que mudou vs. o que não mudou

### Antes (só site)

```text
frontend/  →  navegador  →  backend
```

### Depois (site + app)

```text
frontend/  →  navegador  →  backend
     │
     └──→  build/  →  android/  →  APK  →  WebView  →  IndexedDB (offline)
```

### Arquivos novos (`git status`: `??`)

| Arquivo | Pra que |
|---|---|
| `frontend/capacitor.config.json` | liga React ↔ Android |
| `frontend/android/` | o projeto Android inteiro |
| `frontend/.env.development` / `.env.production` | endereço da API por ambiente |
| `frontend/src/hooks/useBackButton.js` | botão voltar do Android |
| `frontend/src/offline/` (12 arquivos) | banco local + regras de negócio |
| `frontend/src/data/seed.json` | conteúdo embutido (58 questões etc.) |
| `GUIA_MOBILE.md` | documentação |

### Arquivos alterados (`M`)

| Arquivo | Δ | O que mudou |
|---|---|---|
| `frontend/package.json` | deps+scripts | +6 pacotes Capacitor, +Dexie, +6 scripts `cap:*` |
| `frontend/public/index.html` | +12 | viewport, notch, tema, zoom |
| `frontend/src/index.css` | **+106** | safe area, anti-zoom, pull-to-refresh, `100dvh` |
| `frontend/src/components/Layout.jsx` | +26 | `useBackButton()`, `pt-safe`/`pb-safe` |
| `frontend/src/context/ToastContext.jsx` | — | toast sobe da status bar |
| `frontend/src/services/api.js` | +75/−28 | chave `MODE` local/http |
| `frontend/src/services/authService.js` | +12 | token local no fluxo de recuperação |
| `Dashboard/Achievements/Ranking/Admin*` | — | correção de overflow horizontal |
| `backend/src/app.js` | — | CORS configurável (mobile) |
| `backend/src/server.js` | — | `0.0.0.0` + impressão dos IPs |

### O que NÃO foi feito (pra não presumir)

- ❌ Ícones personalizados (usa os **padrão do Capacitor**)
- ❌ Splash customizado (só cor branca, sem spinner)
- ❌ Tela travada em retrato
- ❌ Permissões além de `INTERNET`
- ❌ Projeto iOS (`ios/` não existe)
- ❌ APK de release assinado (sem keystore)
- ❌ Live reload no build final
- ❌ **Nenhum arquivo Java/Kotlin escrito à mão**

---

## 13. O que continuou igual

| Parte | Mudou? |
|---|---|
| Componentes React | ❌ nada |
| Páginas | ❌ nada (só 1 ou 2 ajustes pontuais de layout) |
| React Router (`BrowserRouter`) | ❌ nada |
| Tailwind / PostCSS / `tailwind.config.js` | ❌ nada |
| Contextos (`AuthContext`, `ToastContext`) | ❌ nada |
| Assinatura das chamadas `api(path, {method, body, auth})` | ❌ nada — mudou só o que acontece **por dentro** |
| Backend | ❌ não refeito (2 ajustes pontuais) |
| Prisma + MySQL | ❌ nada |
| Fluxo de login (token no `localStorage`) | ❌ nada |
| ESLint + build | ✅ `npx eslint src` → 0 erros; build → Compiled successfully |

**É exatamente por isso que a migração foi possível.**
Não precisou reescrever em React Native nem em Kotlin — porque o Capacitor
**consome o site como ele está**.

---

## 14. Nativo × Web empacotado nesta arquitetura

### Realmente nativo (Android / Java)

```text
br.com.egg.app.MainActivity   extends BridgeActivity     (3 linhas)
:capacitor-android            Bridge, WebViewLocalServer (biblioteca Java)
:capacitor-app                AppPlugin     → botão voltar / exitApp
:capacitor-keyboard           KeyboardPlugin → teclado nativo
:capacitor-splash-screen      SplashScreenPlugin → tela de abertura
AndroidManifest.xml           launcher, configChanges, permissão INTERNET
res/values/styles.xml         tema + splash
res/drawable*/splash.png      imagens de splash
res/mipmap-*/ic_launcher*     ícones (padrão do template)
activity_main.xml             <WebView> ocupando a tela toda
Gradle + AGP                  build, dex, zip, assinatura
```

### Continua sendo código web (99% do app)

```text
Toda a interface (JSX + Tailwind)
Todas as regras de negócio (XP, nível, sequência, conquistas)
React Router
Banco de dados local (IndexedDB via Dexie)
Login / sessão
Painel administrador
Chamadas de rede (só se REACT_APP_DATA_MODE=http)
```

### Vantagens concretas desta arquitetura

- **Migração em horas**, não semanas — zero reescrita
- **Debug fácil** — o mesmo código abre no Chrome com DevTools (foi assim
  que os testes E2E foram feitos)
- **Mesmo código** pra site e app
- **Offline de verdade** — sem servidor, sem custo de infraestrutura
- **Atualização rápida** — trocar assets + `assembleDebug` é ~13 s incremental

### Limitações concretas

- **A WebView é a do fabricante** — performance e versão variam entre celulares
  (ex.: WebView antigo < 140 tinha bug de safe-area — há um comentário no
  `index.css` sobre isso)
- **APIs que a WebView não expõe** → foi o caso do `crypto.subtle`
  (indisponível em contexto não-seguro) — por isso o SHA-256 foi escrito
  **à mão em JavaScript puro** (`src/offline/sha256.js`)
- **Ainda não vai pra Play Store como está** — `debuggable=true`,
  `versionCode=1`, sem `signingConfigs`
- **Ícone e splash genéricos** — visual de "webview wrapper"
- **Google Fonts** é a única dependência externa (falha sem internet,
  cai pra fonte do sistema — só estético)

---

## 15. Diagrama final da arquitetura

```text
        ┌────────────────────────────────┐
        │   frontend/src/  (React 19)    │
        │   JSX · Tailwind · Router 7    │
        │   services/api.js → MODE       │
        │   offline/ (Dexie 4)           │
        └───────────────┬────────────────┘
                        │
                        │  npm run build
                        ▼
        ┌────────────────────────────────┐
        │   frontend/build/              │   ← webDir
        │   index.html                   │
        │   static/js/main.*.js  555 KB  │
        └───────────────┬────────────────┘
                        │
                        │  npx cap sync android   (COPIA)
                        ▼
        ┌────────────────────────────────┐
        │   frontend/android/            │
        │   ┌────────────────────────┐   │
        │   │ assets/public/ (cópia) │   │
        │   └────────────────────────┘   │
        │   MainActivity extends         │
        │       BridgeActivity           │
        │   AndroidManifest.xml          │
        │   app/build.gradle             │
        └───────────────┬────────────────┘
                        │
                        │  ./gradlew assembleDebug
                        │  JDK 21 + SDK (SEM Android Studio)
                        │  AGP 8.13.0 · Gradle 8.14.3
                        ▼
                 ┌──────────────┐
                 │ app-debug.apk│  4,9 MB · 456 arquivos
                 └──────┬───────┘
                        │  copiar pro celular + tocar
                        ▼
                   ┌──────────┐
                   │ Celular  │  minSdk 24 · targetSdk 36
                   └────┬─────┘
                        │  MAIN / LAUNCHER
                        ▼
              ┌───────────────────┐
              │  MainActivity     │
              │  → BridgeActivity │
              │  → Bridge         │
              └────────┬──────────┘
                       │  cria a WebView
                       ▼
              ┌───────────────────┐
              │  Android WebView  │
              │  https://localhost│
              │  lê assets/public/│
              │  fallback index   │
              └────────┬──────────┘
                       │  executa main.js
                       ▼
              ┌───────────────────┐
              │  React App        │
              │  BrowserRouter    │
              │  MODE = "local"   │  ← PADRÃO
              └────────┬──────────┘
                       │
                       ▼
              ┌───────────────────┐
              │  IndexedDB        │
              │  "egg_offline"    │   ← SEM BACKEND
              │  17 tabelas+seed  │      0 fetch/XHR
              └───────────────────┘

   … e apenas se REACT_APP_DATA_MODE=http (NÃO é o caso do APK):

              ┌───────────────┐          ┌──────────────────┐
              │  fetch        │ ───────► │  Backend Express │
              │  http://      │   LAN    │  Prisma · MySQL  │
              │  192.168.15.9 │          │  0.0.0.0 · CORS  │
              │  :3000        │          │                  │
              └───────────────┘          └──────────────────┘
```

---

## 16. Os comandos, na ordem

| # | Comando | O que ele fez |
|---|---|---|
| 1 | `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/keyboard @capacitor/splash-screen` | adicionou as dependências que ligam o projeto web ao Capacitor |
| 2 | `npm install dexie` | adicionou o banco IndexedDB local (modo offline) |
| 3 | `npx cap init "EGG" br.com.egg.app --web-dir build` | gerou o `capacitor.config.json` declarando `appId`, `appName` e **onde fica o site** |
| 4 | `npx cap add android` | criou a pasta `frontend/android/` inteira a partir do template |
| 5 | *(edições manuais)* | config (`cleartext`, `allowMixedContent`, splash, teclado), `index.html`, CSS, `useBackButton.js` |
| 6 | *(criação)* `src/offline/*` + `data/seed.json` | desacoplou o app do backend → roda 100% offline |
| 7 | *(backend)* `app.listen(port, "0.0.0.0")` + `cors(corsOptions)` | liberou a API na rede local (caminho `http`, não usado no APK) |
| 8 | Provisionar toolchain: JDK 21 + `sdkmanager` (`platform-tools`, `platforms;android-36`, `build-tools;36.0.0`) + `--licenses` | criou `opencode-android/{jdk,sdk}` **sem Android Studio** |
| 9 | `sdk.dir=...` em `android/local.properties` | apontou o Gradle pro SDK instalado à mão |
| 10 | `npm run build` | gerou `frontend/build/` (555 KB de JS) |
| 11 | `npx cap sync android` | copiou `build/` → `assets/public/` + gerou configs + registrou 3 plugins |
| 12 | `export JAVA_HOME=... ANDROID_HOME=...` | definiu a toolchain pro Gradle |
| 13 | `./gradlew assembleDebug --no-daemon` | **gerou o APK** (`BUILD SUCCESSFUL in 3m 6s`, 183 tasks) |
| 14 | `./gradlew assembleDebug` (2ª vez) | rebuild incremental em **13 s** (24 tasks, 159 up-to-date) |
| 15 | *(não usado)* `npx cap open android`, `cap run android`, `assembleRelease` | Android Studio ausente; release não gerado |

### Os 3 que realmente importam

```bash
cd frontend
npm run build                                  # site      → build/
npx cap sync android                           # build/    → pasta Android
cd android && ./gradlew assembleDebug          # pasta Android → APK
```

### Pra instalar no celular

```bash
"$ANDROID_HOME/platform-tools/adb" install -r \
  android/app/build/outputs/apk/debug/app-debug.apk
```

> ⚠️ O `adb devices` só lista o aparelho se a **Depuração USB** estiver
> ativa no celular. Sem isso, a alternativa é copiar o `.apk` pra pasta
> `Download` pelo cabo/WhatsApp e abrir no celular.

---

## 17. Resposta direto à pergunta principal

> ### *"Como exatamente esse projeto React virou um APK sem precisar reescrever o site inteiro?"*

**Porque o Capacitor não transformou a web em nativo — ele só a embalou.**

1. **`npm run build`** reduziu o React a **arquivos estáticos** — o mesmo
   que faria pra subir num servidor.

2. **`npx cap sync`** **copiou** esses arquivos pra dentro do projeto Android.
   O `.js` continua sendo exatamente o mesmo arquivo, byte a byte
   (555.017 bytes nos 3 níveis).

3. **`npx cap add android`** criou uma casaca Android cujo código tem
   **3 linhas**: `class MainActivity extends BridgeActivity {}`.

4. Essa `BridgeActivity` abre uma **WebView** (navegador invisível), serve
   `assets/public/` localmente e entrega `index.html` pra qualquer rota —
   é por isso que o React Router funciona **sem servidor**.

5. **`./gradlew assembleDebug`** — **sem Android Studio**, só terminal —
   zipou tudo, gerou o `.dex`, assinou com `debug.keystore` e produziu o
   `app-debug.apk`.

6. Como `REACT_APP_DATA_MODE` não está definido, o app roda no modo
   **`local`**: os dados vêm do IndexedDB, e a suíte de teste confirmou
   **0 requisições de rede**.

### O resultado em números

| Métrica | Valor |
|---|---|
| Arquivos Java/Kotlin escritos à mão | **0** (MainActivity tem 2 linhas de conteúdo) |
| Arquivos de configuração criados | **1** (`capacitor.config.json`) |
| Linhas de CSS pro mobile | **106** |
| Arquivos JS criados pro mobile | **1** (`useBackButton.js`) |
| Páginas React reescritas | **0** |
| Backend refeito | **0** (só 2 ajustes pontuais) |
| Requisições de rede no app | **0** (roda offline) |
| Tamanho do APK | **4,9 MB** |
| Testes E2E automatizados passando | **33/33** |

**Tradução curta:**

> O app no celular **é o mesmo site**, só que morando dentro de uma casaca
> Android, apontando pra um banco de dados local no lugar do servidor.

---

## Anexo — Comandos de verificação usados

```bash
# Lint e build do React
npx eslint src
CI=true npx react-scripts build

# Sincronizar com o projeto Android
npx cap sync android

# Gerar o APK
export JAVA_HOME=".../opencode-android/jdk/jdk-21.0.12.1+1"
export ANDROID_HOME=".../opencode-android/sdk"
cd android && ./gradlew assembleDebug --no-daemon

# Conferir o que está dentro do APK
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep assets/public

# Conferir as configurações embutidas
aapt2 dump badging app/build/outputs/apk/debug/app-debug.apk
```

### Documentos relacionados

- **`GUIA_MOBILE.md`** — guia operacional (comandos, troubleshooting, publicação)
- **`README.md`** — apresentação do projeto EGG
