import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOpenAIClient } from '@/lib/openai'

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
      .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('completed_at', { ascending: false })

    console.log('✅ [Insights API] Found', completedTasks?.length || 0, 'completed tasks')

    // Fetch postpone patterns from decision log
    const { data: postpones } = await supabase
      .from('day_assistant_v2_decision_log')
      .select('task_id, action, from_date, to_date, reason, context, timestamp')
      .eq('user_id', user.id)
      .eq('action', 'postpone')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
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
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Calculate statistics
    const stats = {
      avgSleepHours: 0,
      avgEnergy: 0,
      avgMotivation: 0,
      avgSleepQuality: 0,
      completionRate: 0,
      tasksAddedLast7Days: activeTasks?.length || 0,
      tasksCompletedLast7Days: 0,
    }

    if (journalEntries && journalEntries.length > 0) {
      const totals = journalEntries.reduce((acc, entry) => ({
        sleep: acc.sleep + (entry.hours_slept || 0),
        energy: acc.energy + (entry.energy || 0),
        motivation: acc.motivation + (entry.motivation || 0),
        quality: acc.quality + (entry.sleep_quality || 0),
        count: acc.count + 1
      }), { sleep: 0, energy: 0, motivation: 0, quality: 0, count: 0 })

      stats.avgSleepHours = Math.round((totals.sleep / totals.count) * 10) / 10
      stats.avgEnergy = Math.round((totals.energy / totals.count) * 10) / 10
      stats.avgMotivation = Math.round((totals.motivation / totals.count) * 10) / 10
      stats.avgSleepQuality = Math.round((totals.quality / totals.count) * 10) / 10
    }

    // Count tasks completed in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    stats.tasksCompletedLast7Days = completedTasks?.filter(t => 
      new Date(t.completed_at) >= sevenDaysAgo
    ).length || 0

    // Calculate completion rate
    if (stats.tasksAddedLast7Days > 0) {
      stats.completionRate = Math.round((stats.tasksCompletedLast7Days / stats.tasksAddedLast7Days) * 100)
    }

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
    
    const prompt = `Przeanalizuj RZECZYWISTE dane użytkownika z ostatnich 30 dni i wygeneruj 5 KONKRETNYCH, PERSONALNYCH insightów.

DANE Z DZIENNIKA (ostatnie wpisy):
${analysisData.journalEntries.slice(0, 10).map(e => 
  `- ${e.date}: energia=${e.energy}/10, motywacja=${e.motivation}/10, sen=${e.sleep_hours}h (jakość=${e.sleep_quality}/10), ukończono=${e.completed} zadań`
).join('\n')}

UKOŃCZONE ZADANIA (ostatnie 14 dni):
${analysisData.completedTasks.slice(0, 20).map(t => 
  `- "${t.title}" (${t.date}) - load=${t.cognitive_load}, context=${t.context}`
).join('\n')}

WZORCE PRZEŁOŻEŃ:
${analysisData.postponePatterns.slice(0, 10).map(p => 
  `- "${p.task_title}" przełożone ${p.postpone_count}x, energia przy postpone: ${p.energy_at_postpone || 'N/A'}`
).join('\n')}

STATYSTYKI:
- Średni sen: ${stats.avgSleepHours}h (jakość: ${stats.avgSleepQuality}/10)
- Średnia energia: ${stats.avgEnergy}/10
- Średnia motywacja: ${stats.avgMotivation}/10
- Ostatnie 7 dni: ${stats.tasksAddedLast7Days} dodanych, ${stats.tasksCompletedLast7Days} ukończonych (${stats.completionRate}%)

ZADANIE:
Wygeneruj 5 insightów które:
1. Bazują na FAKTYCZNYCH danych (podaj liczby!)
2. Pokazują KORELACJE (np. sen → produktywność)
3. Identyfikują WZORCE (np. zadania przełożone wielokrotnie)
4. Dają KONKRETNE sugestie akcji
5. Są PERSONALNE (nie ogólnikowe!)

Przykłady DOBRYCH insightów:
✅ "Przy 7.5h+ snu kończysz średnio 6 zadań/dzień, przy <6h tylko 2. Twój sweet spot: 7-8h."
✅ "Zadanie 'Raport Q4' przełożyłeś 8 razy, zawsze gdy energia<5. Zaplanuj je na dzień z energią>7."
✅ "W czwartki Twoja motywacja spada do 3/10 (inne dni: 7/10). Masz 70% więcej postpones. Co się dzieje?"

Przykłady ZŁYCH insightów:
❌ "Przeciążenie zadań" (za ogólne, bez liczb)
❌ "Dobra organizacja" (bez faktów)
❌ "Rozważ priorytetyzację" (bez konkretów)

Zwróć JSON:
{
  "insights": [
    {
      "type": "warning" | "success" | "info",
      "title": "Krótki tytuł z liczbami",
      "description": "1-2 zdania z faktami i sugestią akcji",
      "data": { "metric": "value" }
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

    const result = JSON.parse(completion.choices[0].message.content || '{"insights":[]}')
    
    console.log('✅ [Insights API] Generated', result.insights?.length || 0, 'insights')

    return NextResponse.json({
      insights: result.insights || [],
      stats,
      dataAvailable: {
        journalEntries: journalEntries?.length || 0,
        completedTasks: completedTasks?.length || 0,
        postpones: postpones?.length || 0,
        dayPlans: dayPlans?.length || 0
      }
    })

  } catch (error: any) {
    console.error('❌ [Insights API] Error generating insights:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate insights',
      insights: [] 
    }, { status: 500 })
  }
}
