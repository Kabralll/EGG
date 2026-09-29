import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"

/**
 * Rotas onde o botão "Voltar" do Android deve FECHAR o app.
 * Em qualquer outra rota ele apenas volta uma tela no React Router.
 */
const EXIT_PATHS = ["/", "/dashboard", "/login", "/register"]

/**
 * Intercepta o botão físico/gestural de voltar do Android.
 *
 * - Se o menu mobile estiver aberto → fecha o menu.
 * - Se estiver numa rota raiz (landing/dashboard) ou sem histórico → fecha o app.
 * - Caso contrário → volta uma rota no React Router.
 *
 * Deve ser usado DENTRO do <BrowserRouter> (ex.: no componente Layout).
 */
export default function useBackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  // Guarda a rota atual num ref para o listener sempre enxergar a rota fresca
  // sem precisar re-registrar o listener a cada navegação.
  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    // O evento 'backButton' só existe no Android. No web/iOS seria um no-op.
    if (Capacitor.getPlatform() !== "android") return

    let handle = null
    let disposed = false

    App.addListener("backButton", ({ canGoBack }) => {
      // 1) Menu mobile aberto? Fecha primeiro.
      if (document.getElementById("mobile-menu")) {
        window.dispatchEvent(new Event("egg:close-menu"))
        return
      }

      const path = locationRef.current.pathname
      const emRotaDeSaida = EXIT_PATHS.some((p) => p.toLowerCase() === path.toLowerCase())

      if (emRotaDeSaida || !canGoBack) {
        App.exitApp()
      } else {
        navigate(-1)
      }
    }).then((listener) => {
      // Se o componente desmontou antes da promessa resolver, remove na hora.
      if (disposed) {
        listener.remove()
        return
      }
      handle = listener
    })

    return () => {
      disposed = true
      if (handle) {
        handle.remove()
        handle = null
      }
    }
  }, [navigate])
}
