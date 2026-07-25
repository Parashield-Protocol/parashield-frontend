import type { PolicyStatus, ClaimStatus } from '@/types';
import { STATUS_COLOURS } from '@/lib/constants';

type BadgeLabel = PolicyStatus | ClaimStatus | string;

interface BadgeProps {
  label:     BadgeLabel;
  variant?:  ColourName;
  className?: string;
}

type ColourName = 'emerald' | 'sky' | 'amber' | 'red' | 'gray' | 'purple' | 'teal';

const COLOUR_CLASSES: Record<ColourName, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  sky:     'bg-sky-500/10     text-sky-400     border-sky-500/20',
  amber:   'bg-amber-500/10   text-amber-400   border-amber-500/20',
  red:     'bg-red-500/10     text-red-400     border-red-500/20',
  gray:    'bg-gray-500/10    text-gray-400    border-gray-500/20',
  purple:  'bg-purple-500/10  text-purple-400  border-purple-500/20',
  teal:    'bg-teal-500/10    text-teal-400    border-teal-500/20',
};

function isStatusKey(key: string): key is PolicyStatus | ClaimStatus {
  return key in STATUS_COLOURS;
}

export function Badge({ label, variant, className }: BadgeProps) {
  const colour: ColourName = (variant ?? (isStatusKey(label) ? STATUS_COLOURS[label] : undefined) ?? 'gray') as ColourName;
  const colourClass = COLOUR_CLASSES[colour];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colourClass} ${className ?? ''}`}
    >
      {label}
    </span>
  );
}
