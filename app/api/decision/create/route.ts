import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process. env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, description, options } = body
    
    // Get auth token from header
    const authHeader = req. headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    // Create Supabase client with user's token
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error:  authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields:  title, description' },
        { status: 400 }
      )
    }

    // Create decision with authenticated client
    const { data: decision, error } = await supabase
      . from('decisions')
      .insert({
        user_id: user.id,
        title,
        description,
        status: 'draft',
        current_hat: null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating decision:', error)
      throw new Error(`Failed to create decision: ${error.message}`)
    }

    // Add options if provided
    if (options && options.length > 0) {
      const validOptions = options.filter((opt:  any) => opt.title.trim())
      
      if (validOptions.length > 0) {
        const optionsToInsert = validOptions.map((opt: any, index: number) => ({
          decision_id: decision.id,
          title: opt.title. trim(),
          description: opt. description?.trim() || null,
          order: index
        }))

        const { error: optionsError } = await supabase
          .from('decision_options')
          .insert(optionsToInsert)

        if (optionsError) {
          console. error('Error creating options:', optionsError)
          // Don't throw - options are optional
        }
      }
    }

    return NextResponse. json({ decision }, { status: 201 })
  } catch (err: any) {
    console.error('Error in /api/decision/create:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create decision' },
      { status: 500 }
    )
  }
}
