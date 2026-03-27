/**
 * Preservation Property Tests — Property 2: Delete and Fetch Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * OBSERVATION-FIRST METHODOLOGY:
 * These tests were written by observing the UNFIXED code behavior:
 *   - api.get('/api/v1/memories') is called on mount and memories are rendered
 *   - clicking Delete calls window.confirm then api.delete('/api/v1/memories/:id') and removes the card from state
 *   - when api.get returns an empty array, "No memories found." is displayed
 *   - after a successful delete, the memory is removed from the list without a full reload
 *
 * EXPECTED OUTCOME: All tests PASS on unfixed code (baseline behavior to preserve)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import * as fc from 'fast-check';
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

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid memory object with arbitrary id and text */
const memoryArb = fc.record({
  id: fc.uuid(),
  // Use printable ASCII words so getByText can reliably find the text in the DOM
  text: fc
    .array(fc.stringMatching(/^[a-zA-Z0-9]+$/), { minLength: 1, maxLength: 10 })
    .map((words) => words.join(' ')),
  kind: fc.constantFrom('text', 'link', 'document'),
  createdAt: fc
    .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-01-01').getTime() })
    .map((ms) => new Date(ms).toISOString()),
});

/** Generates a non-empty array of memories (1–10 items) */
const nonEmptyMemoriesArb = fc.array(memoryArb, { minLength: 1, maxLength: 10 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderManageMemories() {
  return render(
    <MemoryRouter>
      <ManageMemories />
    </MemoryRouter>,
  );
}

type MemoryItem = { id: string; text: string; kind: string; createdAt: string };

function setupGetMock(memories: MemoryItem[]) {
  (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { success: true, data: memories },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Preservation — Delete and Fetch Behavior Unchanged (Property 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
  });

  // -------------------------------------------------------------------------
  // 3.2 — Fetch on mount
  // -------------------------------------------------------------------------

  it('Property: api.get is called on mount for any non-empty array of memories', async () => {
    // Validates: Requirement 3.2
    await fc.assert(
      fc.asyncProperty(nonEmptyMemoriesArb, async (memories) => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
        setupGetMock(memories);

        const { unmount } = renderManageMemories();

        await waitFor(() => {
          expect(api.get).toHaveBeenCalledWith('/api/v1/memories');
        });

        // All memory texts should be rendered
        for (const memory of memories) {
          expect(screen.getByText(memory.text)).toBeInTheDocument();
        }

        unmount();
      }),
      { numRuns: 5 },
    );
  });

  // -------------------------------------------------------------------------
  // 3.3 — Empty state
  // -------------------------------------------------------------------------

  it('Property: "No memories found." is displayed when api.get returns an empty array', async () => {
    // Validates: Requirement 3.3
    setupGetMock([]);

    renderManageMemories();

    await waitFor(() => {
      expect(screen.getByText('No memories found.')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 3.1 — Delete flow: confirm + api.delete called
  // -------------------------------------------------------------------------

  it('Property: clicking Delete calls window.confirm then api.delete for any memory ID', async () => {
    // Validates: Requirement 3.1
    await fc.assert(
      fc.asyncProperty(memoryArb, async (memory) => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
        setupGetMock([memory]);

        const { unmount } = renderManageMemories();

        await waitFor(() => {
          expect(screen.getByText(memory.text)).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /^delete$/i });
        fireEvent.click(deleteButton);

        expect(window.confirm).toHaveBeenCalledWith(
          'Delete this memory? This cannot be undone.',
        );

        await waitFor(() => {
          expect(api.delete).toHaveBeenCalledWith(`/api/v1/memories/${memory.id}`);
        });

        unmount();
      }),
      { numRuns: 5 },
    );
  });

  it('Property: clicking Delete does NOT call api.delete when user cancels confirm', async () => {
    // Validates: Requirement 3.1 (confirm must be shown; cancel aborts delete)
    await fc.assert(
      fc.asyncProperty(memoryArb, async (memory) => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
        setupGetMock([memory]);

        const { unmount } = renderManageMemories();

        await waitFor(() => {
          expect(screen.getByText(memory.text)).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /^delete$/i });
        fireEvent.click(deleteButton);

        expect(window.confirm).toHaveBeenCalled();
        expect(api.delete).not.toHaveBeenCalled();

        unmount();
      }),
      { numRuns: 5 },
    );
  });

  // -------------------------------------------------------------------------
  // 3.4 — Optimistic removal after delete
  // -------------------------------------------------------------------------

  it('Property: after a successful delete, the memory is removed from the list without a full reload', async () => {
    // Validates: Requirement 3.4
    await fc.assert(
      fc.asyncProperty(
        fc.array(memoryArb, { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 0, max: 5 }),
        async (memories, rawIndex) => {
          const index = rawIndex % memories.length;
          const targetMemory = memories[index];

          vi.clearAllMocks();
          vi.spyOn(window, 'confirm').mockReturnValue(true);
          (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
          // api.get is only called once on mount — no reload should happen
          setupGetMock(memories);

          const { unmount } = renderManageMemories();

          await waitFor(() => {
            expect(screen.getByText(targetMemory.text)).toBeInTheDocument();
          });

          const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
          fireEvent.click(deleteButtons[index]);

          await waitFor(() => {
            expect(screen.queryByText(targetMemory.text)).not.toBeInTheDocument();
          });

          // api.get should only have been called once (on mount) — no full reload
          expect(api.get).toHaveBeenCalledTimes(1);

          unmount();
        },
      ),
      { numRuns: 5 },
    );
  });
});
