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

  it('renders nothing when no toasts', () => {
    render(<ToastContainer />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a toast', () => {
    mockToasts.push({
      id: '1',
      message: 'Test message',
      variant: 'info',
      duration: 5000,
    });
    render(<ToastContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    mockToasts.push(
      { id: '1', message: 'First', variant: 'info', duration: 5000 },
      { id: '2', message: 'Second', variant: 'success', duration: 5000 }
    );
    render(<ToastContainer />);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
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
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('border-red-500/30');
  });
});