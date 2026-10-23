import React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { TerminalSquare } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore } from '../store'
import { useWorktreeMap } from '../store/selectors'
import { resolveTerminalTabTitle } from '../../../shared/tab-title-resolution'

/** Names a split-view half and the terminals open in it, so the two sides read apart at a glance. */
export function WorktreeSplitSurfaceHeader({
  worktreeId,
  ownsWorkspaceInput
}: {
  worktreeId: string
  ownsWorkspaceInput: boolean
}): React.JSX.Element {
  const worktree = useWorktreeMap().get(worktreeId)
  const terminalTitles = useAppStore(
    useShallow((state) => {
      const generatedTitlesEnabled = state.settings?.tabAutoGenerateTitle === true
      return (state.tabsByWorktree[worktreeId] ?? []).map((tab) =>
        resolveTerminalTabTitle(tab, generatedTitlesEnabled, tab.title)
      )
    })
  )
  const name =
    worktree?.displayName?.trim() || worktree?.path.split(/[\\/]/).findLast(Boolean) || worktreeId
  return (
    <div
      className="flex h-6 min-w-0 items-center gap-2 overflow-hidden px-2 text-[11px] leading-none"
      data-worktree-split-header=""
    >
      <span
        className={cn(
          'shrink-0 truncate',
          ownsWorkspaceInput ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}
      >
        {name}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-muted-foreground">
        {terminalTitles.map((title, index) => (
          <span key={index} className="inline-flex min-w-0 shrink items-center gap-0.5">
            <TerminalSquare className="size-3 shrink-0" />
            <span className="truncate">{title}</span>
          </span>
        ))}
      </span>
    </div>
  )
}
