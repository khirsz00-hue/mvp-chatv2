# Six Thinking Hats - Decision Assistant

## Overview

The Six Thinking Hats feature implements Edward de Bono's systematic decision-making methodology, guiding users through six different perspectives to analyze their decisions comprehensively. All interactions are in Polish language.

## User Flow

### 1. Create a Decision
Users start by creating a new decision in the Decision Assistant:
- Navigate to the Decision Assistant
- Click "Nowa decyzja" (New Decision)
- Enter title, description, and context
- Submit to create the decision

### 2. Start Six Hats Analysis
From the decision detail page:
- Click "Rozpocznij Analizę" (Start Analysis) in the Six Thinking Hats card
- The workflow will automatically begin with the Blue Hat (Organization)

### 3. Progress Through Each Hat
For each of the 6 hats, the system will:
1. **Generate AI Questions**: Automatically generate 3-5 contextual questions specific to that hat's perspective
2. **User Response**: User provides their thoughts and answers
3. **AI Analysis**: Generate comprehensive analysis based on the user's responses
4. **Progress**: Automatically move to the next hat

The six hats in order:
1. 🔵 **Blue Hat (Niebieski)** - Organization and goal setting
2. ⚪ **White Hat (Biały)** - Facts and objective data
3. 🔴 **Red Hat (Czerwony)** - Emotions and intuition
4. ⚫ **Black Hat (Czarny)** - Risks and potential problems
5. 🟡 **Yellow Hat (Żółty)** - Benefits and opportunities
6. 🟢 **Green Hat (Zielony)** - Creative ideas and alternatives

### 4. View Synthesis
After completing all 6 hats:
- The system automatically generates a comprehensive synthesis
- Displays organized summary including:
  - Key facts
  - Emotions and intuitions
  - Main risks
  - Main benefits
  - Creative ideas
  - Options to consider
  - Recommendation
  - Next steps

## Technical Architecture

### Database Schema

**decisions table additions:**
```sql
current_hat TEXT CHECK (current_hat IN ('blue', 'white', 'red', 'black', 'yellow', 'green') OR current_hat IS NULL)
hat_answers JSONB DEFAULT '[]'::jsonb
```

**decision_events table:**
- Stores each hat analysis as an event with `event_type = 'hat_analysis'`
- Stores final synthesis as `event_type = 'synthesis'`

### API Endpoints

#### POST `/api/decisions/[id]/hats`

Main endpoint for Six Hats workflow operations.

**Actions:**

1. **generate_questions**
   ```json
   {
     "action": "generate_questions",
     "hatColor": "blue"
   }
   ```
   Response:
   ```json
   {
     "success": true,
     "hat": "blue",
     "questions": ["pytanie 1", "pytanie 2", ...]
   }
   ```

2. **submit_answer**
   ```json
   {
     "action": "submit_answer",
     "hatColor": "blue",
     "userAnswer": "Moja odpowiedź...",
     "questions": ["pytanie 1", ...]
   }
   ```
   Response:
   ```json
   {
     "success": true,
     "hatAnswer": { ... },
     "nextHat": "white",
     "completed": false,
     "synthesis": null
   }
   ```
   
   When `nextHat` is `null`, `completed` is `true` and `synthesis` contains the final analysis.

3. **skip_hat**
   ```json
   {
     "action": "skip_hat",
     "hatColor": "blue"
   }
   ```

4. **regenerate_synthesis**
   ```json
   {
     "action": "regenerate_synthesis"
   }
   ```

#### GET `/api/decisions/[id]/hats`

Get current hat status and progress.

Response:
```json
{
  "currentHat": "blue",
  "hatAnswers": [...],
  "completed": false
}
```

### AI Service

**lib/services/sixHatsAI.ts**

Key functions:

- `generateHatQuestions(decision, hatColor, previousAnswer)`: Generates contextual questions using GPT-4
- `analyzeHatAnswer(decision, hatColor, userAnswer, questions)`: Analyzes user's response
- `generateSynthesis(decision, hatAnswers)`: Creates final comprehensive synthesis
- `withRetry(fn, maxRetries, delayMs)`: Implements exponential backoff for rate limiting

### Prompts

**lib/prompts/sixHats.ts**

Contains:
- `HAT_PROMPTS`: System prompts and user prompt templates for each hat
- `SYNTHESIS_PROMPT`: Template for final synthesis generation
- `HAT_ORDER`: Array defining the order of hats
- Helper functions: `getNextHat()`, `isAnalysisComplete()`, `getHatProgress()`

All prompts are in Polish and follow the Six Thinking Hats methodology precisely.

### Components

**SixHatsWorkflow.tsx**

Main workflow component that manages:
- Hat progression
- Question display
- Answer collection
- AI analysis display
- Progress tracking
- Final synthesis view
- Animations using framer-motion

Features:
- Progress bar showing completion percentage
- Visual indicators for each hat
- Toast notifications for feedback
- Error handling and retry options
- Skip hat functionality
- Automatic progression

## Data Flow

1. User creates decision → stored in `decisions` table
2. User starts Six Hats analysis → `current_hat` set to 'blue'
3. For each hat:
   - AI generates questions → displayed to user
   - User submits answer → saved to `hat_answers` JSONB array
   - AI analyzes answer → event created in `decision_events`
   - Progress to next hat → `current_hat` updated
4. After all hats:
   - `current_hat` set to null
   - Final synthesis generated
   - Synthesis event created
   - Status updated to 'analyzed'

## Error Handling

- **Rate Limiting**: Automatic retry with exponential backoff (3 retries max)
- **Network Errors**: User-friendly error messages with retry buttons
- **Missing Data**: Fallback questions if AI generation fails
- **Toast Notifications**: Real-time feedback for all operations

## UI/UX Features

### Animations
- Smooth transitions between hats (slide in/out)
- Progress bar animation
- Loading states with spinners
- Success indicators

### Visual Design
- Each hat has unique color gradient background
- Large emoji icons for easy identification
- Progress dots showing completion status
- Responsive layout for mobile and desktop

### User Guidance
- Clear descriptions for each hat
- Helpful questions to guide thinking
- Option to skip if not applicable
- Comprehensive final summary

## Testing Checklist

### Basic Flow
- [ ] Create new decision
- [ ] Start Six Hats analysis
- [ ] Generate questions for Blue Hat
- [ ] Submit answer and see AI analysis
- [ ] Progress through all 6 hats
- [ ] View final synthesis
- [ ] Return to decision list

### Edge Cases
- [ ] Skip a hat without answering
- [ ] Retry after network error
- [ ] Handle rate limiting gracefully
- [ ] Resume incomplete analysis
- [ ] View completed analysis

### Data Persistence
- [ ] Answers saved to database
- [ ] Can reload page and continue
- [ ] History preserved in events
- [ ] Synthesis stored correctly

### UI/UX
- [ ] Animations work smoothly
- [ ] Toast notifications appear
- [ ] Progress bar updates
- [ ] Mobile responsive
- [ ] Error messages clear

## Future Enhancements

Potential improvements:
- Export synthesis as PDF
- Compare multiple decision analyses
- Custom hat order/selection
- Team decision analysis
- Decision templates
- Analytics dashboard

## Maintenance Notes

### Updating Prompts
To modify AI prompts, edit `lib/prompts/sixHats.ts`. Ensure:
- Polish language maintained
- Follow Six Thinking Hats methodology
- Test with various decision types
- Validate JSON format for synthesis

### Database Migrations
New migration file: `supabase/migrations/20231215_add_hat_support.sql`
Run migrations before deploying changes.

### Dependencies
- `openai`: ^4.28.0 - AI generation
- `framer-motion`: ^11.0.0 - Animations
- `@phosphor-icons/react`: ^2.1.7 - Icons
- `@supabase/supabase-js`: ^2.39.0 - Database

## Support

For issues or questions:
1. Check error messages in toast notifications
2. Review browser console for detailed logs
3. Verify OpenAI API key is configured
4. Check database connection
5. Ensure migrations are applied
