'use client'

export default function TodoistAuthButton() {
  const handleConnect = async () => {
    try {
      window.location.href = '/api/todoist/auth'
    } catch (err) {
      console.error('❌ Błąd podczas próby połączenia z Todoist:', err)
      alert('Nie udało się rozpocząć autoryzacji z Todoist.')
    }
  }

  return (
    <div className="card p-10 max-w-xl mx-auto text-center animate-scale-in">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-glow">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          fill="none"
          viewBox="0 0 24 24"
          className="text-white"
        >
          <path
            fill="currentColor"
            d="M3 3h18v18H3V3zm4 6.3l5 2.9 9-5.2v-2L12 8.9 7 6v3.3zm0 5l5 2.9 9-5.2v-2l-9 5.2-5-2.9v2z"
          />
        </svg>
      </div>

      {/* Content */}
      <h2 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
        Połącz z Todoist
      </h2>
      <p className="text-base text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
        Zsynchronizuj swoje zadania z Todoist i zyskaj dostęp do inteligentnego zarządzania zadaniami z pomocą AI
      </p>

      {/* CTA Button */}
      <button
        onClick={handleConnect}
        className="inline-flex items-center gap-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl font-semibold text-base shadow-glow hover:shadow-glow-lg transition-all duration-200 active:scale-[0.98] mx-auto group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          fill="none"
          viewBox="0 0 24 24"
          className="transition-transform duration-200 group-hover:scale-110"
        >
          <path
            fill="currentColor"
            d="M3 3h18v18H3V3zm4 6.3l5 2.9 9-5.2v-2L12 8.9 7 6v3.3zm0 5l5 2.9 9-5.2v-2l-9 5.2-5-2.9v2z"
          />
        </svg>
        Połącz konto Todoist
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Trust Indicators */}
      <div className="mt-8 pt-8 border-t border-gray-100">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Bezpieczne połączenie</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>OAuth 2.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
