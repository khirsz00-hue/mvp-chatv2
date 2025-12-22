import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// GET - Fetch user's custom categories
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or generate categories
    const { data: plan } = await supabase
      .from('day_assistant_v2_plan')
      .select('metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let categories = plan?.metadata?.context_categories

    // If no categories exist, generate from user's tasks
    if (!categories) {
      categories = await generateCategoriesFromTasks(user.id, supabase)
      
      // Save to plan metadata if we have a plan
      if (plan) {
        await supabase
          .from('day_assistant_v2_plan')
          .update({
            metadata: {
              ...plan?.metadata,
              context_categories: categories
            }
          })
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[Context Categories] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update categories
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categories } = await request.json()

    // Validate categories
    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'Invalid categories' }, { status: 400 })
    }

    // Update in plan metadata
    const { data: plans } = await supabase
      .from('day_assistant_v2_plan')
      .select('id, metadata')
      .eq('user_id', user.id)

    if (plans && plans.length > 0) {
      for (const plan of plans) {
        await supabase
          .from('day_assistant_v2_plan')
          .update({
            metadata: {
              ...plan.metadata,
              context_categories: categories
            }
          })
          .eq('id', plan.id)
      }
    }

    // Re-categorize all tasks
    await recategorizeAllTasks(user.id, categories, supabase)

    return NextResponse.json({ success: true, categories })
  } catch (error) {
    console.error('[Context Categories] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateCategoriesFromTasks(
  userId: string,
  supabase: any
): Promise<string[]> {
  // Get user's recent tasks
  const { data: tasks } = await supabase
    .from('day_assistant_v2_tasks')
    .select('title, description')
    .eq('user_id', userId)
    .limit(50)

  if (!tasks || tasks.length === 0) {
    // Default categories if no tasks
    return ['Development', 'Meetings', 'Admin', 'Personal', 'Learning']
  }

  // Ask AI to generate categories based on tasks
  const taskTitles = tasks.map((t: any) => t.title).join('\n')
  
  const prompt = `
Analyze these task titles and generate 5-8 contextual categories that best represent this user's work:

${taskTitles}

Requirements:
- Categories should be specific to this user's work (not generic)
- Use Polish language
- Each category should be 1-2 words
- Return as JSON array: ["category1", "category2", ...]

Examples of good categories:
- "Backend API", "Frontend UI", "DevOps", "Code Review"
- "Customer Support", "Sales Calls", "Marketing"
- "Design Sprint", "User Research", "Prototyping"
`

  try {
    if (!openai) {
      console.error('[Context Categories] OpenAI API key not configured')
      return ['Development', 'Meetings', 'Admin', 'Personal', 'Learning']
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at categorizing work. Always return valid JSON array.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return result.categories || ['Development', 'Meetings', 'Admin', 'Personal']
  } catch (error) {
    console.error('[Context Categories] AI generation error:', error)
    return ['Development', 'Meetings', 'Admin', 'Personal', 'Learning']
  }
}

async function recategorizeAllTasks(
  userId: string,
  categories: string[],
  supabase: any
) {
  const { data: tasks } = await supabase
    .from('day_assistant_v2_tasks')
    .select('id, title, description')
    .eq('user_id', userId)
    .eq('completed', false)

  if (!tasks || tasks.length === 0) return

  for (const task of tasks) {
    const newContext = await inferContextFromCategories(
      task.title,
      task.description,
      categories
    )

    await supabase
      .from('day_assistant_v2_tasks')
      .update({ context_type: newContext })
      .eq('id', task.id)
  }
}

async function inferContextFromCategories(
  title: string,
  description: string | null,
  categories: string[]
): Promise<string> {
  const prompt = `
Task: "${title}"
Description: ${description || 'No description'}

Available categories: ${categories.join(', ')}

Which category fits best? Respond with ONLY the category name, nothing else.
`

  try {
    if (!openai) {
      console.error('[Context Categories] OpenAI API key not configured')
      return categories[0]
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 20,
      temperature: 0.3
    })

    const result = completion.choices[0].message.content?.trim() || categories[0]
    
    // Ensure result is one of the valid categories
    return categories.find(c => c.toLowerCase() === result.toLowerCase()) || categories[0]
  } catch (error) {
    console.error('[Context Categories] Inference error:', error)
    return categories[0]
  }
}
