// Wspólna pamięć (utrzymuje klientów SSE w RAM serwera)
const clients: any[] = []

export function registerClient(res: any) {
  clients.push(res)
}

export function broadcast(data: any) {
  const msg = `data: ${JSON.stringify(data)}\n\n`
  clients.forEach((res) => {
    try {
      res.write(msg)
    } catch {
      res.closed = true
    }
  })
}
