import { Navigate, Route, Routes } from "react-router-dom"
import { AdminRoute, PrivateRoute, PublicOnlyRoute } from "./guards"

// Públicas
import LandingPage from "../pages/LandingPage"
import Login from "../pages/Login"
import Register from "../pages/Register"
import ForgotPassword from "../pages/ForgotPassword"
import ResetPassword from "../pages/ResetPassword"

// Área do estudante
import Dashboard from "../pages/Dashboard"
import Subjects from "../pages/Subjects"
import SubjectDetail from "../pages/SubjectDetail"
import Practice from "../pages/Practice"
import Trails from "../pages/Trails"
import TrailDetail from "../pages/TrailDetail"
import Achievements from "../pages/Achievements"
import Ranking from "../pages/Ranking"
import Performance from "../pages/Performance"
import Profile from "../pages/Profile"

// Área administrativa
import AdminOverview from "../pages/admin/AdminOverview"
import AdminQuestions from "../pages/admin/AdminQuestions"
import AdminSubjects from "../pages/admin/AdminSubjects"
import AdminTrails from "../pages/admin/AdminTrails"
import AdminUsers from "../pages/admin/AdminUsers"

function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Área do estudante */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:id" element={<SubjectDetail />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/trails" element={<Trails />} />
        <Route path="/trails/:id" element={<TrailDetail />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/stats" element={<Performance />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Área administrativa */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/questions" element={<AdminQuestions />} />
        <Route path="/admin/subjects" element={<AdminSubjects />} />
        <Route path="/admin/trails" element={<AdminTrails />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>

      {/* Compatibilidade com rotas antigas / fallback */}
      <Route path="/Home" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
