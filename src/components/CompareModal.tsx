import type { Product } from '@/types';
import { basisPointsToPercent, formatUSDC } from '@/lib/format';
import { CATEGORY_ICONS } from '@/lib/constants';
import { memo, useId } from 'react';
import { Modal } from './Modal';

interface Props {
  products: Product[];
  onClose: () => void;
}

const FIELDS = [
  { label: 'Category',     getValue: (p: Product) => `${CATEGORY_ICONS[p.category] ?? '🛡️'} ${p.category}` },
  { label: 'Trigger',      getValue: (p: Product) => `${p.triggerType} ${p.comparison === 'LessThan' ? '<' : p.comparison === 'GreaterThan' ? '>' : '='} ${p.threshold}` },
  { label: 'Premium',      getValue: (p: Product) => basisPointsToPercent(p.premiumRate) },
  { label: 'Min Coverage', getValue: (p: Product) => formatUSDC(p.coverageMin) },
  { label: 'Max Coverage', getValue: (p: Product) => formatUSDC(p.coverageMax) },
  { label: 'Max Duration', getValue: (p: Product) => `${p.maxDuration} days` },
  { label: 'Status',       getValue: (p: Product) => p.status },
];

/** Plain-language summary of the comparison, read as the dialog's description (#678). */
export function compareSummary(products: Product[]): string {
  if (products.length === 0) return 'No products selected to compare.';
  const names = products.map((p) => p.name).join(', ');
  const fields = FIELDS.map((f) => f.label.toLowerCase()).join(', ');
  return `Comparing ${products.length} product${products.length === 1 ? '' : 's'}: ${names}. The table compares ${fields}.`;
}

function CompareModalComponent({ products, onClose }: Props) {
  const summaryId = useId();
  const summary = compareSummary(products);
  return (
    <Modal open={true} onClose={onClose} title="Compare Products" maxWidth="max-w-3xl" describedBy={summaryId}>
      {/* Screen-reader summary: describes the dialog and is announced when the comparison renders (#678). */}
      <p id={summaryId} role="status" aria-live="polite" className="sr-only">
        {summary}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{summary}</caption>
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-gray-400" />
              {products.map((p) => (
                <th key={p.id} className="pb-3 px-4 text-left font-semibold text-white">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(({ label, getValue }) => (
              <tr key={label} className="border-b border-white/5">
                <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  {label}
                </td>
                {products.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-gray-300">
                    {getValue(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export const CompareModal = memo(CompareModalComponent);
