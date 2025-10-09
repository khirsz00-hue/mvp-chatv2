// 🌍 Globalny store klientów SSE
const clients: { id: number; send: (data: any) => void }[] = []

// ➕ Dodaj nowego klienta
export function addClient(send: (data: any) => void, id: number) {
  clients.push({ id, send })
  console.log(`👥 Nowy klient SSE (${clients.length} aktywnych)`)
}

// ➖ Usuń klienta po rozłączeniu
export function removeClient(id: number) {
  const index = clients.findIndex((c) => c.id === id)
  if (index !== -1) clients.splice(index, 1)
  console.log(`❌ Klient ${id} odłączony (${clients.length} aktywnych)`)
}

// 📢 Wyślij wiadomość do wszystkich klientów
export function broadcastMessage(message: any) {
  console.log(`📢 Broadcast do ${clients.length} klientów`)
  clients.forEach((client) => {
    try {
      client.send(message)
    } catch (err) {
      console.error('⚠️ Błąd przy wysyłaniu do klienta:', err)
    }
  })
}
