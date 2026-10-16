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

  it('shows a success toast containing the full copied value (#739)', async () => {
    const fullAddress = 'GDXFJ6LPYXIR7TQXJZ7PY4M5G6R2V3T4U5W6X7Y8Z9A0B1C2D3E4F5G6H7';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });

    render(<CopyButton text={fullAddress} label="Copy" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(writeText).toHaveBeenCalledWith(fullAddress);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining(fullAddress),
      'success',
    );
  });

  it('prefers a custom successMessage over the default toast (#739)', async () => {
    const fullAddress = 'GABC';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });

    render(
      <CopyButton
        text={fullAddress}
        successMessage={`Copied full address: ${fullAddress}`}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      `Copied full address: ${fullAddress}`,
      'success',
    );
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