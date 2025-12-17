import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Set to true to force desktop-only mode (disables mobile detection)
const FORCE_DESKTOP_MODE = true;

export function useIsMobile() {
  // If desktop-only mode is enabled, always return false
  if (FORCE_DESKTOP_MODE) {
    return false;
  }

  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}