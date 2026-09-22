import { getUserStatsFull } from "../services/statsService.js"

export async function stats(req, res, next) {
  try {
    res.json(await getUserStatsFull(req.user.id))
  } catch (error) {
    next(error)
  }
}
