import type { Product, Comparison, Category } from '@/types';

interface TriggerConditionBadgeProps {
  product:  Product;
  className?: string;
}

function comparisonLabel(c: Comparison): string {
  if (c === 'LessThan')    return 'Less than';
  if (c === 'GreaterThan') return 'Greater than';
  return 'Equal to';
}

const CATEGORY_UNITS: Record<Category, string> = {
  crop:      'mm',
  flight:    'min',
  disaster:  'mm',
  health:    '',
  defi:      '%',
};

export function TriggerConditionBadge({ product, className }: TriggerConditionBadgeProps) {
  const comparison = comparisonLabel(product.comparison);
  const units = CATEGORY_UNITS[product.category] ?? '';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-2.5 py-1 font-mono text-xs text-gray-600 dark:text-gray-300 ${className ?? ''}`}
    >
      <span className="text-teal-400">{product.triggerType}</span>
      <span className="text-gray-500 dark:text-gray-400">·</span>
      <span>{comparison} {product.threshold}{units ? ` ${units}` : ''}</span>
    </span>
  );
}
