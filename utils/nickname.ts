const ADJECTIVES = [
  'Pomocny',
  'Cierpliwy',
  'Empatyczny',
  'Spokojny',
  'Życzliwy',
  'Wyrozumiały',
  'Dobry',
  'Wspierający'
]

const NOUNS = [
  'Lis',
  'Sowa',
  'Pingwin',
  'Delfin',
  'Jeż',
  'Mewa',
  'Wilk',
  'Leniwiec'
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function generateNickname(userId?: string | null): string {
  if (!userId) return 'Gość społeczności'

  const hash = hashString(userId)
  const adjective = ADJECTIVES[hash % ADJECTIVES.length]
  const noun = NOUNS[(hash >> 3) % NOUNS.length]
  const number = (hash % 1000).toString().padStart(3, '0')

  return `${adjective} ${noun} #${number}`
}

export function getNicknameInitials(nickname: string): string {
  if (!nickname) return '?'

  const initials = nickname
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || '?'
}
