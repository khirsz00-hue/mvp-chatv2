// 🧩 Globalny store dla klientów SSE
const clients: any[] = []

export function addClient(send: (data: any) => void, id: number) {
  clients.push({ id, send })
}

export function removeClient(id: number) {
  const index = clients.findIndex((c) => c.id === id)
  if (index !== -1) clients.splice(index, 1)
}

export function broadcastMessage(message: any) {
  clients.forEach((client) => client.send(message))
}
