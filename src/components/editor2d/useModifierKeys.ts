import { useEffect, useState } from "react";

/** Tracks held Shift/Alt for snap modifiers; resets on window blur. */
export function useModifierKeys(): { shift: boolean; alt: boolean } {
  const [shift, setShift] = useState(false);
  const [alt, setAlt] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShift(true);
      if (e.key === "Alt") {
        e.preventDefault(); // keep the browser menu from grabbing focus
        setAlt(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShift(false);
      if (e.key === "Alt") setAlt(false);
    };
    const reset = () => {
      setShift(false);
      setAlt(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return { shift, alt };
}
