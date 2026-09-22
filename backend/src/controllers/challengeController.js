import { getDailyChallengeState } from "../services/gamificationService.js"

export async function todayChallenge(req, res, next) {
  try {
    res.json(await getDailyChallengeState(req.user.id))
  } catch (error) {
    next(error)
  }
}
