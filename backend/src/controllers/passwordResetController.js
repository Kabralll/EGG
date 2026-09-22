import * as passwordResetService from "../services/passwordResetService.js"
import { sendResetPasswordEmail } from "../services/emailService.js"

// Sempre responde a mesma mensagem: não revela se o e-mail existe
const GENERIC_MESSAGE = "Se existir uma conta associada ao e-mail, enviaremos instruções."

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {}

    const token = await passwordResetService.createResetToken(email)
    if (token) {
      await sendResetPasswordEmail(email, token)
    }

    res.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    next(error)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {}

    await passwordResetService.resetPassword(token, password)

    res.json({ message: "Senha alterada com sucesso. Já pode fazer login." })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
