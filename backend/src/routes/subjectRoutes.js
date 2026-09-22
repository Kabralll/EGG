import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { listSubjects, getSubject } from "../controllers/subjectController.js"

const router = Router()

router.get("/", authMiddleware, listSubjects)
router.get("/:id", authMiddleware, getSubject)

export default router
