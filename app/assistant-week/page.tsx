import { getWeekSnapshot } from './actions'
import { WeekAssistantClient } from './components/WeekAssistantClient'

export default async function AssistantWeekPage() {
  const snapshot = await getWeekSnapshot()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <WeekAssistantClient initialData={snapshot} />
      </div>
    </div>
  )
}
