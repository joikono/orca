import type { StateCreator } from 'zustand'
import type { AppState } from '../types'

const STORAGE_KEY = 'orca.worktreeLastPromptAt.v1'
const RETENTION_MS = 30 * 24 * 60 * 60_000

/** When the user last submitted input (Enter) to any terminal of a worktree, by worktree id.
 *  Why separate from `lastActivityAt`: agent output bumps that one, so it can't tell a stall
 *  waiting on the user from an agent still working. */
export type LastPromptAtByWorktreeId = Readonly<Record<string, number>>

export type WorktreePromptActivitySlice = {
  lastPromptAtByWorktreeId: LastPromptAtByWorktreeId
  recordWorktreePrompt: (worktreeId: string, at?: number) => void
}

/** True when terminal input submits a line: typed Enter or a paste ending a line. */
export function isTerminalPromptSubmit(data: string): boolean {
  return data.includes('\r')
}

export function readPersistedLastPromptAt(now = Date.now()): LastPromptAtByWorktreeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && now - entry[1] < RETENTION_MS
      )
    )
  } catch {
    return {}
  }
}

function writePersistedLastPromptAt(value: LastPromptAtByWorktreeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Why: storage can be blocked or full; the timer just won't survive a restart.
  }
}

export const createWorktreePromptActivitySlice: StateCreator<
  AppState,
  [],
  [],
  WorktreePromptActivitySlice
> = (set, get) => ({
  lastPromptAtByWorktreeId: readPersistedLastPromptAt(),
  recordWorktreePrompt: (worktreeId, at = Date.now()) => {
    const current = get().lastPromptAtByWorktreeId
    if ((current[worktreeId] ?? 0) >= at) {
      return
    }
    const next = { ...current, [worktreeId]: at }
    set({ lastPromptAtByWorktreeId: next })
    writePersistedLastPromptAt(next)
  }
})
