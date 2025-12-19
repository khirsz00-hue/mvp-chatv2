import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Todoist Sync] Starting sync...');

    // Pobierz token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Todoist Sync] No authorization header');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Inicjalizuj Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env. NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Todoist Sync] Supabase config missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Weryfikuj użytkownika
    const { data: { user }, error: userError } = await supabase. auth.getUser(token);
    
    if (userError || !user) {
      console.error('[Todoist Sync] User verification failed:', userError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log(`[Todoist Sync] User authenticated: ${user.id}`);

    // Pobierz Todoist token użytkownika
    const { data: todoistTokenData, error: tokenError } = await supabase
      .from('todoist_tokens')
      .select('access_token, sync_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !todoistTokenData) {
      console.error('[Todoist Sync] Todoist token not found:', tokenError);
      return res.status(404).json({ error: 'Todoist not connected.  Please connect your Todoist account.' });
    }

    console.log('[Todoist Sync] Todoist token found, syncing with API...');

    // Sync z Todoist API
    const todoistResponse = await fetch('https://api.todoist.com/sync/v9/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${todoistTokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sync_token: todoistTokenData. sync_token || '*',
        resource_types: ['items', 'projects'],
      }),
    });

    if (!todoistResponse.ok) {
      const errorText = await todoistResponse.text();
      console.error('[Todoist Sync] Todoist API error:', todoistResponse.status, errorText);
      
      if (todoistResponse.status === 401) {
        await supabase
          .from('todoist_tokens')
          .delete()
          .eq('user_id', user.id);
        
        return res.status(401).json({ 
          error: 'Todoist token expired. Please reconnect your account.',
          reconnect_required: true
        });
      }
      
      return res.status(todoistResponse.status).json({ 
        error: 'Todoist sync failed',
        details: errorText
      });
    }

    const todoistData = await todoistResponse. json();
    const tasks = todoistData.items || [];
    const newSyncToken = todoistData.sync_token;

    console.log(`[Todoist Sync] Received ${tasks.length} tasks from Todoist`);

    // Mapuj zadania Todoist do naszego formatu
    const tasksToSync = tasks.map((task:  any) => {
      const dueDate = task.due?. date 
        ? (task.due.date. includes('T') ? task.due.date : `${task.due.date}T12:00:00`)
        : null;

      return {
        user_id: user.id,
        todoist_id: task. id,
        title: task. content,
        description: task.description || '',
        completed: task.checked === 1,
        due_date: dueDate,
        priority: task.priority || 1,
        labels: task.labels || [],
        project_id:  task.project_id || null,
        parent_id: task.parent_id || null,
      };
    });

    // ✅ NOWA LOGIKA: Sync bez upsert (unikamy constraint error)
    let syncedCount = 0;
    let updatedCount = 0;
    let insertedCount = 0;

    for (const task of tasksToSync) {
      try {
        // Sprawdź czy zadanie już istnieje
        const { data: existing, error: checkError } = await supabase
          . from('day_assistant_v2_tasks')
          .select('id')
          .eq('user_id', task.user_id)
          .eq('todoist_id', task.todoist_id)
          .maybeSingle();

        if (checkError) {
          console.error('[Todoist Sync] Error checking task:', checkError);
          continue;
        }

        if (existing) {
          // UPDATE istniejącego zadania
          const { error: updateError } = await supabase
            .from('day_assistant_v2_tasks')
            .update({
              title: task.title,
              description: task.description,
              completed: task.completed,
              due_date: task.due_date,
              priority: task.priority,
              labels: task.labels,
              project_id: task.project_id,
              parent_id: task.parent_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('[Todoist Sync] Error updating task:', updateError);
          } else {
            updatedCount++;
            syncedCount++;
          }
        } else {
          // INSERT nowego zadania
          const { error: insertError } = await supabase
            .from('day_assistant_v2_tasks')
            .insert({
              ... task,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console. error('[Todoist Sync] Error inserting task:', insertError);
          } else {
            insertedCount++;
            syncedCount++;
          }
        }
      } catch (taskError) {
        console.error('[Todoist Sync] Error syncing task:', taskError);
      }
    }

    console. log(`[Todoist Sync] Synced ${syncedCount} tasks (${insertedCount} new, ${updatedCount} updated)`);

    // Zaktualizuj sync token
    const { error: tokenUpdateError } = await supabase
      .from('todoist_tokens')
      .update({ 
        sync_token: newSyncToken,
        last_sync: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (tokenUpdateError) {
      console.error('[Todoist Sync] Error updating sync token:', tokenUpdateError);
    }

    // Zapisz metadata syncu
    const { error: metadataError } = await supabase
      . from('sync_metadata')
      .upsert({
        user_id: user.id,
        last_sync: new Date().toISOString(),
        sync_token: newSyncToken,
        tasks_synced: syncedCount,
        source: 'todoist',
      }, {
        onConflict: 'user_id'
      });

    if (metadataError) {
      console.error('[Todoist Sync] Error saving sync metadata:', metadataError);
    }

    console.log('[Todoist Sync] Sync completed successfully');

    return res.status(200).json({
      success: true,
      tasks_synced: syncedCount,
      tasks_inserted: insertedCount,
      tasks_updated: updatedCount,
      sync_token: newSyncToken,
      timestamp: new Date().toISOString(),
    });

  } catch (error:  any) {
    console.error('[Todoist Sync] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message :  undefined
    });
  }
}
