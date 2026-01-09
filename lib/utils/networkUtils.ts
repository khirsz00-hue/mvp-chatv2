/**
 * Network utility functions for API calls
 * Provides retry logic and mobile detection
 */

/**
 * Fetch with automatic retry on failure
 * Retries on network errors and specific HTTP status codes (404, 5xx)
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retries - Number of retry attempts (default: 3)
 * @returns Response object
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries: number = 3
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🔄 [Fetch Retry] Attempt ${attempt + 1}/${retries} for ${url}`)
      
      const response = await fetch(url, options)
      
      // Success - return immediately
      if (response.ok) {
        console.log(`✅ [Fetch Retry] Success on attempt ${attempt + 1}`)
        return response
      }
      
      // Don't retry on client errors (except 404 which might be transient)
      if (response.status >= 400 && response.status < 500 && response.status !== 404) {
        console.log(`⚠️ [Fetch Retry] Client error ${response.status}, not retrying`)
        return response
      }
      
      // Retry on 404 or 5xx errors
      if (attempt < retries - 1 && (response.status === 404 || response.status >= 500)) {
        const delay = 1000 * (attempt + 1) // Exponential backoff: 1s, 2s, 3s
        console.log(`⏳ [Fetch Retry] ${response.status} error, waiting ${delay}ms before retry`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      return response
    } catch (err) {
      lastError = err as Error
      console.error(`❌ [Fetch Retry] Network error on attempt ${attempt + 1}:`, err)
      
      // Don't wait after last attempt
      if (attempt < retries - 1) {
        const delay = 1000 * (attempt + 1) // Exponential backoff
        console.log(`⏳ [Fetch Retry] Waiting ${delay}ms before retry`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // All retries failed
  console.error(`❌ [Fetch Retry] All ${retries} attempts failed`)
  throw lastError || new Error(`Failed after ${retries} attempts`)
}

/**
 * Detects if the request is from a mobile device or webview
 * 
 * @param userAgent - User agent string from request headers
 * @returns true if mobile/webview detected
 */
export function isMobileWebview(userAgent: string): boolean {
  if (!userAgent) return false
  
  // Check for mobile patterns
  const mobilePattern = /Mobile|Android|iPhone|iPad|iPod/i
  const webviewPattern = /WebView|wv|FB_IAB|FBAN|FBAV/i // Facebook in-app browser, etc.
  
  const isMobile = mobilePattern.test(userAgent)
  const isWebview = webviewPattern.test(userAgent)
  
  return isMobile || isWebview
}

/**
 * Extracts detailed device info from user agent for logging
 * 
 * @param userAgent - User agent string
 * @returns Object with device information
 */
export function parseUserAgent(userAgent: string): {
  isMobile: boolean
  isWebview: boolean
  platform: string
  details: string
} {
  if (!userAgent) {
    return {
      isMobile: false,
      isWebview: false,
      platform: 'unknown',
      details: 'No user agent'
    }
  }
  
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)
  const isWebview = /WebView|wv|FB_IAB|FBAN|FBAV/i.test(userAgent)
  
  let platform = 'desktop'
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    platform = 'iOS'
  } else if (/Android/i.test(userAgent)) {
    platform = 'Android'
  } else if (isMobile) {
    platform = 'mobile-other'
  }
  
  return {
    isMobile,
    isWebview,
    platform,
    details: userAgent.substring(0, 100) // First 100 chars for logging
  }
}
