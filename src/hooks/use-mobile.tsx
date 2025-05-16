
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Función para comprobar si estamos en dispositivo móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      console.log("Screen width changed:", window.innerWidth, "isMobile:", window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Comprobar inmediatamente al cargar
    checkMobile()
    
    // Añadir event listener para resize
    window.addEventListener('resize', checkMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
