import * as authService from "../services/authService.js"

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {}
    const result = await authService.login(email, password)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body || {})
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}
