import { useEffect, useState } from "react";
import { isFormFieldTarget } from "../../dom";

/** Tracks a held spacebar for Figma/Miro-style canvas panning. */
export function useSpacePan(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isFormFieldTarget(e.target)) return;
      // no page scroll and no re-activating a focused toolbar button
      e.preventDefault();
      setHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setHeld(false);
    };
    const reset = () => setHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return held;
}
