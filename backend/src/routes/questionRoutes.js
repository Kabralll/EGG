import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { practice, answer } from "../controllers/questionController.js"

const router = Router()

router.get("/practice", authMiddleware, practice)
router.post("/:id/answer", authMiddleware, answer)

export default router
