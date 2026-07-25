import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyButton } from '../components/CopyButton';

const mockShowToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ show: mockShowToast }),
}));

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with default label', () => {
    render(<CopyButton text="test" />);
    expect(screen.getByRole('button', { name: /copy value/i })).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<CopyButton text="test" label="Copy this" />);
    expect(screen.getByRole('button', { name: /copy this/i })).toBeInTheDocument();
  });

  it('calls clipboard API with correct text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });

    render(<CopyButton text="hello world" />);
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('shows "Copied" temporarily after click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });

    render(<CopyButton text="test" />);
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });
    // Wait for async clipboard write
    await act(async () => {
      await Promise.resolve();
    });
    expect(button).toHaveTextContent('✓ Copied');

    // Advance time to trigger the timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button).toHaveTextContent('Copy');
  });

  it('shows toast on clipboard error', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard error'));
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });

    render(<CopyButton text="test" />);
    screen.debug();
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockShowToast).toHaveBeenCalledWith('Copy failed – please copy the text manually', 'error');
  });

  it('uses execCommand fallback when clipboard API unavailable', async () => {
    Object.assign(navigator, { clipboard: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(<CopyButton text="fallback test" />);
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(button).toHaveTextContent('✓ Copied');
  });

  it('clears timer on unmount', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { unmount } = render(<CopyButton text="test" />);
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});