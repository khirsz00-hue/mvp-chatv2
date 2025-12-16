import { NextRequest, NextResponse } from 'next/server'

// Mark as dynamic route
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to check cookie propagation
 * GET /api/debug/headers
 * 
 * Returns request headers to verify cookies are being sent from client
 */
export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {}
  
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  // Log for server-side debugging
  console.log('=== DEBUG: Request Headers ===')
  console.log('Cookie header:', headers.cookie || 'NONE')
  console.log('All headers:', JSON.stringify(headers, null, 2))
  console.log('=============================')
  
  return NextResponse.json({
    message: 'Debug endpoint - check server logs for full details',
    cookiePresent: !!headers.cookie,
    cookieLength: headers.cookie?.length || 0,
    headers: headers
  })
}
