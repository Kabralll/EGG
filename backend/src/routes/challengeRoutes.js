import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { todayChallenge } from "../controllers/challengeController.js"

const router = Router()

router.get("/", authMiddleware, todayChallenge)

export default router
