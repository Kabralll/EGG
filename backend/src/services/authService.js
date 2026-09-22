import prisma from "../lib/prisma.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

function validateRegister(data) {
  const errors = {}
  const name = (data.name || "").trim()
  const nickname = (data.nickname || "").trim()
  const email = (data.email || "").trim()

  if (name.length < 2) errors.name = "Informe seu nome (mínimo 2 caracteres)"
  if (nickname.length < 2) errors.nickname = "Escolha um apelido (mínimo 2 caracteres)"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "E-mail inválido"
  if (!data.password || data.password.length < 6)
    errors.password = "A senha precisa ter pelo menos 6 caracteres"

  return errors
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    xp: user.xp,
    streak: user.streak,
    createdAt: user.createdAt,
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )
}

export async function login(email, password) {
  if (!email || !password) {
    throw Object.assign(new Error("Informe e-mail e senha"), { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim() } })
  // Mensagem genérica: não revela se o e-mail existe
  if (!user) throw Object.assign(new Error("E-mail ou senha inválidos"), { status: 401 })

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw Object.assign(new Error("E-mail ou senha inválidos"), { status: 401 })

  return { token: signToken(user), user: safeUser(user) }
}

export async function register(data) {
  const errors = validateRegister(data)
  if (Object.keys(errors).length > 0) {
    throw Object.assign(new Error("Dados inválidos"), { status: 400, fields: errors })
  }

  const email = data.email.trim()

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        nickname: data.nickname.trim(),
        email,
        password: hashedPassword,
      },
    })

    return { token: signToken(user), user: safeUser(user) }
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0]
      throw Object.assign(new Error("Dados inválidos"), {
        status: 409,
        fields:
          field === "email"
            ? { email: "Este e-mail já está cadastrado" }
            : { nickname: "Este apelido já está em uso" },
      })
    }
    throw error
  }
}

export { safeUser }
