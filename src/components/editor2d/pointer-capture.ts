/** Pointer capture helpers tolerant of synthetic events (tests) and lost pointers. */

export function capturePointer(el: SVGSVGElement | null, id: number): void {
  try {
    el?.setPointerCapture(id);
  } catch {
    /* no active pointer (synthetic event) — safe to ignore */
  }
}

export function releasePointer(el: SVGSVGElement | null, id: number): void {
  try {
    el?.releasePointerCapture(id);
  } catch {
    /* ignore */
  }
}
