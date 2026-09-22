import crypto from "crypto"
import bcrypt from "bcryptjs"
import prisma from "../lib/prisma.js"

export async function createResetToken(email) {
  if (!email) return null

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null

  const token = crypto.randomBytes(32).toString("hex")

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutos
    },
  })

  return token
}

export async function resetPassword(token, password) {
  if (!token) throw new Error("Token inválido")
  if (!password || password.length < 6)
    throw new Error("A senha precisa ter pelo menos 6 caracteres")

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!resetToken) throw new Error("Token inválido")

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => {})
    throw new Error("Token expirado, solicite um novo")
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword },
  })

  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
}
