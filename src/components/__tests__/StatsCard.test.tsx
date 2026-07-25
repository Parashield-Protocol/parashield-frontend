import { render, screen } from '@testing-library/react';
import { StatsCard } from '../StatsCard';

describe('StatsCard', () => {
  it('renders label, value and sublabel', () => {
    render(
      <StatsCard label="Revenue" value="$123" sublabel="Today" />,
    );
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$123')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it.each([
    ['up', '↑', 'text-emerald-400'],
    ['down', '↓', 'text-red-400'],
    ['neutral', '→', 'text-gray-400'],
  ])('shows %s trend with correct arrow and colour', (trend, arrow, colourClass) => {
    render(
      <StatsCard
        label="Users"
        value="42"
        trend={trend as any}
        trendValue="+5%"
      />,
    );
    expect(screen.getByText(arrow)).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
    const trendElement = screen.getByText(`${arrow} +5%`);
    expect(trendElement).toHaveClass(colourClass);
  });
});
