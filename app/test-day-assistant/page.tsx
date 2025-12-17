/**
 * Test Day Assistant Page
 * Initialize and display the new test day assistant
 */

'use client'

import MainLayout from '@/components/layout/MainLayout'
import { TestDayAssistantView } from '@/components/test-day-assistant/TestDayAssistantView'

export default function TestDayAssistantPage() {
  return (
    <MainLayout>
      <TestDayAssistantView />
    </MainLayout>
  )
}
