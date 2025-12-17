'use server'

import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { WeekDaySummary, WeekRecommendation, WeekSnapshot } from './types'

const configuredCapacity = Number(process.env.NEXT_PUBLIC_WEEK_CAPACITY_MINUTES || '420')
const DAY_CAPACITY_MINUTES =
  Number.isFinite(configuredCapacity) && configuredCapacity > 0 ? configuredCapacity : 420 // ~7h real focus time

type WeekTask = {
  id: string
  title: string
  due_date: string | null
  estimated_duration?: number | null
  priority?: string | null
  metadata?: Record<string, any> | null
}

type WeekEvent = {
  id: string
  title: string
  date: string
  type: string
  duration_minutes: number
  start_time?: string | null
  end_time?: string | null
  metadata?: Record<string, any> | null
}

type RecommendationInsert = {
  user_id: string
  week_start: string
  title: string
  explanation: string
  type: string
  payload: Record<string, any>
}

function resolveWeekStart(weekStart?: string) {
  const base = weekStart ? parseISO(weekStart) : new Date()
  return startOfWeek(base, { weekStartsOn: 1 })
}

function minutesForTask(task: WeekTask) {
  const metaMinutes = typeof task.metadata?.estimationMinutes === 'number' ? task.metadata.estimationMinutes : null
  return task.estimated_duration || metaMinutes || 30
}

function buildDaySummaries(tasks: WeekTask[], events: WeekEvent[], weekStartDate: Date): WeekDaySummary[] {
  const weekStartIso = format(weekStartDate, 'yyyy-MM-dd')
  const daySummaries: WeekDaySummary[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i)
    const iso = format(date, 'yyyy-MM-dd')
    const dayTasks = tasks.filter(t => t.due_date === iso)
    const dayEvents = events.filter(e => e.date === iso)
    const taskMinutes = dayTasks.reduce((sum, t) => sum + minutesForTask(t), 0)
    const eventMinutes = dayEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const totalMinutes = taskMinutes + eventMinutes
    const percentage = Math.round((totalMinutes / DAY_CAPACITY_MINUTES) * 100)
    let status: WeekDaySummary['status'] = 'ok'
    if (percentage > 80) status = 'overloaded'
    else if (percentage < 40) status = 'empty'
    const warnings: string[] = []
    if (status === 'overloaded') {
      warnings.push('Dzień przeciążony (>80%)')
    } else if (status === 'empty') {
      warnings.push('Zbyt lekki dzień - brak buforu planu')
    }
    if (dayEvents.filter(e => e.type === 'meeting').length >= 2) {
      warnings.push('2+ spotkania - odciąż zadania')
    }
    if (dayTasks.some(t => minutesForTask(t) >= 90) && dayEvents.length > 0) {
      warnings.push('Ciężkie zadanie + spotkanie w tym samym dniu')
    }
    daySummaries.push({
      date: iso,
      label: format(date, 'EEE dd.MM'),
      percentage: Math.min(150, percentage),
      status,
      tasksCount: dayTasks.length,
      eventsCount: dayEvents.length,
      totalMinutes,
      warnings,
    })
  }
  // Ensure ordering from Monday
  return daySummaries
}

function buildAnalysisText(days: WeekDaySummary[], tasks: WeekTask[], events: WeekEvent[]): string {
  const overloaded = days.filter(d => d.status === 'overloaded')
  const empty = days.filter(d => d.status === 'empty')
  const balanced = days.filter(d => d.status === 'ok')
  const meetingHeavy = days.filter(d => d.eventsCount >= 2)
  const heavyWithMeetings = meetingHeavy.filter(d => {
    const dayTasks = tasks.filter(t => t.due_date === d.date)
    return dayTasks.some(t => minutesForTask(t) >= 60)
  })
  let text = ''
  if (overloaded.length) {
    text += `Przeciążone dni: ${overloaded.map(d => d.label).join(', ')} (powyżej 80% obciążenia). `
  }
  if (empty.length) {
    text += `Dni do ochrony/regeneracji: ${empty.map(d => d.label).join(', ')} (poniżej 40%). `
  }
  if (heavyWithMeetings.length) {
    text += `Są dni z ciężkimi zadaniami i spotkaniami (${heavyWithMeetings.map(d => d.label).join(', ')}), co dla ADHD jest ryzykowne – rozdziel zadania i spotkania. `
  }
  const consecutiveOverload = days.some((d, idx) => {
    const next = days[idx + 1]
    return next && d.percentage > 75 && next.percentage > 75
  })
  if (consecutiveOverload) {
    text += 'Występują 2 ciężkie dni pod rząd – zaplanuj bufor lub przenieś zadania. '
  }
  if (!text) {
    text = 'Plan wygląda stabilnie, ale wygeneruj rekomendacje, by dodać bufory i sprawdzić kontekst.'
  }
  return text.trim()
}

function pickLightDay(days: WeekDaySummary[], excludeDate?: string) {
  return days
    .filter(d => d.date !== excludeDate)
    .sort((a, b) => a.percentage - b.percentage)[0]
}

function toRecommendationInsert(
  userId: string,
  weekStartIso: string,
  title: string,
  explanation: string,
  type: string,
  payload: Record<string, any>
): RecommendationInsert {
  return { user_id: userId, week_start: weekStartIso, title, explanation, type, payload }
}

function collectTaskIdsFromRecommendations(recs: RecommendationInsert[]) {
  const ids: string[] = []
  recs.forEach((rec) => {
    const payload = rec.payload || {}
    if (Array.isArray(payload.taskIds)) {
      ids.push(...payload.taskIds)
    }
    if (payload.taskId) {
      ids.push(payload.taskId)
    }
  })
  return new Set(ids)
}

function normalizeStatus(value: any): WeekRecommendation['status'] {
  const allowed: WeekRecommendation['status'][] = ['pending', 'applied', 'rejected']
  return allowed.includes(value) ? value : 'pending'
}

function generateRecommendations(
  userId: string,
  weekStartIso: string,
  days: WeekDaySummary[],
  tasks: WeekTask[],
  events: WeekEvent[]
): RecommendationInsert[] {
  const recs: RecommendationInsert[] = []
  const overloaded = days.filter(d => d.status === 'overloaded')
  const light = days.filter(d => d.percentage < 60)
  const empty = days.filter(d => d.status === 'empty')
  const getTasksForDay = (day: string) => tasks.filter(t => t.due_date === day)
  const heavyTasks = tasks.filter(t => minutesForTask(t) >= 60)

  // Move heavy task away from overloaded day to light day
  overloaded.forEach(day => {
    const candidate = getTasksForDay(day.date).sort((a, b) => minutesForTask(b) - minutesForTask(a))[0]
    const target = pickLightDay(light.length ? light : days, day.date)
    if (candidate && target && target.date !== day.date) {
      recs.push(
        toRecommendationInsert(
          userId,
          weekStartIso,
          `Przenieś „${candidate.title}” na ${target.label}`,
          'Dzień ma >80% obciążenia. Osoby z ADHD gorzej znoszą przeciążenie dzień po dniu – przenieś ciężar na lżejszy dzień.',
          'move_task',
          { taskId: candidate.id, fromDay: day.date, toDay: target.date }
        )
      )
    }
  })

  // Split meetings + heavy tasks
  days
    .filter(d => d.eventsCount >= 2)
    .forEach(day => {
      const heavy = getTasksForDay(day.date).find(t => minutesForTask(t) >= 45)
      const target = pickLightDay(light.length ? light : days, day.date)
      if (heavy && target) {
        recs.push(
          toRecommendationInsert(
            userId,
            weekStartIso,
            `Zdejmij ciężkie zadanie ze dnia spotkań (${day.label})`,
            'Dwa spotkania + ciężkie zadanie to za dużo dla ADHD. Przenieś zadanie na dzień z mniejszą liczbą spotkań.',
            'move_task',
            { taskId: heavy.id, fromDay: day.date, toDay: target.date }
          )
        )
      }
    })

  // Back-to-back heavy days -> protect the second one
  days.forEach((day, idx) => {
    const next = days[idx + 1]
    if (!next) return
    if (day.percentage > 75 && next.percentage > 75) {
      const nextTasks = getTasksForDay(next.date)
      const movable = nextTasks.sort((a, b) => minutesForTask(b) - minutesForTask(a))[0]
      const target = pickLightDay(light.length ? light : days, next.date)
      if (movable && target) {
        recs.push(
          toRecommendationInsert(
            userId,
            weekStartIso,
            `Rozbij dwa ciężkie dni – przenieś „${movable.title}”`,
            'Maksymalnie 2 ciężkie dni pod rząd. Przerzuć jedno zadanie, by wprowadzić bufor.',
            'move_task',
            { taskId: movable.id, fromDay: next.date, toDay: target.date }
          )
        )
      }
    }
  })

  // Increase estimation for under-scoped heavy priorities
  tasks
    .filter(t => (t.priority === 'now' || t.priority === 'next') && minutesForTask(t) < 25)
    .slice(0, 2)
    .forEach(task => {
      recs.push(
        toRecommendationInsert(
          userId,
          weekStartIso,
          `Zwiększ estymację dla „${task.title}”`,
          'Zadanie jest ważne, ale ma zbyt małą estymację – dla ADHD lepiej planować z zapasem.',
          'increase_estimate',
          { taskId: task.id, newEstimate: 45 }
        )
      )
    })

  // Group similar tasks into batching day
  const tasksWithLabels = tasks.filter(t => Array.isArray(t.metadata?.labels) && t.metadata!.labels.length > 0)
  if (tasksWithLabels.length >= 2) {
    const [first] = tasksWithLabels
    const label = first.metadata!.labels[0]
    const similar = tasksWithLabels.filter(t => t.metadata!.labels?.includes(label)).slice(0, 3)
    const target = pickLightDay(empty.length ? empty : light.length ? light : days)
    if (similar.length >= 2 && target) {
      recs.push(
        toRecommendationInsert(
          userId,
          weekStartIso,
          `Zgrupuj zadania „${label}” w jeden dzień`,
          'Batching po kontekście zmniejsza przełączanie. Zaplanuj te zadania razem.',
          'group_tasks',
          { taskIds: similar.map(t => t.id), toDay: target.date }
        )
      )
    }
  }

  // Add buffer on the emptiest day
  const bufferDay = empty[0] || pickLightDay(days)
  if (bufferDay) {
    recs.push(
      toRecommendationInsert(
        userId,
        weekStartIso,
        `Dodaj bufor regeneracyjny (${bufferDay.label})`,
        'Osoby z ADHD potrzebują lżejszych dni. Wstaw godzinny bufor, by chronić energię.',
        'add_buffer',
        { day: bufferDay.date, duration: 60, startTime: '15:00', title: 'Bufor regeneracyjny' }
      )
    )
  }

  // Ensure minimum 5 recommendations
  const seenTaskIds = collectTaskIdsFromRecommendations(recs)
  if (recs.length < 5) {
    const remaining = heavyTasks.filter(t => !seenTaskIds.has(t.id))
    const candidate = remaining[0]
    const target = pickLightDay(days, candidate?.due_date || undefined)
    if (candidate && target) {
      recs.push(
        toRecommendationInsert(
          userId,
          weekStartIso,
          `Przesuń „${candidate.title}” na lżejszy dzień`,
          'Rozłóż ciężar tygodnia, by uniknąć przeciążenia i zbyt wielu przełączeń.',
          'move_task',
          { taskId: candidate.id, fromDay: candidate.due_date, toDay: target.date }
        )
      )
    }
  }

  // Pad to at least 5 recommendations with buffer-focused proposals
  let padIdx = 0
  while (recs.length < 5) {
    const target = pickLightDay(days, recs[padIdx]?.payload?.day)
    if (!target) break
    const startHour = 9 + (padIdx % 3) * 2
    const startTime = `${String(startHour).padStart(2, '0')}:00`
    recs.push(
      toRecommendationInsert(
        userId,
        weekStartIso,
        `Chroń lekki dzień (${target.label})`,
        'Dodaj blok buforowy, żeby nie uciekał czas na przypadkowe zadania.',
        'add_buffer',
        { day: target.date, duration: 45, startTime, title: 'Bufor ochronny' }
      )
    )
    padIdx += 1
  }

  return recs.slice(0, 7)
}

async function getAuthContext() {
  const supabase = await createAuthenticatedSupabaseClient()
  const user = await getAuthenticatedUser(supabase)
  return { supabase, user }
}

async function fetchWeekState(userId: string, weekStartDate: Date, supabase: Awaited<ReturnType<typeof createAuthenticatedSupabaseClient>>) {
  const weekStartIso = format(weekStartDate, 'yyyy-MM-dd')
  const weekEndIso = format(addDays(weekStartDate, 6), 'yyyy-MM-dd')

  const { data: tasks = [] } = await supabase
    .from('day_assistant_tasks')
    .select('id, title, due_date, estimated_duration, priority, metadata')
    .eq('user_id', userId)
    .eq('completed', false)
    .gte('due_date', weekStartIso)
    .lte('due_date', weekEndIso)

  const { data: events = [] } = await supabase
    .from('day_timeline_events')
    .select('id, title, date, type, duration_minutes, start_time, end_time, metadata')
    .eq('user_id', userId)
    .gte('date', weekStartIso)
    .lte('date', weekEndIso)

  const { data: insight } = await supabase
    .from('week_insights')
    .select('analysis_text')
    .eq('user_id', userId)
    .eq('week_start', weekStartIso)
    .single()

  const { data: recommendations = [] } = await supabase
    .from('week_recommendations')
    .select('id, title, explanation, type, payload, status')
    .eq('user_id', userId)
    .eq('week_start', weekStartIso)
    .order('created_at', { ascending: true })

  return { tasks, events, insight, recommendations, weekStartIso }
}

async function buildSnapshot(userId: string, weekStartDate: Date, supabase: Awaited<ReturnType<typeof createAuthenticatedSupabaseClient>>): Promise<WeekSnapshot> {
  const { tasks, events, insight, recommendations, weekStartIso } = await fetchWeekState(userId, weekStartDate, supabase)
  const days = buildDaySummaries(tasks || [], events || [], weekStartDate)
  const analysisText = insight?.analysis_text || buildAnalysisText(days, tasks || [], events || [])
  return {
    authenticated: true,
    weekStart: weekStartIso,
    capacityMinutes: DAY_CAPACITY_MINUTES,
    days,
    analysisText,
    recommendations: (recommendations || []).map(r => ({
      id: r.id,
      title: r.title,
      explanation: r.explanation,
      type: r.type,
      payload: r.payload || {},
      status: normalizeStatus(r.status),
      applied: normalizeStatus(r.status) === 'applied',
    })),
  }
}

export async function getWeekSnapshot(weekStart?: string): Promise<WeekSnapshot> {
  const { supabase, user } = await getAuthContext()
  const startDate = resolveWeekStart(weekStart)
  if (!user) {
    return {
      authenticated: false,
      weekStart: format(startDate, 'yyyy-MM-dd'),
      capacityMinutes: DAY_CAPACITY_MINUTES,
      days: buildDaySummaries([], [], startDate),
      analysisText: 'Zaloguj się, aby zobaczyć swój plan tygodnia i rekomendacje.',
      recommendations: [],
    }
  }

  return buildSnapshot(user.id, startDate, supabase)
}

export async function runWeekAnalysis(): Promise<{ error?: string; data?: WeekSnapshot }> {
  const { supabase, user } = await getAuthContext()
  if (!user) {
    return { error: 'Musisz być zalogowany, aby uruchomić analizę tygodnia.' }
  }

  const weekStartDate = resolveWeekStart()
  const { tasks, events, weekStartIso } = await fetchWeekState(user.id, weekStartDate, supabase)
  const days = buildDaySummaries(tasks || [], events || [], weekStartDate)
  const analysisText = buildAnalysisText(days, tasks || [], events || [])
  const proposals = generateRecommendations(user.id, weekStartIso, days, tasks || [], events || [])

  // Replace pending recommendations with fresh set
  await supabase
    .from('week_recommendations')
    .delete()
    .eq('user_id', user.id)
    .eq('week_start', weekStartIso)
    .eq('status', 'pending')

  if (proposals.length) {
    await supabase.from('week_recommendations').insert(proposals)
  }

  await supabase
    .from('week_insights')
    .upsert(
      {
        user_id: user.id,
        week_start: weekStartIso,
        analysis_text: analysisText,
      },
      { onConflict: 'user_id,week_start' }
    )

  revalidatePath('/assistant-week')
  return { data: await buildSnapshot(user.id, weekStartDate, supabase) }
}

function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  date.setMinutes(date.getMinutes() + minutes)
  return format(date, 'HH:mm')
}

async function applyPayloadUpdate(
  supabase: Awaited<ReturnType<typeof createAuthenticatedSupabaseClient>>,
  userId: string,
  recommendation: any
) {
  const payload = recommendation.payload || {}
  switch (recommendation.type) {
    case 'move_task': {
      if (payload.taskId && payload.toDay) {
        await supabase
          .from('day_assistant_tasks')
          .update({ due_date: payload.toDay })
          .eq('id', payload.taskId)
          .eq('user_id', userId)
      }
      break
    }
    case 'group_tasks': {
      if (Array.isArray(payload.taskIds) && payload.taskIds.length && payload.toDay) {
        await supabase
          .from('day_assistant_tasks')
          .update({ due_date: payload.toDay })
          .in('id', payload.taskIds)
          .eq('user_id', userId)
      }
      break
    }
    case 'increase_estimate': {
      if (payload.taskId && payload.newEstimate) {
        await supabase
          .from('day_assistant_tasks')
          .update({ estimated_duration: payload.newEstimate })
          .eq('id', payload.taskId)
          .eq('user_id', userId)
      }
      break
    }
    case 'add_buffer': {
      if (payload.day) {
        const startTime = payload.startTime || '13:00'
        const duration = payload.duration || 60
        const endTime = addMinutesToTime(startTime, duration)
        await supabase.from('day_timeline_events').insert({
          user_id: userId,
          date: payload.day,
          type: 'event',
          title: payload.title || 'Bufor regeneracyjny',
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          metadata: { source: 'assistant-week', reason: 'buffer' },
        })
      }
      break
    }
    default: {
      // other recommendation types are non-destructive
      break
    }
  }
}

export async function applyRecommendation(id: string): Promise<{ error?: string; data?: WeekSnapshot }> {
  const { supabase, user } = await getAuthContext()
  if (!user) {
    return { error: 'Musisz być zalogowany, aby zastosować rekomendację.' }
  }

  const { data: recommendation, error } = await supabase
    .from('week_recommendations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !recommendation) {
    return { error: 'Nie znaleziono rekomendacji.' }
  }

  await applyPayloadUpdate(supabase, user.id, recommendation)

  await supabase
    .from('week_recommendations')
    .update({ status: 'applied', applied_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  const weekStartDate = resolveWeekStart(recommendation.week_start)
  revalidatePath('/assistant-week')
  return { data: await buildSnapshot(user.id, weekStartDate, supabase) }
}

export async function rejectRecommendation(id: string): Promise<{ error?: string; data?: WeekSnapshot }> {
  const { supabase, user } = await getAuthContext()
  if (!user) {
    return { error: 'Musisz być zalogowany, aby odrzucić rekomendację.' }
  }

  const { data: recommendation, error } = await supabase
    .from('week_recommendations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !recommendation) {
    return { error: 'Nie znaleziono rekomendacji.' }
  }

  await supabase
    .from('week_recommendations')
    .update({ status: 'rejected', applied_at: null })
    .eq('id', id)
    .eq('user_id', user.id)

  const weekStartDate = resolveWeekStart(recommendation.week_start)
  revalidatePath('/assistant-week')
  return { data: await buildSnapshot(user.id, weekStartDate, supabase) }
}
