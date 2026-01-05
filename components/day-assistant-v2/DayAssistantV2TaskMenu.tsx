/**
 * DayAssistantV2TaskMenu - Context menu dropdown for task actions
 * Part of Day Assistant V2 Complete Overhaul
 */

import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import Button from '@/components/ui/Button'
import { DotsThree, Play, Check, MagicWand, PushPin, CalendarX, Trash } from '@phosphor-icons/react'

interface DayAssistantV2TaskMenuProps {
  taskId: string
  isMust: boolean
  onStartTimer: (taskId: string) => void
  onComplete: (taskId: string) => void
  onHelp: (taskId: string) => void
  onPin: (taskId: string) => void
  onPostpone: (taskId: string) => void
  onDelete: (taskId: string) => void
}

export function DayAssistantV2TaskMenu({
  taskId,
  isMust,
  onStartTimer,
  onComplete,
  onHelp,
  onPin,
  onPostpone,
  onDelete
}: DayAssistantV2TaskMenuProps) {
  const handleClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
          <DotsThree size={20} weight="bold" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        side="bottom"
        sideOffset={5}
        collisionPadding={20}
        avoidCollisions={true}
        className="w-56"
      >
        <DropdownMenuItem onClick={(e) => handleClick(e, () => onStartTimer(taskId))}>
          <Play size={16} className="mr-2" weight="fill" />
          Start timer
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => handleClick(e, () => onComplete(taskId))}>
          <Check size={16} className="mr-2" weight="bold" />
          Ukończ
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => handleClick(e, () => onHelp(taskId))}>
          <MagicWand size={16} className="mr-2" />
          🤔 Pomóż mi
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => handleClick(e, () => onPin(taskId))}>
          <PushPin size={16} className="mr-2" />
          {isMust ? 'Odepnij (MUST)' : '📌 Przypnij (MUST)'}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => handleClick(e, () => onPostpone(taskId))}>
          <CalendarX size={16} className="mr-2" />
          📅 Nie dziś
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={(e) => handleClick(e, () => onDelete(taskId))}
          className="text-red-600 focus:text-red-600"
        >
          <Trash size={16} className="mr-2" />
          🗑️ Usuń
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
