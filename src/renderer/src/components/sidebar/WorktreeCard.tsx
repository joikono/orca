import React from 'react'

import { WorktreeCardSurface } from './worktree-card-surface'
import type { WorktreeCardProps } from './worktree-card-model'
import { useWorktreeCardController } from './use-worktree-card-controller'
import { useAppStore } from '@/store'
import { selectWorktreeSplitPartnerId } from '@/store/slices/worktree-split-view'

export { shouldBeginWorktreeRename } from './worktree-card-model'
export type { ActiveSurfaceVariant } from './worktree-card-model'

const WorktreeCard = React.memo(function WorktreeCard({
  worktree,
  repo,
  isActive,
  isActiveSurface = isActive,
  activeSurfaceVariant = 'primary',
  isMultiSelected = false,
  revealHighlight = false,
  revealHighlightTone = 'default',
  selectedWorktrees,
  onActivate,
  onWorktreeCardClick,
  onImmediateActivate,
  onSelectionGesture,
  onContextMenuSelect,
  onAssignWorkspaceStatus,
  onCardDragStart,
  onCardDragEnd,
  nativeDragEnabled = true,
  hideRepoBadge,
  hostContextLabel,
  showProjectName,
  inPinnedSection = false,
  activationRowKey,
  renameRowKey,
  contentIndent = 0,
  flushSurface = false,
  lineageChildCount = 0,
  lineageCollapsed = false,
  lineageChildren,
  lineageChildrenStyle,
  onLineageToggle,
  isLineageDropTarget = false,
  affiliateListMode = false,
  statusPrDisplay = null
}: WorktreeCardProps): React.JSX.Element {
  // Why: both halves of an on-screen split are being viewed, so both rows read as active.
  const isShownSplitPartner = useAppStore(
    (state) =>
      state.activeView === 'terminal' && selectWorktreeSplitPartnerId(state) === worktree.id
  )
  const card = useWorktreeCardController({
    worktree,
    repo,
    isActive,
    isActiveSurface: isActiveSurface || isShownSplitPartner,
    activeSurfaceVariant: isShownSplitPartner ? 'primary' : activeSurfaceVariant,
    isMultiSelected,
    revealHighlight,
    revealHighlightTone,
    selectedWorktrees,
    onActivate,
    onWorktreeCardClick,
    onImmediateActivate,
    onSelectionGesture,
    onContextMenuSelect,
    onAssignWorkspaceStatus,
    onCardDragStart,
    onCardDragEnd,
    nativeDragEnabled,
    hideRepoBadge,
    hostContextLabel,
    showProjectName,
    inPinnedSection,
    activationRowKey,
    renameRowKey,
    contentIndent,
    flushSurface,
    lineageChildCount,
    lineageCollapsed,
    lineageChildren,
    lineageChildrenStyle,
    onLineageToggle,
    isLineageDropTarget,
    affiliateListMode,
    statusPrDisplay
  })

  return <WorktreeCardSurface card={card} />
})

export default WorktreeCard
