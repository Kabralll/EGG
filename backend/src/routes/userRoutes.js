import { Router } from "express"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { getProfile, updateProfile } from "../controllers/userController.js"

const router = Router()

router.get("/", authMiddleware, getProfile)
router.patch("/", authMiddleware, updateProfile)

export default router
