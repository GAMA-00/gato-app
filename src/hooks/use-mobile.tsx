
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  React.useEffect(() => {
    const checkMobile = () => {
      const currentIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(currentIsMobile)
    }
    
    checkMobile()
    
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
