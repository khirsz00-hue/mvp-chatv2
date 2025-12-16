# Login UI Preview

## New Authentication Options

The login page now supports three authentication methods:

### 1. Google OAuth (Recommended)
```
┌─────────────────────────────────────────┐
│  [🔵 Zaloguj się przez Google]         │
└─────────────────────────────────────────┘
```
- One-click authentication
- No password to remember
- Secure OAuth 2.0 flow

### 2. Email + Password
```
┌─────────────────────────────────────────┐
│                                         │
│  Adres email                           │
│  ┌───────────────────────────────────┐ │
│  │ twoj@email.pl                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Hasło                                 │
│  ┌───────────────────────────────────┐ │
│  │ ••••••••                          │ │
│  └───────────────────────────────────┘ │
│  Minimum 6 znaków                      │
│                                         │
│  ┌─────────────────────────────────────┐
│  │      Zaloguj się / Utwórz konto    │
│  └─────────────────────────────────────┘
│                                         │
└─────────────────────────────────────────┘
```

### 3. Magic Link (Email OTP)
```
Link below form:
"Lub użyj magic link" → Existing flow
```

## UI Layout (Full Page)

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║              🧠 AI Assistants PRO                 ║
║         Zaloguj się do swojego konta             ║
║                                                   ║
║   ┌─────────────────────────────────────────┐   ║
║   │  🔵 [G] Zaloguj się przez Google       │   ║
║   └─────────────────────────────────────────┘   ║
║                                                   ║
║   ─────────────── lub ────────────────           ║
║                                                   ║
║   Adres email                                    ║
║   ┌───────────────────────────────────────┐     ║
║   │ twoj@email.pl                         │     ║
║   └───────────────────────────────────────┘     ║
║                                                   ║
║   Hasło                                          ║
║   ┌───────────────────────────────────────┐     ║
║   │ ••••••••                              │     ║
║   └───────────────────────────────────────┘     ║
║   Minimum 6 znaków                               ║
║                                                   ║
║   ┌─────────────────────────────────────────┐   ║
║   │           Zaloguj się                    │   ║
║   └─────────────────────────────────────────┘   ║
║                                                   ║
║   Nie masz konta? Zarejestruj się              ║
║   Lub użyj magic link                           ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

## State Transitions

### Sign In Mode (Default)
- Shows: "Zaloguj się" button
- Link: "Nie masz konta? **Zarejestruj się**"

### Sign Up Mode
- Shows: "Utwórz konto" button
- Link: "Masz już konto? **Zaloguj się**"
- Password hint: "Minimum 6 znaków"

### Magic Link Mode
- Shows: Single email field
- Button: "Wyślij magic link"
- Link: "← Powrót do logowania"

### Magic Link Sent
- Shows: Success message
- Text: "Wysłaliśmy link do logowania na adres **{email}**"
- Button: "Wyślij ponownie"
- Link: "← Powrót do logowania"

## Color Scheme
- **Primary Button**: Purple gradient (`from-brand-purple to-brand-pink`)
- **Google Button**: White with Google logo and border
- **Inputs**: White with gray border, purple focus ring
- **Background**: Gradient (`from-purple-50 via-white to-pink-50`)

## Component Structure
```typescript
LoginPage
├── mode: 'signin' | 'signup' | 'magic-link' | 'magic-link-sent'
├── Google OAuth Button
├── Separator ("lub")
├── Email + Password Form
│   ├── Email Input
│   ├── Password Input
│   └── Submit Button
└── Mode Toggles
    ├── Sign In ⟷ Sign Up
    └── "Lub użyj magic link"
```

## Responsive Design
- **Desktop**: Centered card, max-width 28rem (448px)
- **Mobile**: Full width with padding
- **Touch**: Large tap targets (buttons min 44px height)

## Accessibility
- ✅ Proper form labels
- ✅ Required field indicators
- ✅ Password minimum length validation
- ✅ Error message display
- ✅ Loading states (disabled buttons)
- ✅ Keyboard navigation

## User Flows

### New User Registration
```
1. Click "Nie masz konta? Zarejestruj się"
2. Enter email + password (min 6 chars)
3. Click "Utwórz konto"
4. → Redirect to home page
5. → See welcome/onboarding
```

### Existing User Login
```
1. Enter email + password
2. Click "Zaloguj się"
3. → Redirect to home page
4. → Resume previous session
```

### Google OAuth
```
1. Click "Zaloguj się przez Google"
2. → Redirect to Google
3. Select Google account
4. Grant permissions
5. → Redirect back to app
6. → Automatic login
```

### Magic Link
```
1. Click "Lub użyj magic link"
2. Enter email
3. Click "Wyślij magic link"
4. Check email inbox
5. Click link
6. → Automatic login
```

## Error Handling

### Email Already Exists
```
Toast (red): "Ten email jest już zarejestrowany. Spróbuj się zalogować."
→ Auto-switch to sign in mode
```

### Invalid Credentials
```
Toast (red): "Nieprawidłowy email lub hasło"
→ Clear password field
```

### OAuth Error
```
Toast (red): "Błąd podczas logowania przez Google"
→ Return to login page
```

### Magic Link Sent
```
Toast (green): "Magic link wysłany! Sprawdź swoją skrzynkę email."
→ Show "Sprawdź swoją skrzynkę email" message
```

## Implementation Files
- **Component**: `app/login/page.tsx`
- **Auth Client**: `lib/supabaseClient.ts`
- **Callback Handler**: `app/auth/callback/page.tsx`
- **State Manager**: `lib/authStateManager.ts`

## Testing Checklist
- [ ] Google OAuth works
- [ ] Email+password sign up creates account
- [ ] Email+password sign in logs in
- [ ] Magic link sends email
- [ ] Magic link login works
- [ ] Password validation (min 6 chars)
- [ ] Form validation (required fields)
- [ ] Loading states work
- [ ] Error messages display
- [ ] Success toasts show
- [ ] Responsive on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## Screenshots
_Screenshots will be taken after deployment to production environment._

**Locations to capture:**
1. `/login` - Default sign in view
2. `/login` - Sign up view (after toggle)
3. `/login` - Magic link view
4. `/login` - Magic link sent confirmation
5. Google OAuth consent screen
6. Post-login home page with auth cookies visible in DevTools

## Related Documentation
- `AUTH_FIX_SUMMARY.md` - Implementation details
- `AUTH_DIAGNOSTICS.md` - Troubleshooting guide
- `DAY_ASSISTANT_AUTH_FIX.md` - Previous auth implementation
