'use client'

export default function TodoistAuthButton() {
  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID || process.env.TODOIST_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_TODOIST_REDIRECT_URI || process.env.TODOIST_REDIRECT_URI

    if (!clientId || !redirectUri) {
      alert('Brakuje konfiguracji OAuth Todoist. Sprawdź zmienne środowiskowe.')
      return
    }

    const authUrl = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=data:read_write&state=todoist_auth&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`

    window.location.href = authUrl
  }

  return (
    <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm text-center">
      <h2 className="text-lg font-semibold mb-2">Połącz z Todoist</h2>
      <p className="text-sm text-neutral-600 mb-4">
        Aby zsynchronizować swoje zadania, połącz konto Todoist.
      </p>
      <button
        onClick={handleConnect}
        className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M3 3h18v18H3V3zm4 6.3l5 2.9 9-5.2v-2L12 8.9 7 6v3.3zm0 5l5 2.9 9-5.2v-2l-9 5.2-5-2.9v2z"
          />
        </svg>
        Połącz Todoist
      </button>
    </div>
  )
}
