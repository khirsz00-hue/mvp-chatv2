import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOpenAIClient } from '@/lib/openai'

// Time period constants
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || ''
          }
        }
      }
    )
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('🔍 [Insights API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 [Insights API] Fetching data for user:', user.id)

    // Fetch journal entries (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('date, energy, motivation, sleep_quality, hours_slept, planned_tasks, completed_tasks_snapshot, notes')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: false })

    console.log('📔 [Insights API] Found', journalEntries?.length || 0, 'journal entries')

    // Fetch completed tasks (last 30 days)
    const { data: completedTasks } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, title, completed_at, cognitive_load, context_type, estimate_min')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString())
      .order('completed_at', { ascending: false })

    console.log('✅ [Insights API] Found', completedTasks?.length || 0, 'completed tasks')

    // Fetch postpone patterns from decision log
    const { data: postpones } = await supabase
      .from('day_assistant_v2_decision_log')
      .select('task_id, action, from_date, to_date, reason, context, timestamp')
      .eq('user_id', user.id)
      .eq('action', 'postpone')
      .gte('timestamp', new Date(Date.now() - THIRTY_DAYS_MS).toISOString())
      .order('timestamp', { ascending: false })

    console.log('⏭️ [Insights API] Found', postpones?.length || 0, 'postpones')

    // Fetch task data to match postpones
    const taskIds = postpones?.map(p => p.task_id).filter(Boolean) || []
    let postponedTasks: any[] = []
    if (taskIds.length > 0) {
      const { data } = await supabase
        .from('day_assistant_v2_tasks')
        .select('id, title, postpone_count')
        .in('id', taskIds)
      postponedTasks = data || []
    }

    // Fetch day plan data (energy/focus levels)
    const { data: dayPlans } = await supabase
      .from('day_assistant_v2_plan')
      .select('plan_date, energy, focus')
      .eq('user_id', user.id)
      .gte('plan_date', thirtyDaysAgoStr)
      .order('plan_date', { ascending: false })

    console.log('📅 [Insights API] Found', dayPlans?.length || 0, 'day plans')

    // Fetch active tasks for add/complete ratio
    const { data: activeTasks } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gte('created_at', new Date(Date.now() - SEVEN_DAYS_MS).toISOString())

    // Calculate statistics matching the problem statement requirements
    const stats = {
      journal_entries_count: journalEntries?.length || 0,
      completed_tasks_count: completedTasks?.length || 0,
      postponements_count: postpones?.length || 0,
      days_with_plan: dayPlans?.length || 0,
      avg_energy: 0,
      avg_motivation: 0,
      avg_sleep_quality: 0,
      avg_hours_slept: 0,
      tasks_added_last_7_days: 0,
      tasks_completed_last_7_days: 0,
    }

    if (journalEntries && journalEntries.length > 0) {
      const totals = journalEntries.reduce((acc, entry) => ({
        sleep: acc.sleep + (entry.hours_slept || 0),
        energy: acc.energy + (entry.energy || 0),
        motivation: acc.motivation + (entry.motivation || 0),
        quality: acc.quality + (entry.sleep_quality || 0),
        count: acc.count + 1
      }), { sleep: 0, energy: 0, motivation: 0, quality: 0, count: 0 })

      stats.avg_hours_slept = Math.round((totals.sleep / totals.count) * 10) / 10
      stats.avg_energy = Math.round((totals.energy / totals.count) * 10) / 10
      stats.avg_motivation = Math.round((totals.motivation / totals.count) * 10) / 10
      stats.avg_sleep_quality = Math.round((totals.quality / totals.count) * 10) / 10
    }

    // Count tasks completed in last 7 days
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS)
    stats.tasks_completed_last_7_days = completedTasks?.filter(t => 
      new Date(t.completed_at) >= sevenDaysAgo
    ).length || 0
    
    // Count all tasks (active + completed) created in last 7 days for accurate completion rate
    const { data: allRecentTasks } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, completed')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - SEVEN_DAYS_MS).toISOString())
    
    stats.tasks_added_last_7_days = allRecentTasks?.length || 0

    console.log('📊 [Insights API] Statistics:', stats)

    // Prepare data for AI analysis
    const analysisData = {
      journalEntries: journalEntries?.map(e => ({
        date: e.date,
        energy: e.energy,
        motivation: e.motivation,
        sleep_hours: e.hours_slept,
        sleep_quality: e.sleep_quality,
        planned: e.planned_tasks,
        completed: e.completed_tasks_snapshot?.length || 0
      })) || [],
      completedTasks: completedTasks?.map(t => ({
        title: t.title,
        date: t.completed_at?.split('T')[0],
        cognitive_load: t.cognitive_load,
        context: t.context_type
      })) || [],
      postponePatterns: postpones?.map(p => {
        const task = postponedTasks.find(t => t.id === p.task_id)
        return {
          task_title: task?.title || 'Unknown',
          postpone_count: task?.postpone_count || 1,
          reason: p.reason,
          energy_at_postpone: p.context?.energy
        }
      }) || [],
      dayPlans: dayPlans || [],
      stats
    }

    // Generate insights with OpenAI
    const openai = getOpenAIClient()
    
    const prompt = `Przeanalizuj RZECZYWISTE dane użytkownika z ostatnich 30 dni i wygeneruj 5-7 KONKRETNYCH insightów z FAKTAMI.

JOURNAL DATA (ostatnie ${stats.journal_entries_count} wpisów):
${analysisData.journalEntries.slice(0, 10).map(e => 
  `- ${e.date}: energy=${e.energy}, motivation=${e.motivation}, sleep=${e.sleep_hours}h (quality=${e.sleep_quality})`
).join('\n')}

TASK COMPLETION PATTERNS:
- Ukończone zadania ostatnie 30 dni: ${stats.completed_tasks_count}
- Ostatnie 7 dni: dodano ${stats.tasks_added_last_7_days}, ukończono ${stats.tasks_completed_last_7_days}
- Context types breakdown: ${JSON.stringify(analysisData.completedTasks.reduce((acc: any, t: any) => { 
  acc[t.context] = (acc[t.context] || 0) + 1; return acc 
}, {}))}

POSTPONE PATTERNS:
${analysisData.postponePatterns.slice(0, 5).map(p => 
  `- "${p.task_title}": ${p.postpone_count} przełożeń, powód: ${p.reason || 'brak'}`
).join('\n')}

FREQUENTLY POSTPONED TASKS:
${postponedTasks?.filter((t: any) => (t.postpone_count || 0) > 2).slice(0, 5).map((t: any) => 
  `- "${t.title}": ${t.postpone_count} przełożeń`
).join('\n') || '- Brak zadań przełożonych wielokrotnie'}

KORELACJE DO WYKRYCIA:
1. Sleep hours/quality → task completion rate
2. Energy (journal) → tasks completed that day  
3. Motivation trends by day of week
4. Tasks by context_type and cognitive_load
5. Postpone patterns (which tasks, when, why)
6. Plan vs reality (planned vs completed)

ZASADY GENEROWANIA INSIGHTÓW:
- Każdy insight MUSI mieć konkretne liczby i fakty
- Format: tytuł + opis z danymi + "details" z raw values
- Typy: "info" (niebieski), "warning" (pomarańczowy), "success" (zielony)
- Minimum 5, maksimum 7 insightów
- Język: polski, bezpośredni, konkretny

Przykłady DOBRYCH insightów:
✅ { "type": "info", "title": "Efektywność przy 7h snu", "description": "Przy 7+ godzinach snu kończysz średnio 6 zadań dziennie. Przy <6h - tylko 2 zadania.", "details": { "avg_tasks_7h_plus": 6, "avg_tasks_under_6h": 2, "avg_energy_7h_plus": 7.2 } }
✅ { "type": "warning", "title": "Niska jakość snu wpływa na motywację", "description": "Dni z jakością snu <5/10 mają 40% niższą motywację i 3x więcej przełożeń.", "details": { "sleep_quality_threshold": 5, "motivation_drop": "40%", "postpone_increase": "3x" } }
✅ { "type": "success", "title": "100% ukończonych zadań w ostatnich 7 dniach", "description": "Świetna passa! Ukończyłeś wszystkie ${stats.tasks_completed_last_7_days} zadania z ${stats.tasks_added_last_7_days} dodanych.", "details": { "completion_rate": "100%", "tasks_completed": ${stats.tasks_completed_last_7_days}, "tasks_added": ${stats.tasks_added_last_7_days} } }

Zwróć JSON:
{
  "insights": [
    {
      "type": "info" | "warning" | "success",
      "title": "Krótki tytuł (max 50 znaków)",
      "description": "Opis z konkretnymi liczbami i faktami (max 150 znaków)", 
      "details": { "key1": value1, "key2": value2 }
    }
  ]
}`

    console.log('🤖 [Insights API] Generating AI insights...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Jesteś asystentem ADHD który analizuje RZECZYWISTE dane użytkownika i generuje KONKRETNE, PERSONALNE insighty z faktami i liczbami. Nie używasz ogólników.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    let result
    try {
      result = JSON.parse(completion.choices[0].message.content || '{"insights":[]}')
    } catch (parseError) {
      console.error('❌ [Insights API] Failed to parse OpenAI response:', parseError)
      result = { insights: [] }
    }
    
    console.log('✅ [Insights API] Generated', result.insights?.length || 0, 'insights')

    return NextResponse.json({
      stats,
      insights: result.insights || [],
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ [Insights API] Error generating insights:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate insights',
      insights: [] 
    }, { status: 500 })
  }
}
