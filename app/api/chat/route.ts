import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

// 🔹 Prosta "pamięć" kontekstu per zadanie
const taskMemory = new Map<string, string>()

type SimpleChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  try {
    const {
      message,
      token,
      tasks: providedTasks,
      mode,
      taskId,
      taskTitle,
      history,
    } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    const lower = message.toLowerCase()
    let tasks: any[] = []

    // 🔹 Zakres filtracji (opcjonalny)
    let filter = ''
    if (lower.includes('jutro')) filter = 'tomorrow'
    else if (lower.includes('tydzień') || lower.includes('tydzien')) filter = '7 days'
    else if (lower.includes('miesiąc') || lower.includes('miesiac')) filter = '30 days'
    else if (lower.includes('przeterminowane')) filter = 'overdue'
    else filter = 'today'

    // 🧩 Pobranie lub użycie zadań (jeśli tryb Todoist)
    if (token) {
      if (providedTasks && providedTasks.length > 0) {
        console.log(`📦 Otrzymano ${providedTasks.length} zadań z frontu.`)
        tasks = providedTasks
      } else {
        console.log('🌐 Brak zadań z frontu — pobieram z Todoista...')
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Todoist API error: ${res.status}`)
        tasks = await res.json()
        console.log(`✅ Znaleziono zadań w Todoist: ${tasks.length}`)
      }
    } else if (providedTasks?.length) {
      tasks = providedTasks
    }

    // 🧠 Klient OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    // 🔧 SYSTEM PROMPT
    let systemPrompt = ''
    if (mode === 'task' || mode === 'help') {
      systemPrompt = `
Jesteś inteligentnym, praktycznym asystentem pomagającym użytkownikowi w realizacji konkretnego zadania: **"${taskTitle}"**.

Zasady:
- ZAWSZE odpowiadasz po polsku, konkretnie i rzeczowo.
- Twoim priorytetem jest ZROZUMIENIE kontekstu — zanim doradzisz lub zaproponujesz rozwiązanie.
- Jeśli użytkownik nie podał szczegółów, zawsze zapytaj o nie na początku:
  • Na czym dokładnie polega to zadanie?  
  • Jaki jest cel lub oczekiwany rezultat?  
  • Kogo lub czego dotyczy (np. osoba, dział, projekt)?  
  • Na jakim etapie jest realizacja?  
  • Jakie są ograniczenia lub wyzwania?
- Jeśli użytkownik napisze „Pomóż mi”, „Co mam zrobić?” lub podobne, wiesz, że chodzi o bieżące zadanie "${taskTitle}".
- Nie wymyślaj fikcyjnych danych. Jeśli czegoś nie wiesz — dopytaj.
- Po uzyskaniu kontekstu przedstaw praktyczne propozycje krok po kroku.
- W miarę rozmowy przypominaj sobie, co już wiesz o zadaniu, i wykorzystuj to w dalszych odpowiedziach.
  `.trim()
    } else if (token) {
      const taskList =
        tasks.length > 0
          ? tasks.map((t) => `- ${t.content}${t.due?.date ? ` (termin: ${t.due.date})` : ''}`).join('\n')
          : '(Brak zadań w Todoist)'
      systemPrompt = `
Jesteś asystentem produktywności zintegrowanym z Todoist.
Dostępne zadania:
${taskList}
`.trim()
    } else {
      systemPrompt = `
Jesteś przyjaznym asystentem pomagającym użytkownikowi w planowaniu i organizacji pracy.
`.trim()
    }

    // 📜 Historia rozmowy
    const conversation: SimpleChatMessage[] = Array.isArray(history)
      ? history.slice(-10).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || ''),
        }))
      : []

    // 🧠 Zapamiętaj nazwę zadania w pamięci
    if (taskId && taskTitle) {
      taskMemory.set(taskId, taskTitle)
    }

    // 🧩 Przywróć nazwę zadania jeśli front jej nie wysłał
    const rememberedTitle = taskMemory.get(taskId) || taskTitle || 'Nieznane zadanie'

    // 📘 Kontekst systemowy
    const contextIntro: SimpleChatMessage[] =
      mode === 'task' || mode === 'help'
        ? [
            {
              role: 'system',
              content: `Kontekst rozmowy: Pomagasz użytkownikowi w zadaniu o nazwie "${rememberedTitle}".
Zawsze traktuj to jako główny temat rozmowy.
Jeśli użytkownik pisze np. "Pomóż mi", wiesz, że chodzi o to właśnie zadanie.`,
            },
          ]
        : []

    // 🧩 Kompletna sekwencja wiadomości
    const messages: SimpleChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...contextIntro,
      ...conversation,
      {
        role: 'user',
        content:
          mode === 'task' || mode === 'help'
            ? `Użytkownik pisze w kontekście zadania "${rememberedTitle}": ${message}`
            : message,
      },
    ]

    // 🔮 Wywołanie OpenAI
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages,
    })

    const reply = completion.choices[0]?.message?.content?.trim() || '🤖 Brak odpowiedzi od AI.'
    console.log(`💬 [${rememberedTitle}] Odpowiedź AI:`, reply.slice(0, 200))

    return NextResponse.json({
      success: true,
      content: reply,
      timestamp: Date.now(),
    })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message, type: 'error' }, { status: 500 })
  }
}
