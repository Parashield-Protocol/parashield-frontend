import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingRegion } from '../components/LoadingRegion';
import { SkeletonCard } from '../components/Skeleton';

function Fixture({ loading, label }: { loading: boolean; label?: string }) {
  return (
    <LoadingRegion loading={loading} label={label}>
      {loading ? <SkeletonCard /> : <p>Loaded content</p>}
    </LoadingRegion>
  );
}

describe('LoadingRegion', () => {
  it('marks the container aria-busy while loading', () => {
    const { container } = render(<Fixture loading />);
    expect(container.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
  });

  it('announces "Loading" through a polite live region by default', () => {
    render(<Fixture loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading');
  });

  it('announces a custom label', () => {
    render(<Fixture loading label="Loading policies" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading policies');
  });

  it('keeps the live region outside the busy container', () => {
    const { container } = render(<Fixture loading />);
    const busy = container.querySelector('[aria-busy]');
    expect(busy).not.toContainElement(screen.getByRole('status'));
  });

  it('clears the busy state and announcement once loaded', () => {
    const { container, rerender } = render(<Fixture loading />);
    const status = screen.getByRole('status');

    rerender(<Fixture loading={false} />);

    expect(container.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
    // Same node persists across the transition so screen readers track it.
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
    expect(screen.getByText('Loaded content')).toBeInTheDocument();
  });

  it('applies className to the busy container', () => {
    const { container } = render(
      <LoadingRegion loading className="grid gap-4">
        <span />
      </LoadingRegion>,
    );
    expect(container.querySelector('[aria-busy]')).toHaveClass('grid', 'gap-4');
  });
});
