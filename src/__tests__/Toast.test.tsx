import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from '../components/Toast';
import type { Toast as ToastType } from '../types';

const mockDismiss = vi.fn();
const mockToasts: ToastType[] = [];

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    toasts: mockToasts,
    dismiss: mockDismiss,
  }),
}));

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToasts.length = 0;
  });

  it('renders an empty live region when no toasts', () => {
    render(<ToastContainer />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('');
  });

  it('keeps the same live region mounted when a toast arrives (#589)', () => {
    const { rerender } = render(<ToastContainer />);
    const region = screen.getByRole('status');
    mockToasts.push({ id: '1', message: 'Saved', variant: 'success', duration: 5000 });
    rerender(<ToastContainer />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Saved');
  });

  it('announces only additions so stacked toasts are not re-read', () => {
    render(<ToastContainer />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-relevant', 'additions');
    expect(region).not.toHaveAttribute('aria-atomic', 'true');
  });

  it('renders a toast', () => {
    mockToasts.push({
      id: '1',
      message: 'Test message',
      variant: 'info',
      duration: 5000,
    });
    render(<ToastContainer />);
    expect(screen.getByRole('status')).toContainElement(screen.getByText('Test message'));
  });

  it('renders multiple toasts', () => {
    mockToasts.push(
      { id: '1', message: 'First', variant: 'info', duration: 5000 },
      { id: '2', message: 'Second', variant: 'success', duration: 5000 }
    );
    render(<ToastContainer />);
    expect(screen.getAllByRole('button', { name: /dismiss/i })).toHaveLength(2);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('dismiss button calls dismiss with id', () => {
    mockToasts.push({
      id: '123',
      message: 'Dismiss me',
      variant: 'error',
      duration: 5000,
    });
    render(<ToastContainer />);
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalledWith('123');
  });

  it('shows correct icon for variant', () => {
    mockToasts.push({
      id: '1',
      message: 'Success toast',
      variant: 'success',
      duration: 5000,
    });
    render(<ToastContainer />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('applies correct styles for variant', () => {
    mockToasts.push({
      id: '1',
      message: 'Error toast',
      variant: 'error',
      duration: 5000,
    });
    render(<ToastContainer />);
    const toast = screen.getByText('Error toast').parentElement!;
    expect(toast.className).toContain('border-red-500/30');
  });
});