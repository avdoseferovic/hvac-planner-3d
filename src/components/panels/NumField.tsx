/** Numeric input that commits on change; keeps the model in cm. */
export function NumField({
  label,
  value,
  onCommit,
  min = 1,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min) onCommit(v);
        }}
      />
    </label>
  );
}
