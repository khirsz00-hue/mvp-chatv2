// 📜 Typ wiadomości – definiujemy lokalnie
type SimpleChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 📜 Konwersacja – historia + wiadomość użytkownika
const conversation: SimpleChatMessage[] = Array.isArray(history)
  ? history.slice(-10).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: String(msg.content || ''),
    }))
  : []

// 🧠 KONTEKST — wstrzyknięcie tytułu zadania jako osobnej wiadomości systemowej
const contextIntro: SimpleChatMessage[] =
  mode === 'task' || mode === 'help'
    ? [
        {
          role: 'system',
          content: `Kontekst rozmowy: pomagaj użytkownikowi w zadaniu o nazwie "${taskId || 'Nieznane zadanie'}". 
Zawsze traktuj to jako główny temat całej rozmowy. 
Odpowiadaj konkretnie w kontekście tego zadania.`,
        },
      ]
    : []

// 🧩 Kompletna sekwencja wiadomości dla OpenAI
const messages: SimpleChatMessage[] = [
  { role: 'system', content: systemPrompt },
  ...contextIntro,
  ...conversation,
  {
    role: 'user',
    content:
      mode === 'task' || mode === 'help'
        ? `Użytkownik pisze w kontekście zadania "${taskId || 'Nieznane zadanie'}": ${message}`
        : message,
  },
]

// 🧠 Zapytanie do OpenAI
const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  messages,
})

const reply = completion.choices[0]?.message?.content?.trim() || '🤖 Brak odpowiedzi od AI.'
console.log('💬 Odpowiedź AI:', reply.slice(0, 200))

return NextResponse.json({
  success: true,
  content: reply,
  timestamp: Date.now(),
})
