import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { stats } from "../controllers/statsController.js"

const router = Router()

router.get("/", authMiddleware, stats)

export default router
