import type { NextApiRequest, NextApiResponse } from 'next'
import { getOpenAIClient } from '@/lib/openai'

interface GenerateSummaryRequest {
  energy: number
  motivation: number
  sleepQuality: number
  hoursSlept: number
  notes: string[]
  completedTasks: string[]
  plannedTasks: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      energy,
      motivation,
      sleepQuality,
      hoursSlept,
      notes,
      completedTasks,
      plannedTasks,
    } = req.body as GenerateSummaryRequest

    // Validate input
    if (
      energy === undefined ||
      motivation === undefined ||
      sleepQuality === undefined ||
      hoursSlept === undefined
    ) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const openai = getOpenAIClient()

    // Create context for AI
    const notesText = notes && notes.length > 0 ? notes.join('\n- ') : 'Brak notatek'
    const tasksText =
      completedTasks && completedTasks.length > 0
        ? completedTasks.join('\n- ')
        : 'Brak ukończonych zadań'
    const plannedText = plannedTasks || 'Brak zaplanowanych zadań'

    const prompt = `Jesteś wspierającym asystentem dla osoby z ADHD. Przeanalizuj dzień użytkownika i wygeneruj empatyczne, pozytywne podsumowanie (3-4 zdania) w języku polskim.

Dane z dnia:
- Energia: ${energy}/10
- Motywacja: ${motivation}/10
- Jakość snu: ${sleepQuality}/10
- Godziny snu: ${hoursSlept}h

Notatki:
- ${notesText}

Ukończone zadania:
- ${tasksText}

Zaplanowane zadania:
${plannedText}

Wygeneruj wspierające podsumowanie, które:
1. Uznaje wysiłki użytkownika
2. Podkreśla pozytywne aspekty (nawet małe osiągnięcia)
3. Oferuje łagodne wsparcie w przypadku trudności
4. Jest empatyczne i zrozumiałe dla osoby z ADHD
5. Ma ton przyjacielski i wspierający

Podsumowanie (3-4 zdania):`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Jesteś wspierającym asystentem dla osób z ADHD. Twoje odpowiedzi są empatyczne, pozytywne i motywujące. Zawsze podkreślasz postępy i osiągnięcia, nawet małe.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const summary = completion.choices[0]?.message?.content?.trim() || ''

    if (!summary) {
      return res.status(500).json({ error: 'Failed to generate summary' })
    }

    return res.status(200).json({ summary })
  } catch (error: any) {
    console.error('Error generating summary:', error)
    return res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message,
    })
  }
}
