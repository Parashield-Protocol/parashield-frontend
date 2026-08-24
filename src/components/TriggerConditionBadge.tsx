import type { Product, Comparison } from '@/types';

interface TriggerConditionBadgeProps {
  product:  Product;
  className?: string;
}

function comparisonSymbol(c: Comparison): string {
  if (c === 'LessThan')    return '<';
  if (c === 'GreaterThan') return '>';
  return '=';
}

export function TriggerConditionBadge({ product, className }: TriggerConditionBadgeProps) {
  const symbol = comparisonSymbol(product.comparison);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-2.5 py-1 font-mono text-xs text-gray-600 dark:text-gray-300 ${className ?? ''}`}
    >
      <span className="text-teal-400">{product.triggerType}</span>
      <span className="text-gray-500 dark:text-gray-400">·</span>
      <span>{symbol} {product.threshold}</span>
    </span>
  );
}
