import React, { useEffect, useState } from 'react'
import { Columns2, Pause } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNow } from '@/hooks/use-now'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { isWorktreeInSplitViewPair } from '@/store/slices/worktree-split-view'
import type { WorktreeCardPrDisplay } from './worktree-card-pr-display'
import { getReviewLabel, ReviewIcon } from './worktree-review-helpers'
import { useWorktreeActivityStatus } from './use-worktree-activity-status'

const PROMPT_IDLE_WARN_MS = 15 * 60_000
const PROMPT_IDLE_ALERT_MS = 60 * 60_000

/** Stopwatch label: "0:42", "12:05", "1:02:05", then "2d 3h" past a day. */
export function formatPromptIdleElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`
}

function promptIdleTone(elapsedMs: number): string {
  if (elapsedMs >= PROMPT_IDLE_ALERT_MS) {
    return 'text-destructive'
  }
  if (elapsedMs >= PROMPT_IDLE_WARN_MS) {
    return 'text-amber-700 dark:text-amber-300'
  }
  return 'text-muted-foreground'
}

// Why module scope: cards remount on sidebar reflow, and the stop time must not reset with them.
const stoppedAtByWorktreeId = new Map<string, number>()

/** When the worktree's agents last stopped working after the prompt, or null while one still runs. */
function usePromptTimerStoppedAt(worktreeId: string, lastPromptAt: number): number | null {
  const status = useWorktreeActivityStatus(worktreeId)
  const isRunning = status === 'working' || status === 'monitoring'
  const [stoppedAt, setStoppedAt] = useState<number | null>(null)
  useEffect(() => {
    if (isRunning) {
      stoppedAtByWorktreeId.delete(worktreeId)
      setStoppedAt(null)
      return
    }
    const known = stoppedAtByWorktreeId.get(worktreeId)
    const next = known !== undefined && known >= lastPromptAt ? known : Date.now()
    stoppedAtByWorktreeId.set(worktreeId, next)
    setStoppedAt(next)
  }, [isRunning, lastPromptAt, worktreeId])
  return stoppedAt
}

// Why split out: only cards with a recorded prompt subscribe to the 1s tick.
function PromptIdleTimerLabel({
  worktreeId,
  lastPromptAt
}: {
  worktreeId: string
  lastPromptAt: number
}): React.JSX.Element {
  const stoppedAt = usePromptTimerStoppedAt(worktreeId, lastPromptAt)
  const now = useNow(1000, stoppedAt === null)
  const elapsedMs = Math.max(0, (stoppedAt ?? now) - lastPromptAt)
  const label = formatPromptIdleElapsed(elapsedMs)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none tabular-nums',
            promptIdleTone(elapsedMs),
            stoppedAt !== null && 'opacity-60'
          )}
          data-worktree-prompt-idle-timer=""
          data-stopped={stoppedAt !== null ? '' : undefined}
        >
          {stoppedAt !== null ? <Pause className="size-2.5" /> : null}
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {translate(
          'auto.components.sidebar.WorktreeCard.promptIdleTimer',
          '{{value0}} since you last sent input to a terminal here',
          { value0: label }
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function SplitPairMarker({ worktreeId }: { worktreeId: string }): React.JSX.Element | null {
  const isPaired = useAppStore((state) =>
    isWorktreeInSplitViewPair(state.worktreeSplitViewPair, worktreeId)
  )
  if (!isPaired) {
    return null
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 items-center" data-worktree-split-pair-marker="">
          <Columns2 className="size-3 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {translate(
          'auto.components.sidebar.WorktreeCard.splitPairMarker',
          'Part of the split view. Open either side to show both.'
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function ReviewNumberBadge({
  review
}: {
  review: WorktreeCardPrDisplay
}): React.JSX.Element | null {
  if (!('number' in review) || typeof review.number !== 'number') {
    return null
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none tabular-nums text-muted-foreground"
          data-worktree-review-number=""
        >
          <ReviewIcon review={review} className="size-3" />#{review.number}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {translate(
          'auto.components.sidebar.WorktreeCard.reviewNumberBadge',
          '{{value0}} #{{value1}}',
          { value0: getReviewLabel(review), value1: review.number }
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/** Top-right cues on a sidebar card: time since the last prompt, split membership, and the PR number. */
export function WorktreeCardHeaderTrailing({
  worktreeId,
  prDisplay
}: {
  worktreeId: string
  prDisplay: WorktreeCardPrDisplay | null
}): React.JSX.Element | null {
  const lastPromptAt = useAppStore((state) => state.lastPromptAtByWorktreeId?.[worktreeId])
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {lastPromptAt !== undefined ? (
        <PromptIdleTimerLabel worktreeId={worktreeId} lastPromptAt={lastPromptAt} />
      ) : null}
      <SplitPairMarker worktreeId={worktreeId} />
      {prDisplay ? <ReviewNumberBadge review={prDisplay} /> : null}
    </div>
  )
}
