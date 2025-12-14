import { NextApiRequest, NextApiResponse } from 'next'
import { getOpenAIClient } from '@/lib/openai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { energy, motivation, sleepQuality, hoursSlept, notes, completedTasks, plannedTasks } = req.body

    const openai = getOpenAIClient()

    const notesText = notes?.length > 0 ? notes.join(', ') : 'brak'
    const completedCount = completedTasks?.length || 0
    const plannedTasksLines = plannedTasks?.split('\n').filter((l: string) => l.trim().startsWith('-'))
    const plannedCount = plannedTasksLines?.length || 0
    const completionRate = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0

    const prompt = `Jesteś asystentem AI analizującym dziennik osoby z ADHD. 

Dane z dzisiejszego dnia:
- Energia: ${energy}/10
- Motywacja: ${motivation}/10
- Jakość snu: ${sleepQuality}/10
- Godziny snu: ${hoursSlept}h
- Notatki: ${notesText}
- Ukończone zadania: ${completedCount}
- Zaplanowane zadania: ${plannedCount}
- Wskaźnik realizacji: ${completionRate}%

Wygeneruj krótkie, wspierające podsumowanie dnia (3-5 zdań) skupiające się na:
1. Ogólnym samopoczuciu (energia, motywacja, sen) - jak te czynniki mogły wpłynąć na dzień
2. Produktywności i realizacji zadań - bez oceniania, ale zauważając wzorce
3. Jednej konkretnej, praktycznej rekomendacji na jutro - dostosowanej do wyzwań ADHD

Używaj empatycznego, wspierającego języka. Uwzględnij specyfikę ADHD (np. trudności z rozpoczynaniem zadań, zarządzaniem energią). 
Odpowiadaj ZAWSZE po polsku. Bądź konkretny i praktyczny.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś wspierającym asystentem dla osób z ADHD. Twoje podsumowania są empatyczne, praktyczne i skoncentrowane na postępie, nie perfekcji.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400
    })

    const summary = completion.choices[0]?.message?.content || 'Nie udało się wygenerować podsumowania'

    res.status(200).json({ summary })
  } catch (error) {
    console.error('Error generating AI summary:', error)
    res.status(500).json({ error: 'Failed to generate summary' })
  }
}
