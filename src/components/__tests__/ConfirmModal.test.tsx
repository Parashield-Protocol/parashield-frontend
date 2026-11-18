import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmModal } from '../ConfirmModal';

function renderModal(onConfirm: () => void | Promise<void>, onCancel = vi.fn()) {
  render(
    <ConfirmModal
      open
      title="Delete policy"
      message="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onCancel };
}

describe('ConfirmModal async onConfirm (#927)', () => {
  it('calls a synchronous onConfirm', async () => {
    const onConfirm = vi.fn();
    renderModal(onConfirm);

    fireEvent.click(await screen.findByTestId('confirm-action'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the rejection message instead of leaving it unhandled', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Delete failed: entry archived'));
    renderModal(onConfirm);

    fireEvent.click(await screen.findByTestId('confirm-action'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed: entry archived');
    // The dialog stays open so the user can retry or cancel.
    expect(screen.getByTestId('confirm-action')).not.toBeDisabled();
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    renderModal(() => Promise.reject('nope'));

    fireEvent.click(await screen.findByTestId('confirm-action'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('disables both buttons while the confirm promise is pending', async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    renderModal(onConfirm);

    const confirm = await screen.findByTestId('confirm-action');
    fireEvent.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolve();
    await waitFor(() => expect(confirm).not.toBeDisabled());
  });
});
