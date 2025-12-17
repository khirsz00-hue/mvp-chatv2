import MainLayout from '@/components/layout/MainLayout'
import { getWeekSnapshot } from './actions'
import { WeekAssistantClient } from './components/WeekAssistantClient'

export default async function AssistantWeekPage() {
  const snapshot = await getWeekSnapshot()

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <WeekAssistantClient initialData={snapshot} />
      </div>
    </MainLayout>
  )
}
