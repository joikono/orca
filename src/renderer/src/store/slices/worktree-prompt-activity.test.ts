import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatPromptIdleElapsed } from '@/components/sidebar/worktree-card-header-trailing'
import { createTestStore } from './store-test-helpers'
import { isTerminalPromptSubmit, readPersistedLastPromptAt } from './worktree-prompt-activity'

describe('worktree prompt activity', () => {
  it('counts only line submissions as prompts', () => {
    expect(isTerminalPromptSubmit('\r')).toBe(true)
    expect(isTerminalPromptSubmit('fix the test\r')).toBe(true)
    expect(isTerminalPromptSubmit('a')).toBe(false)
    expect(isTerminalPromptSubmit('\x1b[A')).toBe(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the latest prompt per worktree and survives a reload', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    })
    const store = createTestStore()
    store.getState().recordWorktreePrompt('wt-a', 2_000)
    store.getState().recordWorktreePrompt('wt-a', 1_000)
    store.getState().recordWorktreePrompt('wt-b', 3_000)

    expect(store.getState().lastPromptAtByWorktreeId).toEqual({ 'wt-a': 2_000, 'wt-b': 3_000 })
    expect(readPersistedLastPromptAt(4_000)).toEqual({ 'wt-a': 2_000, 'wt-b': 3_000 })
  })

  it('formats the elapsed time as a stopwatch', () => {
    expect(formatPromptIdleElapsed(42_000)).toBe('0:42')
    expect(formatPromptIdleElapsed(12 * 60_000 + 5_000)).toBe('12:05')
    expect(formatPromptIdleElapsed(3_725_000)).toBe('1:02:05')
    expect(formatPromptIdleElapsed(27 * 3_600_000)).toBe('1d 3h')
  })
})
