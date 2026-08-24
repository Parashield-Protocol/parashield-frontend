import type { Product } from '@/types';
import { basisPointsToPercent, formatUSDC } from '@/lib/format';
import { CATEGORY_ICONS } from '@/lib/constants';
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

export function CompareModal({ products, onClose }: Props) {
  return (
    <Modal open={true} onClose={onClose} title="Compare Products" maxWidth="max-w-3xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
