/** Focus-target predicates shared by the global keyboard handlers. */

const NON_TEXT_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "button",
  "range",
  "submit",
  "reset",
  "file",
  "color",
]);

/** Any form control (typed keys or Space belong to the field, not the app). */
export function isFormFieldTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

/** Field where typed characters are text entry — blocks single-key shortcuts. */
export function isTextEntryTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (
    el.isContentEditable ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  ) {
    return true;
  }
  if (el.tagName !== "INPUT") return false;
  return !NON_TEXT_INPUT_TYPES.has((el as HTMLInputElement).type);
}
