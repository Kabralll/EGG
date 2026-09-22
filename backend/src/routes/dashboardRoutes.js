import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { dashboard } from "../controllers/dashboardController.js"

const router = Router()

router.get("/", authMiddleware, dashboard)

export default router
