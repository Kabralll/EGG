import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { listAchievements } from "../controllers/achievementController.js"

const router = Router()

router.get("/", authMiddleware, listAchievements)

export default router
