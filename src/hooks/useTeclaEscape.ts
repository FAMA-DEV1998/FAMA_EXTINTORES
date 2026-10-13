import { useEffect } from "react";

export function useTeclaEscape(activo: boolean, alPresionar: () => void) {
  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") alPresionar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activo, alPresionar]);
}
