import { render, screen } from '@testing-library/react';
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
});
