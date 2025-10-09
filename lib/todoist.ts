export async function addTodoistComment(token: string, taskId: string, content: string) {
  const res = await fetch(`https://api.todoist.com/rest/v2/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_id: taskId, content }),
  })
  if (!res.ok) throw new Error('Błąd przy dodawaniu komentarza')
}
