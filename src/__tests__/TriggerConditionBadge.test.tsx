import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TriggerConditionBadge } from '../components/TriggerConditionBadge';
import type { Product } from '../types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Crop Insurance',
    category: 'crop',
    triggerType: 'Threshold',
    threshold: '30',
    comparison: 'LessThan',
    coverageMin: '1000000',
    coverageMax: '10000000',
    premiumRate: 500,
    maxDuration: 30,
    status: 'Active',
    ...overrides,
  };
}

describe('TriggerConditionBadge', () => {
  it('renders "<" symbol for LessThan comparison', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ comparison: 'LessThan', threshold: '30' })} />
    );
    expect(html).toContain('&lt; 30');
  });

  it('renders ">" symbol for GreaterThan comparison', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ comparison: 'GreaterThan', threshold: '50' })} />
    );
    expect(html).toContain('&gt; 50');
  });

  it('renders "=" symbol for Equal comparison', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ comparison: 'Equal', threshold: '100' })} />
    );
    expect(html).toContain('= 100');
  });

  it('displays the triggerType', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ triggerType: 'Binary' })} />
    );
    expect(html).toContain('Binary');
  });

  it('applies custom className', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct()} className="custom-class" />
    );
    expect(html).toContain('custom-class');
  });
});
