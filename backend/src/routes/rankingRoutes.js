import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { ranking } from "../controllers/rankingController.js"

const router = Router()

router.get("/", authMiddleware, ranking)

export default router
