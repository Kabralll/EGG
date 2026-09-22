import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { listTrails, getTrail } from "../controllers/trailController.js"

const router = Router()

router.get("/", authMiddleware, listTrails)
router.get("/:id", authMiddleware, getTrail)

export default router
