interface ProgressBarProps {
  value:     number;  // 0–100
  max?:      number;
  label?:    string;
  colour?:   'emerald' | 'teal' | 'amber' | 'red' | 'sky';
  className?: string;
}

const COLOUR_CLASSES = {
  emerald: 'bg-emerald-500',
  teal:    'bg-teal-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  sky:     'bg-sky-500',
};

export function ProgressBar({ value, max = 100, label, colour = 'teal', className }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>{label}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${COLOUR_CLASSES[colour]}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < current  ? 'bg-teal-500 text-white' :
              i === current ? 'border-2 border-teal-500 text-teal-400' :
              'border border-white/10 text-gray-400'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-xs ${i === current ? 'text-white' : 'text-gray-400'}`}>{step}</span>
          {i < steps.length - 1 && <div className="h-px w-6 bg-white/10" />}
        </div>
      ))}
    </div>
  );
}
