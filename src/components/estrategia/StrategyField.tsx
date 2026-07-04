type Props = {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (value: string) => void;
};

export function StrategyField({ label, value, placeholder, rows = 4, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <label className="block font-display text-base font-semibold tracking-tight text-foreground mb-2">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
