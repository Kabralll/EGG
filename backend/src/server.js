import { networkInterfaces } from "node:os"
import app from "./app.js"

const port = process.env.PORT || 3000

// Sobe em todas as interfaces (0.0.0.0) para aceitar o app mobile na rede local.
app.listen(port, "0.0.0.0", () => {
  console.log(`EGG API rodando em http://localhost:${port}`)

  // Mostra os IPs da máquina: é com eles que o celular vai se conectar.
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => n.address)

  if (ips.length) {
    console.log("Acesso pela rede local (use no app mobile):")
    ips.forEach((ip) => console.log(`  http://${ip}:${port}`))
  } else {
    console.log("Nenhum IP de rede local detectado.")
  }
})
