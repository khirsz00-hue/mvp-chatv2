# Day Assistant v1 API - DEPRECATED

⚠️ **This directory contains deprecated Day Assistant v1 API endpoints.**

## Status: Deprecated

These endpoints are no longer actively used or maintained. They were part of Day Assistant v1 which has been replaced by Day Assistant v2.

## Migration

**Old v1 API:** `/api/day-assistant/*`  
**New v2 API:** `/api/day-assistant-v2/*`

### Endpoint Mapping

| v1 Endpoint | v2 Replacement | Notes |
|-------------|----------------|-------|
| `GET /api/day-assistant/queue` | `GET /api/day-assistant-v2/dayplan` | Returns day plan with tasks |
| `POST /api/day-assistant/tasks` | `POST /api/day-assistant-v2/task` | Create task |
| `PUT /api/day-assistant/tasks` | `PUT /api/day-assistant-v2/task` | Update task |
| `POST /api/day-assistant/actions` | `POST /api/day-assistant-v2/postpone` | Postpone action |
| `POST /api/day-assistant/undo` | `POST /api/day-assistant-v2/undo` | Undo last action |
| `GET /api/day-assistant/timeline` | `GET /api/day-assistant-v2/dayplan` | Timeline included in dayplan |
| `POST /api/day-assistant/timeline/approve` | `POST /api/day-assistant-v2/proposal` | Accept proposal |
| `POST /api/day-assistant/timeline/reject` | `POST /api/day-assistant-v2/proposal` | Reject proposal |
| `GET /api/day-assistant/energy-mode` | Removed | Use energy/focus sliders in v2 |
| `POST /api/day-assistant/energy-mode` | `POST /api/day-assistant-v2/dayplan` | Update sliders |
| `POST /api/day-assistant/chat` | Removed | No chat in v2 |
| `POST /api/day-assistant/recommendations/*` | `GET /api/day-assistant-v2/dayplan` | Auto-generated proposals |

## Database Tables

**v1 Tables (deprecated):**
- `day_assistant_tasks`
- `day_assistant_subtasks`
- `day_chat_messages`
- `day_timeline_events`
- `user_energy_state`
- `task_action_history`
- `flow_blocks`

**v2 Tables (active):**
- `assistant_config`
- `test_day_assistant_tasks`
- `test_day_plan`
- `test_day_proposals`
- `test_day_decision_log`
- `test_day_undo_history`
- `sync_metadata`

## Why the Change?

Day Assistant v2 was designed from the ground up with:
- Better ADHD-friendly features (dual sliders, MUST tasks)
- Improved Todoist integration
- Cleaner data model
- More intelligent AI recommendations
- Complete audit trail for learning

## Removal Plan

These endpoints are kept temporarily for:
1. Backward compatibility during migration period
2. Reference for understanding v1 behavior
3. Potential data migration scripts

**Planned removal:** TBD (after confirming no active usage)

## For Developers

❌ **Do not** add new features to v1 endpoints  
❌ **Do not** fix non-critical bugs in v1  
✅ **Do** use v2 endpoints for all new code  
✅ **Do** refer to [DAY_ASSISTANT_V2_ARCHITECTURE.md](../../../docs/DAY_ASSISTANT_V2_ARCHITECTURE.md) for v2 documentation

## Questions?

See: [docs/DAY_ASSISTANT_V2_ARCHITECTURE.md](../../../docs/DAY_ASSISTANT_V2_ARCHITECTURE.md)
