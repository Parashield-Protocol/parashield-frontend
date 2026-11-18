import { fireEvent, render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders icon, title and description', () => {
    render(
      <EmptyState
        icon="🚀"
        title="No Data"
        description="There is nothing to show."
      />,
    );
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('There is nothing to show.')).toBeInTheDocument();
  });

  it('renders optional action when provided', () => {
    const action = <button>Retry</button>;
    render(
      <EmptyState
        title="Empty"
        action={action}
      />,
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  describe('built-in CTA (#672)', () => {
    it('calls a custom onClick handler', () => {
      const onAction = vi.fn();
      render(<EmptyState title="Empty" actionLabel="Buy a policy" onAction={onAction} />);
      fireEvent.click(screen.getByRole('button', { name: 'Buy a policy' }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('renders a link for a custom href', () => {
      render(<EmptyState title="Empty" actionLabel="Browse products" actionHref="/products" />);
      expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
    });

    it('keeps a custom action element taking precedence (backward compatible)', () => {
      render(
        <EmptyState
          title="Empty"
          action={<button>Retry</button>}
          actionLabel="Ignored"
          onAction={vi.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(screen.queryByText('Ignored')).toBeNull();
    });

    it('renders no CTA without a label and a handler or href', () => {
      render(<EmptyState title="Empty" actionLabel="Orphan" />);
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
  });
});
