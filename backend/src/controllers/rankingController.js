import { getRanking, getPositionOf } from "../services/statsService.js"

export async function ranking(req, res, next) {
  try {
    const scope = req.query.scope === "weekly" ? "weekly" : "general"
    const [entries, mine] = await Promise.all([
      getRanking(scope),
      getPositionOf(req.user.id, scope),
    ])

    res.json({ scope, total: entries.length, myPosition: mine.position, entries })
  } catch (error) {
    next(error)
  }
}
