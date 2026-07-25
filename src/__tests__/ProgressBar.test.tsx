import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressBar } from '../components/ProgressBar';

describe('ProgressBar', () => {
  it('sets aria-valuenow to computed percentage', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={50} max={100} />
    );
    expect(html).toContain('aria-valuenow="50"');
  });

  it('sets aria-valuemin and aria-valuemax', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={75} max={100} />
    );
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
  });

  it('does not produce NaN when max is 0', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={0} max={0} />
    );
    expect(html).not.toContain('NaN');
    expect(html).toContain('aria-valuenow="0"');
  });

  it('clamps percentage to 100 when value exceeds max', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={150} max={100} />
    );
    expect(html).toContain('aria-valuenow="100"');
  });

  it('clamps percentage to 0 when value is negative', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={-10} max={100} />
    );
    expect(html).toContain('aria-valuenow="0"');
  });

  it('renders label and percentage text when label is provided', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={60} max={200} label="Progress" />
    );
    expect(html).toContain('Progress');
    expect(html).toContain('30%');
  });

  it('does not render label text when label is omitted', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={60} max={100} />
    );
    expect(html).not.toContain('Progress');
  });

  it('applies custom className', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={50} max={100} className="custom" />
    );
    expect(html).toContain('custom');
  });

  it('renders role="progressbar"', () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={50} max={100} />
    );
    expect(html).toContain('role="progressbar"');
  });
});
