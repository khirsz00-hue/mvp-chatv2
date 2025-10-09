// app/api/chat/stream/broadcast.ts
let clients: any[] = []

export function addClient(client: any) {
  clients.push(client)
}

export function removeClient(id: number) {
  clients = clients.filter((c) => c.id !== id)
}

export function broadcastMessage(message: any) {
  for (const client of clients) {
    client.send(message)
  }
}
