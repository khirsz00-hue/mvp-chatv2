# Task Modal Testing Checklist

## 🖥️ Desktop Testing

### Layout & Display
- [ ] Modal opens with correct size (max-w-3xl)
- [ ] Header is sticky and visible
- [ ] 2-column layout displays properly
- [ ] All fields visible without scrolling (for standard task)
- [ ] Buttons sticky at bottom

### Functionality - Dodawanie Zadania
- [ ] Tytuł: Input działa
- [ ] Opis: Textarea działa
- [ ] Czas: Slider 5-120 min działa
- [ ] Trudność: Slider 1-5 działa
- [ ] Projekt: Dropdown ładuje projekty
- [ ] Priorytet: 4 przyciski P1-P4 działają
- [ ] Termin: Date picker działa
- [ ] Quick dates: "Dziś", "Jutro" ustawiają datę
- [ ] Etykiety: Input z datalist działa
- [ ] Etykiety: Dodawanie przez Enter
- [ ] Etykiety: Dodawanie przez przycisk +
- [ ] Etykiety: Usuwanie przez kliknięcie
- [ ] Zapisz: Tworzy zadanie
- [ ] Anuluj: Zamyka modal bez zapisywania

### Functionality - Edycja Zadania
- [ ] Modal otwiera się z danymi zadania
- [ ] Wszystkie pola wypełnione poprawnie
- [ ] Edycja wszystkich pól działa
- [ ] Zapisz: Aktualizuje zadanie
- [ ] Ukończ: Oznacza jako ukończone
- [ ] Usuń: Usuwa zadanie (z potwierdzeniem?)

### Zakładki (Collapsible Sections)
- [ ] Podzadania: Otwiera/zamyka się
- [ ] Podzadania: Dodawanie działa
- [ ] Podzadania: Checkbox toggle działa
- [ ] Historia czasu: Otwiera/zamyka się
- [ ] Historia czasu: Pokazuje sesje jeśli są
- [ ] Historia czasu: Pokazuje podsumowanie
- [ ] Historia zmian: Otwiera/zamyka się (tylko edycja)
- [ ] Historia zmian: Pokazuje zmiany

### Keyboard Navigation
- [ ] Enter: Zapisuje formularz
- [ ] Escape: Zamyka modal
- [ ] Tab: Przechodzi przez pola

### Visual Polish
- [ ] Purple gradient na przyciskach działa
- [ ] Hover states działają
- [ ] Focus states działają
- [ ] Transitions są smooth
- [ ] Kolory priorytetu się wyświetlają

## 📱 Mobile Testing (PWA)

### Layout & Display
- [ ] Modal zajmuje ~95vw szerokości
- [ ] Header sticky
- [ ] Pola ułożone stackowane
- [ ] Czas + Trudność obok siebie (2 kolumny)
- [ ] Przyciski sticky na dole
- [ ] Przyciski mają min-height 44px

### Auto-Keyboard Prevention
- [ ] Otwarcie modalu NIE wywołuje klawiatury
- [ ] Kliknięcie w input wywołuje klawiaturę
- [ ] Focus działa po kliknięciu

### Functionality - Dodawanie
- [ ] Wszystkie pola działają jak na desktop
- [ ] Slidery responsywne
- [ ] Przyciski priorytet tapable (44px)
- [ ] Quick dates "Dziś", "Jutro", "+3 dni"
- [ ] Etykiety: Input działa z ekranową klawiaturą

### Sticky Buttons
- [ ] Anuluj | Zapisz widoczne zawsze
- [ ] Ukończ | Usuń widoczne (tryb edycji)
- [ ] Przyciski w thumb reach (dolna część ekranu)
- [ ] Kliknięcie działa bez problemów

### Mobile Tabs
- [ ] Tabs pokazują się tylko gdy są dane
- [ ] Horizontal scroll działa płynnie
- [ ] Kliknięcie otwiera slide-up panel
- [ ] Panel zajmuje max 65vh
- [ ] Kliknięcie tła zamyka panel
- [ ] Przycisk X zamyka panel
- [ ] Handle na górze panelu widoczny

### Tab Content - Podzadania
- [ ] Lista podzadań wyświetla się
- [ ] Dodawanie działa (input + button)
- [ ] Checkbox toggle działa
- [ ] Scrollowanie działa jeśli wiele

### Tab Content - Historia Czasu
- [ ] Podsumowanie widoczne
- [ ] Lista sesji wyświetla się
- [ ] Empty state gdy brak sesji
- [ ] Badge z typem sesji (🍅/⏱️)

### Tab Content - Historia Zmian
- [ ] Lista zmian wyświetla się
- [ ] Empty state gdy brak zmian
- [ ] Formatowanie zmian czytelne

### Touch Interactions
- [ ] Wszystkie przyciski reagują na tap
- [ ] Nie ma opóźnienia (300ms delay)
- [ ] Slidery działają z touch
- [ ] Scrollowanie płynne
- [ ] Swipe to close panel? (nice to have)

## 🔄 Edge Cases

### Długie Teksty
- [ ] Długi tytuł zadania (100+ znaków)
- [ ] Długi opis (500+ znaków)
- [ ] Wiele etykiet (10+)
- [ ] Wiele podzadań (20+)
- [ ] Długie nazwy projektów

### Empty States
- [ ] Brak projektów
- [ ] Brak etykiet z Todoist
- [ ] Brak podzadań
- [ ] Brak historii czasu
- [ ] Brak historii zmian

### Errors
- [ ] Zapisywanie bez tytułu (powinno być disabled)
- [ ] Network error podczas zapisywania
- [ ] Network error podczas ładowania projektów
- [ ] Duplicate labels handling

### Performance
- [ ] Otwarcie modalu < 100ms
- [ ] Smooth scrolling
- [ ] Brak lagów przy wpisywaniu
- [ ] Brak lagów przy sliderach

## 🌐 Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Safari iOS (PWA)
- [ ] Chrome Android (PWA)
- [ ] Firefox mobile
- [ ] Samsung Internet

## 📊 Accessibility

### Screen Readers
- [ ] Labels są czytane
- [ ] Przyciski mają aria-labels
- [ ] Modal ma role="dialog"
- [ ] Focus trap działa

### Keyboard Only
- [ ] Wszystko dostępne z klawiatury
- [ ] Focus visible
- [ ] Tab order logiczny

### Color Contrast
- [ ] Wszystkie teksty czytelne
- [ ] Przyciski kontrastowe
- [ ] Disabled states widoczne

## ✅ Success Criteria

### Must Have
- ✅ Modal działa na desktop i mobile
- ✅ Wszystkie pola zapisują się poprawnie
- ✅ Brak auto-keyboard na mobile
- ✅ Przyciski w thumb reach
- ✅ Historia czasu działa
- ✅ Etykiety działają z datalist

### Nice to Have
- 🎯 Animacje smooth
- 🎯 Empty states piękne
- 🎯 Loading states
- 🎯 Error handling

## 🐛 Known Issues / Limitations

1. Datalist support: iOS Safari < 14.5 nie wspiera datalist
   - Fallback: Nadal można wpisać ręcznie
   
2. Safe area insets: `pb-safe` może nie działać we wszystkich browserach
   - Fallback: Dodatkowy padding na mobile

3. Horizontal scroll tabs: Może wymagać wskazówki dla użytkownika
   - Solution: Dodać subtle arrow hint?

## 📝 Testing Notes

### Device Matrix
- 📱 iPhone 12 Pro (iOS 16+)
- 📱 Samsung Galaxy S21 (Android 12+)
- 💻 MacBook Pro 14" (2880x1800)
- 💻 Windows laptop 15" (1920x1080)
- 🖥️ Desktop 27" (2560x1440)

### Test Scenarios
1. **Quick Add**: Tytuł + Priorytet + Data = < 5 sekund
2. **Full Add**: Wszystkie pola + Podzadania = < 15 sekund
3. **Edit**: Zmiana 3 pól = < 10 sekund
4. **Mobile Quick Add**: < 8 sekund (including thumb movement)

### Performance Targets
- First Render: < 100ms
- Interaction Response: < 50ms
- Animation: 60 FPS
- Memory: < 5MB increase
