/**
 * TaskDetailsModal Component
 * Displays full task details including description, subtasks, postpone history
 */

'use client'

import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { XCircle, CheckCircle, Clock } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { TaskBadges } from './TaskBadges'

interface TaskDetailsModalProps {
  task: TestDayTask
  onClose: () => void
  selectedDate: string
}

export function TaskDetailsModal({ task, onClose, selectedDate }: TaskDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {task.is_must && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                  MUST
                </span>
              )}
              <TaskBadges task={task} today={selectedDate} />
              {task.context_type && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {task.context_type}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-semibold">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Estymat</p>
              <p className="font-medium">{task.estimate_min} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cognitive Load</p>
              <p className="font-medium">{task.cognitive_load}/5</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Priorytet</p>
              <p className="font-medium">{task.priority}/4</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Opis</h3>
            {task.description ? (
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-muted-foreground italic">Brak opisu</p>
            )}
          </div>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Kroki ({task.subtasks.length})</h3>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    {subtask.completed ? (
                      <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded border-2 border-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                        {subtask.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock size={12} className="inline mr-1" />
                        {subtask.estimated_duration} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Postpone History */}
          {task.postpone_count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-amber-800">Historia przeniesień</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Przełożone:</span> {task.postpone_count} razy
                </p>
                {task.moved_from_date && (
                  <p>
                    <span className="font-medium">Ostatnio przeniesione z:</span>{' '}
                    {task.moved_from_date}
                  </p>
                )}
                {task.moved_reason && (
                  <p>
                    <span className="font-medium">Powód:</span> {task.moved_reason}
                  </p>
                )}
                {task.last_moved_at && (
                  <p>
                    <span className="font-medium">Kiedy:</span>{' '}
                    {new Date(task.last_moved_at).toLocaleString('pl-PL')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tagi</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>Utworzone: {new Date(task.created_at).toLocaleString('pl-PL')}</p>
            <p>Ostatnia aktualizacja: {new Date(task.updated_at).toLocaleString('pl-PL')}</p>
            {task.completed_at && (
              <p>Ukończone: {new Date(task.completed_at).toLocaleString('pl-PL')}</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end">
          <Button onClick={onClose}>Zamknij</Button>
        </div>
      </div>
    </div>
  )
}
