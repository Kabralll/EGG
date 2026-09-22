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

app.use(cors())
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
