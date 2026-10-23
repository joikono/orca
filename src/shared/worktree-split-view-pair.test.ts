import { describe, expect, it } from 'vitest'
import { restorableWorktreeSplitViewPair } from './worktree-split-view-pair'

const PAIR = {
  leftWorktreeId: 'wt-a',
  leftExecutionHostId: null,
  rightWorktreeId: 'wt-b',
  rightExecutionHostId: null
}
const VALID = new Set(['wt-a', 'wt-b'])

describe('restorableWorktreeSplitViewPair', () => {
  it('keeps a pair whose sides both exist', () => {
    expect(restorableWorktreeSplitViewPair(PAIR, VALID)).toBe(PAIR)
  })

  it('drops a pair with a missing side', () => {
    expect(restorableWorktreeSplitViewPair(PAIR, new Set(['wt-a']))).toBeNull()
  })

  it('drops a corrupt pair that names one worktree twice', () => {
    const corrupt = { ...PAIR, rightWorktreeId: 'wt-a' }
    expect(restorableWorktreeSplitViewPair(corrupt, VALID)).toBeNull()
  })

  it('reads an absent pair as no split', () => {
    expect(restorableWorktreeSplitViewPair(undefined, VALID)).toBeNull()
  })
})
