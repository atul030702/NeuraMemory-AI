/**
 * Bug Condition Exploration Test — Property 1: Edit Affordance Missing
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3
 *
 * CRITICAL: This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * NOTE: This test encodes the expected behavior — it will validate the fix when
 * it passes after implementation.
 *
 * Expected counterexamples on unfixed code:
 *   - No element with role="button" and accessible name "Edit" found in rendered card
 *   - No <textarea> rendered after simulating an edit button click
 *   - api.patch is never called after editing text and clicking Save
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import ManageMemories from '../ManageMemories';

// Mock the api module
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

import { api } from '../../lib/api';

const mockMemory = {
  id: 'memory-abc-123',
  text: 'User prefers dark mode',
  kind: 'text',
  createdAt: new Date('2024-01-15').toISOString(),
};

function renderManageMemories() {
  return render(
    <MemoryRouter>
      <ManageMemories />
    </MemoryRouter>,
  );
}

describe('Bug Condition — Edit Affordance Missing (Property 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [mockMemory] },
    });
  });

  it('should display an edit button on each memory card', async () => {
    // Validates: Requirements 2.1
    // BUG: No edit button is rendered — this assertion WILL FAIL on unfixed code
    renderManageMemories();

    await waitFor(() => {
      expect(screen.getByText('User prefers dark mode')).toBeInTheDocument();
    });

    // Assert edit button is present (pencil icon or aria-label "Edit")
    const editButton = screen.getByRole('button', { name: /edit/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should switch card text to an editable textarea pre-filled with memory text when edit button is clicked', async () => {
    // Validates: Requirements 2.2
    // BUG: No edit button exists to click, and no textarea is rendered — this WILL FAIL on unfixed code
    renderManageMemories();

    await waitFor(() => {
      expect(screen.getByText('User prefers dark mode')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // After clicking edit, a textarea should appear pre-filled with the memory text
    // Use getAllByRole since the search input is also a textbox; find the textarea element
    const textboxes = screen.getAllByRole('textbox');
    const textarea = textboxes.find((el) => el.tagName === 'TEXTAREA');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('User prefers dark mode');
  });

  it('should call api.patch with the correct memory ID and new text when Save is clicked', async () => {
    // Validates: Requirements 2.3
    // BUG: No edit handler or PATCH call exists — this WILL FAIL on unfixed code
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, message: 'Memory updated.' },
    });

    renderManageMemories();

    await waitFor(() => {
      expect(screen.getByText('User prefers dark mode')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Edit the text in the textarea (use getAllByRole since search input is also a textbox)
    const textboxes = screen.getAllByRole('textbox');
    const textarea = textboxes.find((el) => el.tagName === 'TEXTAREA')!;
    fireEvent.change(textarea, { target: { value: 'User prefers light mode' } });

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Assert api.patch was called with the correct ID and new text
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        `/api/v1/memories/${mockMemory.id}`,
        { text: 'User prefers light mode' },
      );
    });
  });
});
