import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import Button from '@/components/ui/Button'
import { DotsThree, Check, ArrowsClockwise, PushPin, MagicWand, Trash, Pencil } from '@phosphor-icons/react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

interface TaskContextMenuProps {
  task: TestDayTask
  onComplete: () => void
  onNotToday: () => void
  onPin?: () => void
  onDecompose?: () => void
  onDelete?: () => void
  onEdit?: () => void
}

export function TaskContextMenu({
  task,
  onComplete,
  onNotToday,
  onPin,
  onDecompose,
  onDelete,
  onEdit
}: TaskContextMenuProps) {
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

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => handleClick(e, onComplete)}>
          <Check size={16} className="mr-2" />
          Ukończ
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => handleClick(e, onNotToday)}>
          <ArrowsClockwise size={16} className="mr-2" />
          Nie dziś
        </DropdownMenuItem>

        {onPin && (
          <DropdownMenuItem onClick={(e) => handleClick(e, onPin)}>
            <PushPin size={16} className="mr-2" />
            {task.is_must ? 'Odepnij z MUST' : 'Przypnij jako MUST'}
          </DropdownMenuItem>
        )}

        {onDecompose && (
          <DropdownMenuItem onClick={(e) => handleClick(e, onDecompose)}>
            <MagicWand size={16} className="mr-2" />
            ⚡ Pomóż mi
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onEdit && (
          <DropdownMenuItem onClick={(e) => handleClick(e, onEdit)}>
            <Pencil size={16} className="mr-2" />
            Edytuj
          </DropdownMenuItem>
        )}

        {onDelete && (
          <DropdownMenuItem onClick={(e) => handleClick(e, onDelete)} className="text-red-600">
            <Trash size={16} className="mr-2" />
            Usuń
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
