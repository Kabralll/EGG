import { Router } from "express"
import { login, register } from "../controllers/authController.js"
import { forgotPassword, resetPassword } from "../controllers/passwordResetController.js"

const router = Router()

router.post("/login", login)
router.post("/register", register)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

export default router
