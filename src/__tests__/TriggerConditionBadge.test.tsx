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
  it('renders plain-language text for LessThan comparison', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ comparison: 'LessThan', threshold: '30' })} />
    );
    expect(html).toContain('Less than 30 mm');
  });

  it('renders plain-language text for GreaterThan comparison', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ comparison: 'GreaterThan', threshold: '50' })} />
    );
    expect(html).toContain('Greater than 50 mm');
  });

  it('renders plain-language text for Equal comparison', () => {
    const html = renderToStaticMarkup(
      <TriggerConditionBadge product={makeProduct({ comparison: 'Equal', threshold: '100' })} />
    );
    expect(html).toContain('Equal to 100 mm');
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
