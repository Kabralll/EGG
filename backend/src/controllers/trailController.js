import { getTrailsProgress, getTrailDetail } from "../services/trailService.js"

export async function listTrails(req, res, next) {
  try {
    res.json(await getTrailsProgress(req.user.id))
  } catch (error) {
    next(error)
  }
}

export async function getTrail(req, res, next) {
  try {
    const trail = await getTrailDetail(req.user.id, Number(req.params.id))
    if (!trail) return res.status(404).json({ error: "Trilha não encontrada" })
    res.json(trail)
  } catch (error) {
    next(error)
  }
}
