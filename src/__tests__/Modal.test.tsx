import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Modal } from '../components/Modal';

describe('Modal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('contains scroll inside the dialog so it cannot chain to the page (#552)', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('overflow-y-auto');
    expect(dialog.className).toContain('overscroll-contain');
    expect(dialog.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(dialog.parentElement?.className).toContain('overscroll-contain');
  });

  it('has aria-modal attribute', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape key', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    render(<Modal {...defaultProps} />);
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on dialog click', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('focuses a focusable element on open', () => {
    render(
      <Modal {...defaultProps}>
        <button>First button</button>
        <button>Second button</button>
      </Modal>
    );
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    expect(closeButton).toHaveFocus();
  });

  it('restores focus to trigger on close', () => {
    const TriggerButton = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal {...defaultProps} open={open} onClose={() => setOpen(false)}>
            <div>Content</div>
          </Modal>
        </>
      );
    };

    render(<TriggerButton />);
    const openButton = screen.getByText('Open');
    openButton.focus();
    
    fireEvent.click(openButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Close modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(openButton).toHaveFocus();
  });

  it('renders close button with title', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
  });

  it('renders close button without title', () => {
    const { title, ...propsWithoutTitle } = defaultProps;
    render(<Modal {...propsWithoutTitle} />);
    expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
  });

  it('sets body overflow hidden when open', () => {
    render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow on close', () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<Modal {...defaultProps} open={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('marks the app root aria-hidden while open and restores it on close (#738)', () => {
    const root = document.createElement('div');
    root.id = '__next';
    document.body.appendChild(root);
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(root.getAttribute('aria-hidden')).toBe('true');

    rerender(<Modal {...defaultProps} open={false} />);
    expect(root.getAttribute('aria-hidden')).toBeNull();
    root.remove();
  });

  it('portals the dialog to document.body so hiding the app root does not hide it (#738)', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(document.body.contains(dialog)).toBe(true);
  });
});