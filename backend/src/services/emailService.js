import nodemailer from "nodemailer"

/*
  Envia o e-mail de recuperação de senha.
  - Se o e-mail não estiver configurado no .env, o link é registrado no console
    do backend (útil em desenvolvimento).
  - Falhas de envio NÃO interrompem o fluxo: a mensagem de sucesso para o
    usuário é sempre a mesma (não revela existência de conta).
*/
export async function sendResetPasswordEmail(email, token) {
  const url = `${process.env.FRONT_URL || "http://localhost:8000"}/reset-password/${token}`

  if (!process.env.EMAIL || !process.env.APP_PASSWORD) {
    console.log(`[recuperação de senha] Link para ${email}: ${url}`)
    return { delivered: false }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "EGG — Recuperação de senha",
      html: `
        <h1>Recuperação de senha</h1>
        <p>Olá! Recebemos uma solicitação para redefinir sua senha no EGG.</p>
        <p>Clique no link abaixo (válido por 30 minutos):</p>
        <a href="${url}">Redefinir minha senha</a>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
      `,
    })
    return { delivered: true }
  } catch (error) {
    console.error(`[recuperação de senha] Falha ao enviar e-mail: ${error.message}`)
    console.log(`[recuperação de senha] Link para ${email}: ${url}`)
    return { delivered: false, error: error.message }
  }
}
