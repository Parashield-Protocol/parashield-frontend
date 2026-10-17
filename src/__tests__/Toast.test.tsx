import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ToastContainer } from '../components/Toast';
import { Modal } from '../components/Modal';
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

  describe('stacking above modals (#785)', () => {
    it('portals the container to <body> on the toast layer', () => {
      const { container } = render(<ToastContainer />);
      const region = screen.getByRole('status');
      expect(container).not.toContainElement(region);
      expect(region.parentElement).toBe(document.body);
      expect(region.className).toContain('z-(--z-toast)');
    });

    it('stays visible on top when a toast fires while a modal is open', () => {
      // The modal portals to <body> before the toast is raised.
      render(<Modal open onClose={() => {}} title="Buy policy"><p>form</p></Modal>);
      mockToasts.push({ id: '1', message: 'Submit failed', variant: 'error', duration: 5000 });
      render(<ToastContainer />);

      const overlay = document.querySelector('[data-modal-overlay]') as HTMLElement;
      const region  = screen.getByRole('status');
      expect(overlay.parentElement).toBe(document.body);
      expect(region.parentElement).toBe(document.body);
      expect(overlay.className).toContain('z-(--z-modal)');
      expect(region).toHaveTextContent('Submit failed');
      // Pointer events pass through the container so the modal backdrop still works.
      expect(region.className).toContain('pointer-events-none');
    });

    it('defines a toast layer above the modal layer in the z-index scale', () => {
      const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');
      const z = (name: string) => Number(css.match(new RegExp(`--z-${name}:\\s*(\\d+)`))?.[1]);
      expect(z('toast')).toBeGreaterThan(z('modal'));
      expect(z('modal')).toBeGreaterThan(z('sticky'));
      expect(z('sticky')).toBeGreaterThan(z('dropdown'));
    });
  });
});
