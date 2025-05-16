
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    // Comprobamos inicialmente el tamaño de pantalla si estamos en el cliente
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  React.useEffect(() => {
    // Función para comprobar si estamos en dispositivo móvil
    const checkMobile = () => {
      const currentIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(currentIsMobile)
      console.log("Screen width changed:", window.innerWidth, "isMobile:", currentIsMobile)
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
