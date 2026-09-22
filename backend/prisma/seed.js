import "dotenv/config"
import prisma from "../src/lib/prisma.js"

/*
  Seed do EGG — Educação Geral Gamificada
  Cria: disciplinas, assuntos, questões, conquistas, trilhas e conta administrativa.
  Roda automaticamente após `npx prisma migrate reset` ou manualmente com `node prisma/seed.js`.
  Não altera o progresso de usuários quando o conteúdo já existe.
*/

const questionIds = {} // chave -> id criado

async function createQuestion(topicId, q) {
  const created = await prisma.question.create({
    data: {
      statement: q.statement,
      explanation: q.explanation,
      difficulty: q.difficulty,
      grade: q.grade,
      topicId,
      options: {
        create: q.options.map((text, i) => ({
          text,
          isCorrect: i === q.correct,
        })),
      },
    },
  })
  questionIds[q.key] = created.id
}

const SUBJECTS = [
  {
    name: "Matemática",
    icon: "📐",
    color: "#6366f1",
    topics: [
      {
        name: "Porcentagem",
        questions: [
          {
            key: "porc1",
            statement:
              "Em uma loja, uma roupa que custava R$ 200,00 recebeu desconto de 15%. Qual é o valor final da peça?",
            options: ["R$ 170,00", "R$ 185,00", "R$ 160,00", "R$ 150,00"],
            correct: 0,
            explanation:
              "15% de 200 = 0,15 × 200 = 30. Logo, 200 − 30 = R$ 170,00. Em descontos, calcule a porcentagem e subtraia do valor original.",
            difficulty: "facil",
            grade: "9º ano",
          },
          {
            key: "porc2",
            statement:
              "Um produto custava R$ 250,00, teve aumento de 20% e, depois, desconto de 20% sobre o novo valor. Qual é o preço final?",
            options: ["R$ 240,00", "R$ 250,00", "R$ 230,00", "R$ 200,00"],
            correct: 0,
            explanation:
              "Aumento: 250 × 1,20 = 300. Desconto: 300 × 0,80 = 240. Os percentuais NÃO se anulam porque são aplicados sobre bases diferentes.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "porc3",
            statement: "Em uma turma de 40 alunos, 60% são meninas. Quantos meninos há na turma?",
            options: ["16", "24", "15", "10"],
            correct: 0,
            explanation:
              "Se 60% são meninas, 40% são meninos. 40% de 40 = 0,40 × 40 = 16 alunos.",
            difficulty: "media",
            grade: "8º ano",
          },
        ],
      },
      {
        name: "Equações",
        questions: [
          {
            key: "eq1",
            statement: "Resolva a equação: x + 7 = 15",
            options: ["x = 8", "x = 22", "x = 7", "x = 15"],
            correct: 0,
            explanation: "Isolando x: x = 15 − 7 = 8.",
            difficulty: "facil",
            grade: "7º ano",
          },
          {
            key: "eq2",
            statement: "Resolva a equação: 3x − 5 = 16",
            options: ["x = 7", "x = 5", "x = 21", "x = 11"],
            correct: 0,
            explanation:
              "3x = 16 + 5 → 3x = 21 → x = 21 ÷ 3 = 7. Confira: 3(7) − 5 = 16. ✓",
            difficulty: "media",
            grade: "8º ano",
          },
          {
            key: "eq3",
            statement: "Resolva a equação: 2(x − 3) = 4x + 2",
            options: ["x = −4", "x = 4", "x = −8", "x = 8"],
            correct: 0,
            explanation:
              "2x − 6 = 4x + 2 → −6 − 2 = 4x − 2x → −8 = 2x → x = −4. Confira: 2(−4 − 3) = −14 e 4(−4) + 2 = −14. ✓",
            difficulty: "dificil",
            grade: "9º ano",
          },
        ],
      },
      {
        name: "Funções",
        questions: [
          {
            key: "fun1",
            statement: "Qual é o valor de f(3) na função f(x) = 2x + 5?",
            options: ["11", "8", "10", "13"],
            correct: 0,
            explanation: "Substitua x por 3: f(3) = 2(3) + 5 = 6 + 5 = 11.",
            difficulty: "facil",
            grade: "1º EM",
          },
          {
            key: "fun2",
            statement:
              "Na função afim f(x) = 3x − 4, qual é o coeficiente angular (taxa de variação)?",
            options: ["3", "−4", "4", "7"],
            correct: 0,
            explanation:
              "Na forma f(x) = ax + b, o coeficiente angular é a. Aqui a = 3: para cada unidade que x aumenta, f(x) aumenta em 3.",
            difficulty: "media",
            grade: "1º EM",
          },
          {
            key: "fun3",
            statement: "Qual é o zero da função f(x) = 4x − 12?",
            options: ["x = 3", "x = −3", "x = 4", "x = 12"],
            correct: 0,
            explanation:
              "O zero é onde f(x) = 0: 4x − 12 = 0 → 4x = 12 → x = 3. É o ponto em que a reta corta o eixo x.",
            difficulty: "media",
            grade: "1º EM",
          },
          {
            key: "fun4",
            statement: "A função f(x) = −2x + 7 é:",
            options: [
              "decrescente, pois o coeficiente angular é negativo",
              "crescente, pois o coeficiente angular é positivo",
              "constante, pois o coeficiente linear é positivo",
              "não definida",
            ],
            correct: 0,
            explanation:
              "Com a = −2 < 0, a reta desce da esquerda para a direita: a função é decrescente.",
            difficulty: "media",
            grade: "1º EM",
          },
          {
            key: "fun5",
            statement:
              "Qual é o coeficiente angular da reta que passa pelos pontos (0, 2) e (2, 6)?",
            options: ["2", "4", "0,5", "−2"],
            correct: 0,
            explanation:
              "Taxa de variação: (6 − 2) / (2 − 0) = 4 / 2 = 2. Para cada 1 em x, y aumenta em 2.",
            difficulty: "dificil",
            grade: "1º EM",
          },
          {
            key: "fun6",
            statement:
              "Para qual valor de x as funções f(x) = 2x + 3 e g(x) = 5x − 6 se interceptam?",
            options: ["x = 3", "x = 1", "x = −3", "x = 9"],
            correct: 0,
            explanation:
              "Na interseção f(x) = g(x): 2x + 3 = 5x − 6 → 9 = 3x → x = 3. Nesse ponto ambas valem y = 9.",
            difficulty: "dificil",
            grade: "2º EM",
          },
        ],
      },
      {
        name: "Geometria",
        questions: [
          {
            key: "geo1",
            statement: "Qual é a área de um retângulo com base de 8 cm e altura de 5 cm?",
            options: ["40 cm²", "26 cm²", "13 cm²", "45 cm²"],
            correct: 0,
            explanation: "Área do retângulo = base × altura = 8 × 5 = 40 cm².",
            difficulty: "facil",
            grade: "6º ano",
          },
          {
            key: "geo2",
            statement: "Qual é o perímetro de um triângulo equilátero com lado de 10 cm?",
            options: ["30 cm", "100 cm", "20 cm", "40 cm"],
            correct: 0,
            explanation:
              "No triângulo equilátero os três lados são iguais: perímetro = 10 + 10 + 10 = 30 cm.",
            difficulty: "facil",
            grade: "7º ano",
          },
          {
            key: "geo3",
            statement:
              "Qual é o volume de um cilindro de raio 2 cm e altura 5 cm? (use π ≈ 3,14)",
            options: ["62,8 cm³", "31,4 cm³", "62,8 cm²", "125,6 cm³"],
            correct: 0,
            explanation:
              "V = π × r² × h = 3,14 × 2² × 5 = 3,14 × 4 × 5 = 62,8 cm³ (a unidade de volume é cúbica).",
            difficulty: "dificil",
            grade: "9º ano",
          },
        ],
      },
    ],
  },
  {
    name: "Língua Portuguesa",
    icon: "✍️",
    color: "#ec4899",
    topics: [
      {
        name: "Interpretação",
        questions: [
          {
            key: "int1",
            statement:
              "Na frase «O vento sussurrava suavemente entre as árvores», a palavra «sussurrava» sugere que o vento:",
            options: [
              "produzia um som suave",
              "estava completamente parado",
              "derrubava as árvores",
              "trazia tempestade",
            ],
            correct: 0,
            explanation:
              "«Sussurrar» significa murmurar em voz baixa. A expressão indica um vento leve e silencioso — é uma pessoaificação.",
            difficulty: "facil",
            grade: "6º ano",
          },
          {
            key: "int2",
            statement:
              "Um texto afirma: «Apesar do grande esforço da equipe, o resultado não foi alcançado». Esse trecho indica que:",
            options: [
              "houve contraste entre o esforço e o resultado negativo",
              "a equipe não se esforçou",
              "o resultado foi positivo",
              "o esforço era desnecessário",
            ],
            correct: 0,
            explanation:
              "O conectivo «apesar de» introduz uma ideia de oposição: esforço (positivo) × resultado (negativo).",
            difficulty: "media",
            grade: "7º ano",
          },
        ],
      },
      {
        name: "Gramática",
        questions: [
          {
            key: "gra1",
            statement: "Qual é a classificação da oração «Choveu muito ontem»?",
            options: [
              "Oração sem sujeito (verbo impessoal)",
              "Sujeito simples: «ontem»",
              "Sujeito simples: «muito»",
              "Sujeito oculto: «ele»",
            ],
            correct: 0,
            explanation:
              "O verbo «chover» é impessoal: não admite sujeito, pois a chuva não é um agente que realiza a ação. «Muito» é complemento verbal (advérbio).",
            difficulty: "media",
            grade: "7º ano",
          },
          {
            key: "gra2",
            statement:
              "Em «Os alunos terminaram a prova cedo», o verbo «terminaram» está no:",
            options: [
              "pretérito perfeito do indicativo",
              "pretérito imperfeito do indicativo",
              "futuro do presente do indicativo",
              "presente do indicativo",
            ],
            correct: 0,
            explanation:
              "«Terminaram» indica ação concluída no passado (terminar → terminei, terminaste, terminou...). É pretérito perfeito.",
            difficulty: "facil",
            grade: "6º ano",
          },
          {
            key: "gra3",
            statement:
              "Em «Ele correu rapidamente», a palavra «rapidamente» é:",
            options: ["advérbio", "adjetivo", "substantivo", "conjunção"],
            correct: 0,
            explanation:
              "«Rapidamente» modifica o verbo «correu» indicando modo — é um advérbio (termina em -mente).",
            difficulty: "facil",
            grade: "6º ano",
          },
        ],
      },
      {
        name: "Literatura",
        questions: [
          {
            key: "lit1",
            statement:
              "Qual é uma característica principal do Romanticismo brasileiro?",
            options: [
              "Valorização dos sentimentos, do eu e do nacionalismo",
              "Objetividade científica e crítica social",
              "Linguagem coloquial e cotidiana",
              "Ruptura total com a métrica e a rima",
            ],
            correct: 0,
            explanation:
              "O Romantismo (séc. XIX) exalta sentimentos, individualidade, nacionalismo e a figura do herói — em contraste ao Arcadismo clássico.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "lit2",
            statement: "Quem escreveu o romance «Vidas Secas»?",
            options: [
              "Graciliano Ramos",
              "Machado de Assis",
              "Clarice Lispector",
              "Jorge Amado",
            ],
            correct: 0,
            explanation:
              "«Vidas Secas» (1938), de Graciliano Ramos, retrata a seca e a vida de uma família de retirantes no Nordeste.",
            difficulty: "facil",
            grade: "9º ano",
          },
          {
            key: "lit3",
            statement:
              "Orações coordenadas sindéticas são unidas por meio de:",
            options: [
              "conjunções (e, mas, ou, porque...)",
              "vírgulas apenas",
              "pronomes relativos (que, qual...)",
              "preposições (em, de, com...)",
            ],
            correct: 0,
            explanation:
              "«Sindética» = unidas por conjunção. Quando unidas sem conjunção (apenas vírgula), são assindéticas.",
            difficulty: "media",
            grade: "8º ano",
          },
        ],
      },
    ],
  },
  {
    name: "História",
    icon: "🏛️",
    color: "#f59e0b",
    topics: [
      {
        name: "Brasil Colônia",
        questions: [
          {
            key: "hco1",
            statement: "Qual foi o principal produto da economia açucareira no Brasil Colônia?",
            options: ["Açúcar", "Café", "Ouro", "Algodão"],
            correct: 0,
            explanation:
              "Nos séculos XVI e XVII, o engenho de açúcar (Nordeste) foi a base da economia, com trabalho escravizado e comércio com a Europa.",
            difficulty: "facil",
            grade: "8º ano",
          },
          {
            key: "hco2",
            statement:
              "O sistema de trabalho escravista no Brasil Colônia baseava-se principalmente em:",
            options: [
              "mão de obra africana escravizada",
              "trabalho assalariado de europeus",
              "mão de obra indígena livre e assalariada",
              "mecanização das plantações",
            ],
            correct: 0,
            explanation:
              "Cerca de 4 milhões de africanos foram trazidos forçadamente ao Brasil. O tráfico se intensificou com o açúcar e depois com o ouro e o café.",
            difficulty: "media",
            grade: "8º ano",
          },
          {
            key: "hco3",
            statement: "As Bandeiras, no século XVII, tinham como principal objetivo:",
            options: [
              "explorar o interior em busca de riquezas e pessoas escravizadas",
              "colonizar o litoral nordestino",
              "comercializar açúcar com a Holanda",
              "defender as fronteiras contra os espanhóis",
            ],
            correct: 0,
            explanation:
              "Os bandeirantes adentravam o sertão atrás de metais, pedras preciosas e capturas de indígenas, expandindo as fronteiras do Brasil.",
            difficulty: "media",
            grade: "9º ano",
          },
        ],
      },
      {
        name: "Brasil Império",
        questions: [
          {
            key: "him1",
            statement: "Em que ano a Independência do Brasil foi proclamada?",
            options: ["1822", "1500", "1889", "1888"],
            correct: 0,
            explanation:
              "Dom Pedro I proclamou a Independência em 7 de setembro de 1822, às margens do rio Ipiranga, em São Paulo.",
            difficulty: "facil",
            grade: "7º ano",
          },
          {
            key: "him2",
            statement: "Quem proclamou a República no Brasil em 15 de novembro de 1889?",
            options: [
              "Marechal Deodoro da Fonseca",
              "Getúlio Vargas",
              "Dom Pedro II",
              "Floriano Peixoto",
            ],
            correct: 0,
            explanation:
              "O marechal Deodoro da Fonseca liderou o golpe militar que depôs Dom Pedro II e instaurou a República.",
            difficulty: "facil",
            grade: "8º ano",
          },
          {
            key: "him3",
            statement: "A Lei Áurea, que encerrou a escravidão no Brasil, foi assinada em:",
            options: ["1888", "1889", "1822", "1850"],
            correct: 0,
            explanation:
              "A princesa Isabel assinou a Lei Áurea em 13 de maio de 1888. Em 1889 veio a República.",
            difficulty: "media",
            grade: "8º ano",
          },
        ],
      },
      {
        name: "República",
        questions: [
          {
            key: "hre1",
            statement: "A Primeira República no Brasil também é conhecida como:",
            options: ["República Velha", "República Nova", "Estado Novo", "Era Vargas"],
            correct: 0,
            explanation:
              "A República Velha (1889–1930) foi marcada pela política do café com leite, pelo voto de cabresto e pela oligarquia paulista e mineira.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "hre2",
            statement:
              "A Revolução de 1930 tirou do poder o presidente:",
            options: [
              "Washington Luís",
              "Getúlio Vargas",
              "Júlio Prestes",
              "Hermes da Fonseca",
            ],
            correct: 0,
            explanation:
              "Washington Luís, último presidente da República Velha, foi depôs pela Revolução de 1930, que levou Getúlio Vargas ao poder.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "hre3",
            statement: "O Estado Novo, regime autoritário de Getúlio Vargas, foi instaurado em:",
            options: ["1937", "1930", "1942", "1945"],
            correct: 0,
            explanation:
              "Em 1937 Vargas deu golpe de Estado, criou a Constituição de 1937 e fechou o Congresso — durou até 1945.",
            difficulty: "dificil",
            grade: "9º ano",
          },
        ],
      },
    ],
  },
  {
    name: "Geografia",
    icon: "🌍",
    color: "#10b981",
    topics: [
      {
        name: "População",
        questions: [
          {
            key: "gpo1",
            statement: "O Brasil é o país mais populoso de qual continente?",
            options: ["América do Sul", "América do Norte", "África", "Ásia"],
            correct: 0,
            explanation:
              "Com cerca de 215 milhões de habitantes, o Brasil é o 7º país mais populoso do mundo e o maior da América do Sul.",
            difficulty: "facil",
            grade: "6º ano",
          },
          {
            key: "gpo2",
            statement:
              "A urbanização acelerada e desordenada nas grandes cidades brasileiras gerou principalmente:",
            options: [
              "crescimento de favelas e déficit de infraestrutura",
              "aumento da produção agrícola",
              "redução da população urbana",
              "eliminação da poluição urbana",
            ],
            correct: 0,
            explanation:
              "O êxito rural e a falta de planejamento produziram periferias sem saneamento, transporte e serviços — a chamada urbanização precária.",
            difficulty: "media",
            grade: "7º ano",
          },
        ],
      },
      {
        name: "Globalização",
        questions: [
          {
            key: "glo1",
            statement: "A globalização econômica caracteriza-se por:",
            options: [
              "intensificação dos fluxos de capital, bens e informações entre países",
              "isolamento comercial das nações",
              "fim das empresas multinacionais",
              "autossuficiência de cada país",
            ],
            correct: 0,
            explanation:
              "Globalização = interdependência econômica mundial: comércio internacional, corporações multinacionais e circulação financeira instantânea.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "glo2",
            statement: "Quais países integram o Mercosul?",
            options: [
              "Argentina, Brasil, Paraguai e Uruguai",
              "Brasil, Chile, Peru e Bolívia",
              "Argentina, Brasil, Chile e Venezuela",
              "Brasil, Uruguai, Equador e Peru",
            ],
            correct: 0,
            explanation:
              "O Mercosul (1991) tem como membros plenos Argentina, Brasil, Paraguai e Uruguai (a Venezuela está suspensa).",
            difficulty: "media",
            grade: "8º ano",
          },
        ],
      },
      {
        name: "Geopolítica",
        questions: [
          {
            key: "gge1",
            statement:
              "A Guerra Fria (1947–1991) foi o confronto ideológico entre:",
            options: [
              "Estados Unidos e União Soviética",
              "França e Inglaterra",
              "Alemanha e Itália",
              "Japão e China",
            ],
            correct: 0,
            explanation:
              "EUA (capitalismo) × URSS (socialismo): disputa nuclear, corrida espacial e guerras por procuração, sem confronto direto.",
            difficulty: "media",
            grade: "9º ano",
          },
        ],
      },
    ],
  },
  {
    name: "Física",
    icon: "⚛️",
    color: "#0ea5e9",
    topics: [
      {
        name: "Mecânica",
        questions: [
          {
            key: "fme1",
            statement: "Qual é a unidade de força no Sistema Internacional de Unidades?",
            options: ["Newton", "Joule", "Watt", "Pascal"],
            correct: 0,
            explanation:
              "A força é medida em newtons (N): 1 N acelera 1 kg com 1 m/s².",
            difficulty: "facil",
            grade: "8º ano",
          },
          {
            key: "fme2",
            statement: "Um carro percorre 150 km em 3 horas. Qual é sua velocidade média?",
            options: ["50 km/h", "450 km/h", "30 km/h", "75 km/h"],
            correct: 0,
            explanation: "v = Δs / Δt = 150 km ÷ 3 h = 50 km/h.",
            difficulty: "facil",
            grade: "8º ano",
          },
          {
            key: "fme3",
            statement:
              "Segundo a 2ª lei de Newton, se a força resultante sobre um corpo dobrar, mantendo a massa constante, a aceleração:",
            options: [
              "dobra",
              "permanece igual",
              "cai pela metade",
              "quadruplica",
            ],
            correct: 0,
            explanation:
              "F = m · a → a = F / m. Com m constante, dobrar F dobra a proporcionalidade.",
            difficulty: "media",
            grade: "9º ano",
          },
        ],
      },
      {
        name: "Energia",
        questions: [
          {
            key: "fen1",
            statement:
              "A energia potencial de um objeto elevado está relacionada a:",
            options: [
              "sua altura e sua massa",
              "seu volume apenas",
              "sua temperatura",
              "sua cor",
            ],
            correct: 0,
            explanation: "Ep = m · g · h — depende da massa e da altura em relação ao nível de referência.",
            difficulty: "facil",
            grade: "9º ano",
          },
          {
            key: "fen2",
            statement: "Qual instrumento mede a potência elétrica?",
            options: ["Wattímetro", "Amperímetro", "Voltímetro", "Ohmímetro"],
            correct: 0,
            explanation:
              "O wattímetro mede potência (W). Amperímetro mede corrente, voltímetro tensão, ohmímetro resistência.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "fen3",
            statement:
              "Uma lâmpada de 60 W fica ligada por 2 horas. Quanta energia ela consome?",
            options: ["0,12 kWh", "1,2 kWh", "120 kWh", "0,06 kWh"],
            correct: 0,
            explanation: "E = P × t = 0,060 kW × 2 h = 0,12 kWh.",
            difficulty: "dificil",
            grade: "1º EM",
          },
        ],
      },
      {
        name: "Eletricidade",
        questions: [
          {
            key: "fel1",
            statement: "Em um circuito elétrico série, a corrente elétrica é:",
            options: [
              "o mesmo em todos os pontos",
              "maior junto às lâmpadas",
              "zero no interruptor fechado",
              "diferente em cada componente",
            ],
            correct: 0,
            explanation:
              "Em série não há caminhos alternativos: a mesma corrente percorre todos os componentes.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "fel2",
            statement: "A resistência elétrica é medida em:",
            options: ["Ohm", "Ampere", "Volt", "Tesla"],
            correct: 0,
            explanation: "Unidade: ohm (Ω), em homenagem a Georg Ohm. Lei de Ohm: V = R · I.",
            difficulty: "facil",
            grade: "9º ano",
          },
        ],
      },
    ],
  },
  {
    name: "Química",
    icon: "🧪",
    color: "#8b5cf6",
    topics: [
      {
        name: "Estequiometria",
        questions: [
          {
            key: "qes1",
            statement: "Quantos gramas há em 2 mol de água (H₂O)?  (H = 1, O = 16)",
            options: ["36 g", "18 g", "20 g", "34 g"],
            correct: 0,
            explanation:
              "Massa molar da água = 2(1) + 16 = 18 g/mol. Para 2 mol: 2 × 18 = 36 g.",
            difficulty: "media",
            grade: "1º EM",
          },
          {
            key: "qes2",
            statement: "Qual é a fórmula do cloreto de sódio?",
            options: ["NaCl", "NaCl₂", "Na₂Cl", "NaO"],
            correct: 0,
            explanation:
              "O sódio (Na⁺) e o cloro (Cl⁻) formam NaCl — cloreto de sódio, o sal de cozinha.",
            difficulty: "facil",
            grade: "8º ano",
          },
        ],
      },
      {
        name: "Soluções",
        questions: [
          {
            key: "qsol1",
            statement: "Uma solução com pH igual a 3 é:",
            options: ["ácida", "neutra", "alcalina (básica)", "saturada"],
            correct: 0,
            explanation:
              "pH < 7 é ácido, pH = 7 neutro, pH > 7 básico. O pH 3 é fortemente ácido.",
            difficulty: "facil",
            grade: "9º ano",
          },
          {
            key: "qsol2",
            statement: "A molaridade de uma solução é expressa em:",
            options: ["mol/L", "g/L apenas", "mL/mol", "kg/s"],
            correct: 0,
            explanation: "Molaridade (M) = mol do soluto / volume da solução em litros (mol/L).",
            difficulty: "media",
            grade: "2º EM",
          },
        ],
      },
      {
        name: "Química Orgânica",
        questions: [
          {
            key: "qor1",
            statement: "Os hidrocarbonetos são compostos formados apenas por:",
            options: [
              "carbono e hidrogênio",
              "carbono e oxigênio",
              "hidrogênio e nitrogênio",
              "carbono, hidrogênio e oxigênio",
            ],
            correct: 0,
            explanation:
              "Hidrocarbonetos = só C e H (metano CH₄, etano C₂H₆...). Se há O, são compostos orgânico-oxigenados.",
            difficulty: "media",
            grade: "3º EM",
          },
        ],
      },
    ],
  },
  {
    name: "Biologia",
    icon: "🧬",
    color: "#ef4444",
    topics: [
      {
        name: "Genética",
        questions: [
          {
            key: "bge1",
            statement:
              "Em um cruzamento entre indivíduos heterozigotos (Aa × Aa), qual a probabilidade de o descendente ser homozigoto recessivo?",
            options: ["25%", "50%", "75%", "100%"],
            correct: 0,
            explanation:
              "Quadro de Punnett: AA, Aa, Aa, aa → 1 de 4 (25%) é aa, homozigoto recessivo.",
            difficulty: "media",
            grade: "9º ano",
          },
          {
            key: "bge2",
            statement: "O material genético humano está armazenado em:",
            options: ["DNA", "RNA", "proteínas", "lipídios"],
            correct: 0,
            explanation:
              "O DNA (ácido desoxirribonucleico) guarda as informações hereditárias nos cromossomos do núcleo celular.",
            difficulty: "facil",
            grade: "8º ano",
          },
          {
            key: "bge3",
            statement:
              "As características transmitidas de pais para filhos são chamadas de:",
            options: [
              "hereditárias (genéticas)",
              "adquiridas",
              "metabólicas",
              "ecológicas",
            ],
            correct: 0,
            explanation:
              "Heredidade é a passagem de genes (DNA) via gametas — por isso filhos se assemelham aos pais.",
            difficulty: "facil",
            grade: "8º ano",
          },
        ],
      },
      {
        name: "Ecologia",
        questions: [
          {
            key: "bec1",
            statement: "Os produtores em um ecossistema são:",
            options: [
              "seres autótrofos, como as plantas",
              "seres decompositores",
              "carnívoros de topo",
              "herbívoros",
            ],
            correct: 0,
            explanation:
              "Produtores fazem fotossíntese e geram matéria orgânica — base das cadeias alimentares.",
            difficulty: "facil",
            grade: "7º ano",
          },
          {
            key: "bec2",
            statement:
              "A decomposição da matéria orgânica morta por fungos e bactérias é realizada por:",
            options: ["decompositores", "produtores", "consumidores primários", "predadores"],
            correct: 0,
            explanation:
              "Decompositores recyclam nutrientes devolvendo-os ao solo — essenciais para o ciclo dos elementos.",
            difficulty: "facil",
            grade: "7º ano",
          },
          {
            key: "bec3",
            statement:
              "O aumento dos níveis de CO₂ na atmosfera está principalmente relacionado a:",
            options: [
              "a queima de combustíveis fósseis",
              "a fotossíntese das florestas",
              "a reciclagem do lixo por bactérias",
              "o crescimento da população de herbívoros",
            ],
            correct: 0,
            explanation:
              "Queima de petróleo, carvão e gás libera CO₂ estocado há milhões de anos — principal causa do efeito estufa antrópico.",
            difficulty: "dificil",
            grade: "9º ano",
          },
        ],
      },
      {
        name: "Citologia",
        questions: [
          {
            key: "bci1",
            statement: "A estrutura responsável pela produção de energia celular (ATP) é:",
            options: ["mitocôndria", "ribossomo", "lisossomo", "centríolo"],
            correct: 0,
            explanation:
              "A mitocôndria realiza a respiração celular, convertendo glicose em ATP — a «usina de energia» da célula.",
            difficulty: "facil",
            grade: "8º ano",
          },
          {
            key: "bci2",
            statement: "O núcleo celular contém:",
            options: [
              "DNA organizado em cromossomos",
              "apenas enzimas digestivas",
              "a membrana plasmática",
              "o citoplasma",
            ],
            correct: 0,
            explanation:
              "O núcleo guarda o material genético (DNA + histonas = cromossomos) e controla as atividades celulares.",
            difficulty: "media",
            grade: "8º ano",
          },
        ],
      },
    ],
  },
]

const ACHIEVEMENTS = [
  { code: "first_question", name: "Primeiro Passo", description: "Responda sua primeira questão", icon: "🥚", metric: "QUESTIONS_ANSWERED", threshold: 1 },
  { code: "questions_10", name: "Em ritmo de estudo", description: "Responda 10 questões", icon: "📚", metric: "QUESTIONS_ANSWERED", threshold: 10 },
  { code: "questions_50", name: "Colecionador", description: "Responda 50 questões", icon: "📖", metric: "QUESTIONS_ANSWERED", threshold: 50 },
  { code: "questions_100", name: "Centenário", description: "Responda 100 questões", icon: "🎓", metric: "QUESTIONS_ANSWERED", threshold: 100 },
  { code: "correct_10", name: "Cem por cento de... dez", description: "Acerte 10 questões", icon: "✅", metric: "CORRECT_ANSWERED", threshold: 10 },
  { code: "correct_50", name: "Estudante dedicado", description: "Acerte 50 questões", icon: "⭐", metric: "CORRECT_ANSWERED", threshold: 50 },
  { code: "correct_100", name: "Mestre dos acertos", description: "Acerte 100 questões", icon: "🌟", metric: "CORRECT_ANSWERED", threshold: 100 },
  { code: "xp_500", name: "Meio milhar", description: "Acumule 500 XP", icon: "💰", metric: "XP", threshold: 500 },
  { code: "xp_1000", name: "Mil de XP", description: "Acumule 1.000 XP", icon: "💎", metric: "XP", threshold: 1000 },
  { code: "xp_5000", name: "Império de XP", description: "Acumule 5.000 XP", icon: "👑", metric: "XP", threshold: 5000 },
  { code: "streak_3", name: "Três dias seguidos", description: "Estude por 3 dias consecutivos", icon: "🔥", metric: "STREAK", threshold: 3 },
  { code: "streak_7", name: "Semana de estudos", description: "Estude por 7 dias consecutivos", icon: "🔥", metric: "STREAK", threshold: 7 },
  { code: "trail_1", name: "Primeira trilha", description: "Conclua uma trilha completa", icon: "🛤️", metric: "TRAILS_COMPLETED", threshold: 1 },
  { code: "trail_3", name: "Explorador", description: "Conclua 3 trilhas", icon: "🗺️", metric: "TRAILS_COMPLETED", threshold: 3 },
  { code: "challenge_5", name: "Constância", description: "Conclua 5 desafios diários", icon: "📅", metric: "DAILY_CHALLENGES", threshold: 5 },
  { code: "level_5", name: "Nível 5", description: "Alcance o nível 5", icon: "🏅", metric: "LEVEL", threshold: 5 },
]

const TRAILS = [
  {
    title: "Função Afim",
    description:
      "Domine a reta: conceito, coeficientes, comportamento e interseções. Da base do Ensino Médio até questões de prova.",
    icon: "📈",
    subject: "Matemática",
    steps: [
      { title: "Etapa 1 — Conceitos básicos", questions: ["fun1", "fun2"] },
      { title: "Etapa 2 — Comportamento das retas", questions: ["fun4", "fun5"] },
      { title: "Etapa 3 — Zeros e interceptações", questions: ["fun3", "fun6"] },
    ],
  },
  {
    title: "Porcentagem e Equações",
    description:
      "Do desconto do dia a dia às equações de grau superior: a base para provas e o ENEM.",
    icon: "🧮",
    subject: "Matemática",
    steps: [
      { title: "Etapa 1 — Porcentagem no dia a dia", questions: ["porc1", "porc3"] },
      { title: "Etapa 2 — Aumentos e descontos sucessivos", questions: ["porc2"] },
      { title: "Etapa 3 — Equações lineares", questions: ["eq1", "eq2"] },
      { title: "Etapa 4 — Desafio final", questions: ["eq3"] },
    ],
  },
  {
    title: "Do Brasil Colônia à República",
    description:
      "Uma jornada pela formação do Brasil: economia colonial, Império e a chegada da República.",
    icon: "👑",
    subject: "História",
    steps: [
      { title: "Etapa 1 — Brasil Colônia", questions: ["hco1", "hco2", "hco3"] },
      { title: "Etapa 2 — Brasil Império", questions: ["him1", "him2", "him3"] },
      { title: "Etapa 3 — A República", questions: ["hre1", "hre2", "hre3"] },
    ],
  },
  {
    title: "Mecânica e Energia",
    description:
      "Força, movimento e energia: os fundamentos da Física com questões de nível ENEM.",
    icon: "🚀",
    subject: "Física",
    steps: [
      { title: "Etapa 1 — Força e movimento", questions: ["fme1", "fme2", "fme3"] },
      { title: "Etapa 2 — Energia", questions: ["fen1", "fen2", "fen3"] },
      { title: "Etapa 3 — Eletricidade", questions: ["fel1", "fel2"] },
    ],
  },
  {
    title: "Vida: Célula, Ecologia e Genética",
    description:
      "Dos processos vitais à herança genética: complete os três pilares da Biologia escolar.",
    icon: "🌱",
    subject: "Biologia",
    steps: [
      { title: "Etapa 1 — Citologia", questions: ["bci1", "bci2"] },
      { title: "Etapa 2 — Ecologia", questions: ["bec1", "bec2", "bec3"] },
      { title: "Etapa 3 — Genética", questions: ["bge1", "bge2", "bge3"] },
    ],
  },
]

async function seedSubjects() {
  const existing = await prisma.question.count()
  if (existing > 0) {
    console.log(`• Conteúdo já existente (${existing} questões) — nada alterado.`)
    return
  }

  for (const subjectData of SUBJECTS) {
    const subject = await prisma.subject.create({
      data: {
        name: subjectData.name,
        icon: subjectData.icon,
        color: subjectData.color,
      },
    })

    for (const topicData of subjectData.topics) {
      const topic = await prisma.topic.create({
        data: { name: topicData.name, subjectId: subject.id },
      })

      for (const questionData of topicData.questions) {
        await createQuestion(topic.id, questionData)
      }
    }
  }

  console.log(`• ${SUBJECTS.length} disciplinas e ${Object.keys(questionIds).length} questões criadas.`)
}

async function seedAchievements() {
  const existing = await prisma.achievement.count()
  if (existing > 0) {
    console.log("• Conquistas já existentes — nada alterado.")
    return
  }

  await prisma.achievement.createMany({ data: ACHIEVEMENTS })
  console.log(`• ${ACHIEVEMENTS.length} conquistas criadas.`)
}

async function seedTrails() {
  const existing = await prisma.trail.count()
  if (existing > 0) {
    console.log("• Trilhas já existentes — nada alterado.")
    return
  }

  const questionCount = await prisma.question.count()
  if (questionCount === 0) {
    console.log("• Sem questões no banco — trilhas não criadas.")
    return
  }

  const subjects = await prisma.subject.findMany()
  const subjectByName = Object.fromEntries(subjects.map((s) => [s.name, s.id]))

  // Mapeia enunciado -> id para localizar questões mesmo em banco já populado
  const statementByKey = {}
  for (const subjectData of SUBJECTS) {
    for (const topicData of subjectData.topics) {
      for (const questionData of topicData.questions) {
        statementByKey[questionData.key] = questionData.statement
      }
    }
  }
  const allQuestions = await prisma.question.findMany({ select: { id: true, statement: true } })
  const idByStatement = Object.fromEntries(allQuestions.map((q) => [q.statement, q.id]))

  let order = 0
  for (const trailData of TRAILS) {
    const trail = await prisma.trail.create({
      data: {
        title: trailData.title,
        description: trailData.description,
        icon: trailData.icon,
        order: order++,
        subjectId: subjectByName[trailData.subject],
      },
    })

    let stepOrder = 1
    for (const stepData of trailData.steps) {
      const step = await prisma.trailStep.create({
        data: { trailId: trail.id, order: stepOrder++, title: stepData.title },
      })

      for (const key of stepData.questions) {
        const questionId = questionIds[key] ?? idByStatement[statementByKey[key]]
        if (!questionId) continue

        await prisma.trailStepQuestion.create({
          data: { stepId: step.id, questionId },
        })
      }
    }
  }

  console.log(`• ${TRAILS.length} trilhas criadas.`)
}

async function seedAdmin() {
  const email = "admin@egg.com"
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log("• Conta administrativa já existe.")
    return
  }

  const bcrypt = await import("bcryptjs")
  const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10)

  await prisma.user.create({
    data: {
      name: "Administrador",
      nickname: "Admin",
      email,
      password: hashed,
      role: "ADMIN",
    },
  })
  console.log(`• Conta admin criada: ${email} (senha: ${process.env.ADMIN_PASSWORD || "admin123"})`)
}

async function main() {
  console.log("Seed do EGG iniciada...")
  await seedSubjects()
  await seedAchievements()
  await seedTrails()
  await seedAdmin()
  console.log("Seed concluída com sucesso.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
