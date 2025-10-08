import { NextResponse } from 'next/server'

export async function GET() {
  const redirectUri = process.env.TODOIST_REDIRECT_URI!
  const clientId = process.env.TODOIST_CLIENT_ID!
  const url = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=data:read_write&state=todoist&redirect_uri=${redirectUri}`
  return NextResponse.redirect(url)
}
