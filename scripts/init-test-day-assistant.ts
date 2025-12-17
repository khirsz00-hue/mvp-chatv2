/**
 * Standalone script to initialize test day assistant
 * Run with: npx tsx scripts/init-test-day-assistant.ts <user_id>
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEFAULT_SETTINGS = {
  undo_window: 15,
  max_postpones_before_escalation: 3,
  max_daily_recommendations: 5,
  light_task_limit_minutes: 30,
  morning_must_block_default: 30,
  auto_decompose_threshold: 60
}

async function initializeTestDayAssistant(userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  console.log(`\n🚀 Initializing test day assistant for user: ${userId}\n`)
  
  // Check if assistant already exists
  const { data: existing, error: fetchError } = await supabase
    .from('assistant_config')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'asystent dnia test')
    .single()
  
  if (existing && !fetchError) {
    console.log('✅ Assistant already exists!')
    displayConfirmation(existing)
    return existing
  }
  
  // Create new assistant
  console.log('📝 Creating new assistant...')
  const { data: newAssistant, error: createError } = await supabase
    .from('assistant_config')
    .insert({
      user_id: userId,
      name: 'asystent dnia test',
      type: 'day_planner',
      settings: DEFAULT_SETTINGS,
      is_active: true
    })
    .select()
    .single()
  
  if (createError) {
    console.error('❌ Error creating assistant:', createError)
    return null
  }
  
  console.log('✅ Assistant created successfully!\n')
  displayConfirmation(newAssistant)
  
  return newAssistant
}

function displayConfirmation(assistant: any) {
  const settings = assistant.settings || DEFAULT_SETTINGS
  
  const undoWindow = settings.undo_window || DEFAULT_SETTINGS.undo_window
  const maxPostpones = settings.max_postpones_before_escalation || DEFAULT_SETTINGS.max_postpones_before_escalation
  const morningBlock = settings.morning_must_block_default || DEFAULT_SETTINGS.morning_must_block_default
  
  console.log('╔════════════════════════════════════════════════════════════════════════╗')
  console.log('║                    🎉 ASSISTANT CREATED SUCCESSFULLY 🎉                ║')
  console.log('╠════════════════════════════════════════════════════════════════════════╣')
  console.log('║                                                                        ║')
  console.log('║  Utworzyłem asystenta: asystent dnia test — gotowy do działania.      ║')
  console.log('║                                                                        ║')
  console.log('║  Domyślne ustawienia:                                                  ║')
  console.log(`║    • undo: ${undoWindow}s                                                       ║`)
  console.log(`║    • max_postpones_before_escalation: ${maxPostpones}                           ║`)
  console.log(`║    • morning_must_block: ${morningBlock} min                                     ║`)
  console.log('║                                                                        ║')
  console.log('║  Chcesz zmienić progi lub presety?                                    ║')
  console.log('║                                                                        ║')
  console.log('╚════════════════════════════════════════════════════════════════════════╝')
  console.log()
  console.log('📋 Assistant Details:')
  console.log(`   ID: ${assistant.id}`)
  console.log(`   User ID: ${assistant.user_id}`)
  console.log(`   Type: ${assistant.type}`)
  console.log(`   Active: ${assistant.is_active ? '✅ Yes' : '❌ No'}`)
  console.log(`   Created: ${new Date(assistant.created_at).toLocaleString('pl-PL')}`)
  console.log()
  console.log('🎯 Features:')
  console.log('   • Dual sliders (energia 1-5, skupienie 1-5)')
  console.log('   • MUST tasks management (max 1-3 per day)')
  console.log('   • Live replanning with recommendations')
  console.log('   • "Nie dziś" button with undo mechanism')
  console.log('   • Auto-decomposition for tasks >60 min')
  console.log('   • Postpone tracking and escalation')
  console.log('   • DecisionLog for all user actions')
  console.log('   • Nightly rollover for overdue tasks')
  console.log('   • Soft warnings instead of hard blocks')
  console.log('   • ADHD-friendly interface')
  console.log()
}

// Main execution
const userId = process.argv[2]

if (!userId) {
  console.error('❌ Error: User ID is required')
  console.log('Usage: npx tsx scripts/init-test-day-assistant.ts <user_id>')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

initializeTestDayAssistant(userId)
  .then(() => {
    console.log('✅ Initialization complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
