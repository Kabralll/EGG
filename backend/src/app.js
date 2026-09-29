import express from "express"
import "dotenv/config"
import cors from "cors"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import subjectRoutes from "./routes/subjectRoutes.js"
import questionRoutes from "./routes/questionRoutes.js"
import trailRoutes from "./routes/trailRoutes.js"
import achievementRoutes from "./routes/achievementRoutes.js"
import challengeRoutes from "./routes/challengeRoutes.js"
import rankingRoutes from "./routes/rankingRoutes.js"
import statsRoutes from "./routes/statsRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"

const app = express()

/*
  CORS
  -----
  - Sem lista de origens liberadas (CORS_ORIGINS vazio ou "*") → libera tudo,
    que é o comportamento padrão do `cors()` e já aceita o app mobile.
  - Para travar, defina no backend/.env:
      CORS_ORIGINS=capacitor://localhost,https://localhost,http://localhost:8000,http://192.168.15.9:8000
    Origens com "*" no final também são aceitas (ex.: http://192.168.*).
*/
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    // Requisições sem Origin (curl, apps nativos, <img>) → sempre liberar
    if (!origin) return callback(null, true)
    // Lista vazia ou "*" → libera qualquer origem (dev/mobile)
    if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes("*")) return callback(null, true)

    const allowed = CORS_ORIGINS.some((o) =>
      o.endsWith("*") ? origin.startsWith(o.slice(0, -1)) : origin === o
    )
    callback(null, allowed)
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
app.use(express.json({ limit: "1mb" }))

app.get("/health", (req, res) => res.json({ status: "ok" }))

app.use("/auth", authRoutes)
app.use("/user", userRoutes)
app.use("/subjects", subjectRoutes)
app.use("/questions", questionRoutes)
app.use("/trails", trailRoutes)
app.use("/achievements", achievementRoutes)
app.use("/daily-challenge", challengeRoutes)
app.use("/ranking", rankingRoutes)
app.use("/stats", statsRoutes)
app.use("/dashboard", dashboardRoutes)
app.use("/admin", adminRoutes)

// 404 em JSON (evita páginas HTML para chamadas de API)
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" })
})

// Erros centralizados — nunca vaza stack para o cliente
app.use((err, req, res, next) => {
  console.error("[erro]", err)
  res.status(err.status || 500).json({
    error: err.status ? err.message : "Erro interno do servidor",
    ...(err.fields ? { fields: err.fields } : {}),
  })
})

export default app
