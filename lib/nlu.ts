// Prosty parser poleceń użytkownika (NLU)
export function parseCommand(input: string) {
  const text = input.toLowerCase().trim()
  if (text.includes('jutro')) return { action: 'show', filter: 'tomorrow' }
  if (text.includes('dzis')) return { action: 'show', filter: 'today' }
  if (text.includes('tydzień') || text.includes('tydzien')) return { action: 'show', filter: 'week' }
  if (text.includes('przeterminowane')) return { action: 'show', filter: 'overdue' }
  if (text.startsWith('dodaj')) return { action: 'add' }
  if (text.startsWith('ukończ')) return { action: 'complete' }
  if (text.startsWith('przełóż')) return { action: 'reschedule' }
  return { action: 'chat', text }
}
