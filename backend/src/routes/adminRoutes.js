import { Router } from "express"
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js"
import * as admin from "../controllers/adminController.js"

const router = Router()

router.use(authMiddleware, requireAdmin)

// Visão geral e usuários
router.get("/overview", admin.overview)
router.get("/users", admin.listUsers)
router.patch("/users/:id/role", admin.updateUserRole)

// Disciplinas
router.post("/subjects", admin.createSubject)
router.patch("/subjects/:id", admin.updateSubject)
router.delete("/subjects/:id", admin.deleteSubject)

// Assuntos
router.post("/topics", admin.createTopic)
router.patch("/topics/:id", admin.updateTopic)
router.delete("/topics/:id", admin.deleteTopic)

// Questões
router.get("/questions", admin.listQuestions)
router.post("/questions", admin.createQuestion)
router.patch("/questions/:id", admin.updateQuestion)
router.delete("/questions/:id", admin.deleteQuestion)

// Trilhas
router.get("/trails", admin.listTrailsAdmin)
router.post("/trails", admin.createTrail)
router.patch("/trails/:id", admin.updateTrail)
router.delete("/trails/:id", admin.deleteTrail)

export default router
