# Bidirectional Todoist Sync - Testing Guide

## Overview
This document describes how to test the bidirectional synchronization between Day Assistant v2 and Todoist.

## Prerequisites
1. User account with valid Todoist OAuth token stored in `user_profiles.todoist_token`
2. Day Assistant v2 setup and configured
3. At least one task synced from Todoist to Day Assistant v2

## Test Cases

### 1. Test "Nie dziś" (Postpone) Functionality
**Goal:** Verify that postponing a task updates the due_date in both Supabase and Todoist

**Steps:**
1. Open Day Assistant v2
2. Find a task with today's date that was synced from Todoist (has `todoist_id`)
3. Click the "Nie dziś" button
4. **Expected Results:**
   - Task moves to tomorrow in Day Assistant v2
   - Task's `due_date` updates in Supabase `day_assistant_v2_tasks` table
   - Task's due date updates in Todoist (check Todoist web/app)
   - After page refresh, task still shows tomorrow's date (no rollback)

**Verification:**
```sql
-- Check Supabase
SELECT title, due_date, todoist_id, postpone_count 
FROM day_assistant_v2_tasks 
WHERE title = 'YOUR_TASK_TITLE';

-- Check logs
-- Look for: [syncTaskChangeToTodoist] ✅ Synced to Todoist: {todoist_id}
```

### 2. Test Task Completion
**Goal:** Verify that completing a task marks it as completed in both systems

**Steps:**
1. Open Day Assistant v2
2. Find an incomplete task that was synced from Todoist
3. Click to complete the task
4. **Expected Results:**
   - Task marked as completed in Day Assistant v2
   - `completed` and `completed_at` fields updated in Supabase
   - Task marked as closed in Todoist
   - Task no longer appears in active tasks list

**Verification:**
```sql
-- Check Supabase
SELECT title, completed, completed_at, todoist_id 
FROM day_assistant_v2_tasks 
WHERE title = 'YOUR_TASK_TITLE';

-- Check logs
-- Look for: [syncTaskChangeToTodoist] ✅ Completed task in Todoist: {todoist_id}
```

### 3. Test Task Update (Title/Description)
**Goal:** Verify that editing task details updates Todoist

**Steps:**
1. Open Day Assistant v2
2. Find a task synced from Todoist
3. Edit the task's title or description
4. Save changes
5. **Expected Results:**
   - Changes saved in Supabase
   - Changes reflected in Todoist
   - No data loss or corruption

**API Call:**
```javascript
// PUT /api/day-assistant-v2/task
{
  "task_id": "xxx",
  "title": "Updated Task Title",
  "description": "Updated description"
}
```

**Verification:**
```sql
-- Check Supabase
SELECT title, description, todoist_id 
FROM day_assistant_v2_tasks 
WHERE id = 'YOUR_TASK_ID';

-- Check logs
-- Look for: [syncTaskChangeToTodoist] ✅ Synced to Todoist: {todoist_id}
```

### 4. Test Due Date Change
**Goal:** Verify that changing due_date via update API syncs to Todoist

**Steps:**
1. Use API or UI to update a task's due_date
2. **Expected Results:**
   - Due date updated in Supabase
   - Due date updated in Todoist
   - Changes persist after page refresh

**API Call:**
```javascript
// PUT /api/day-assistant-v2/task
{
  "task_id": "xxx",
  "due_date": "2025-12-25"
}
```

### 5. Test Task Deletion
**Goal:** Verify that deleting a task removes it from both systems

**Steps:**
1. Find a task synced from Todoist
2. Delete the task via API or UI
3. **Expected Results:**
   - Task removed from Supabase `day_assistant_v2_tasks`
   - Task deleted from Todoist
   - Task no longer appears in either system

**API Call:**
```javascript
// DELETE /api/day-assistant-v2/tasks/{taskId}
```

**Verification:**
```sql
-- Check Supabase (should return no results)
SELECT * FROM day_assistant_v2_tasks WHERE id = 'DELETED_TASK_ID';

-- Check logs
-- Look for: [Delete Task] ✅ Deleted from Todoist: {todoist_id}
```

### 6. Test Tags/Labels Sync
**Goal:** Verify that tag changes sync to Todoist as labels

**Steps:**
1. Update a task's tags via API
2. **Expected Results:**
   - Tags updated in Supabase
   - Labels updated in Todoist

**API Call:**
```javascript
// PUT /api/day-assistant-v2/task
{
  "task_id": "xxx",
  "tags": ["urgent", "work"]
}
```

### 7. Test Error Handling - Missing Todoist Token
**Goal:** Verify graceful degradation when Todoist token is missing

**Steps:**
1. Temporarily remove or invalidate user's Todoist token
2. Try to postpone or complete a task
3. **Expected Results:**
   - Local changes still succeed
   - Warning logged: `[syncTaskChangeToTodoist] No Todoist token found`
   - User experience not disrupted

### 8. Test Error Handling - Todoist API Failure
**Goal:** Verify graceful degradation when Todoist API fails

**Steps:**
1. Simulate Todoist API failure (network issue or invalid todoist_id)
2. Try to complete or update a task
3. **Expected Results:**
   - Local changes still succeed
   - Error logged but app continues
   - User experience not disrupted

### 9. Test Conflict Resolution
**Goal:** Verify behavior when task changed in both systems

**Steps:**
1. Change a task's title in Todoist
2. Change the same task's title in Day Assistant v2 (before sync runs)
3. **Expected Results:**
   - Last write wins (Day Assistant v2 change overwrites Todoist)
   - No crash or data corruption
   - Consider implementing conflict detection in future

### 10. Test Refresh Doesn't Rollback Changes
**Goal:** Verify postponed tasks don't revert after Todoist sync

**Steps:**
1. Postpone a task ("Nie dziś")
2. Wait for background Todoist sync to run (~30s)
3. Refresh the page
4. **Expected Results:**
   - Task still shows tomorrow's date
   - Todoist sync respects local changes
   - No "flicker" or rollback

## Performance Testing

### Batch Operations
1. Postpone multiple tasks (5-10)
2. **Expected:**
   - All tasks update locally
   - Sync happens for each task
   - UI remains responsive

### Large Task Lists
1. Test with 50+ tasks
2. Perform updates
3. **Expected:**
   - No timeout errors
   - Reasonable response times (<2s)

## Edge Cases

### Task with null due_date
1. Update a task that has `due_date = null`
2. **Expected:** Sync handles null values correctly

### Task with only todoist_task_id (legacy field)
1. Find a task with `todoist_task_id` but no `todoist_id`
2. Update it
3. **Expected:** Sync uses fallback: `todoist_id ?? todoist_task_id`

### Subtasks (Custom Field)
1. Add subtasks to a task
2. **Expected:** Subtasks stored locally, NOT synced to Todoist

### Estimate Minutes (Custom Field)
1. Set estimate_min on a task
2. **Expected:** Estimate stored locally, NOT synced to Todoist

## Logging and Monitoring

Look for these log patterns:

**Success:**
- `[syncTaskChangeToTodoist] ✅ Synced to Todoist: {todoist_id}`
- `[syncTaskChangeToTodoist] ✅ Completed task in Todoist: {todoist_id}`
- `[Delete Task] ✅ Deleted from Todoist: {todoist_id}`

**Warnings:**
- `[syncTaskChangeToTodoist] No Todoist token found`
- `[day-assistant-v2/task] Todoist create failed with status {status}`
- `[Delete Task] Failed to delete from Todoist: {status}`

**Errors:**
- `[syncTaskChangeToTodoist] Failed to complete task in Todoist`
- `[syncTaskChangeToTodoist] Failed to update Todoist: {error}`
- `[syncTaskChangeToTodoist] Error: {error}`
- `[Delete Task] Error deleting from Todoist: {error}`

## Automated Testing (Future)

Consider adding these automated tests:
1. Unit tests for `syncTaskChangeToTodoist()`
2. Integration tests for API endpoints
3. Mock Todoist API responses
4. Test error handling paths

## Known Limitations

1. **Subtasks**: Not synced to Todoist (custom Day Assistant feature)
2. **Estimate Minutes**: Not synced to Todoist (custom field)
3. **Conflict Resolution**: Last write wins (no merge strategy)
4. **Rate Limiting**: No built-in rate limiting for Todoist API
5. **Retry Logic**: No automatic retry on failure

## Success Criteria

All test cases should pass with:
- ✅ Changes persist after page refresh
- ✅ No data loss or corruption
- ✅ Graceful error handling
- ✅ Appropriate logging
- ✅ Reasonable performance
