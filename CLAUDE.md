# Calculator App - Claude Code Context

A feature-rich calculator built with vanilla HTML, CSS, and JavaScript.

## Current Status

**Single-file calculator** — basic arithmetic working, ready for feature expansion.

## Tech Stack

- **Pure vanilla**: HTML + CSS + JS, no dependencies, no build step
- **Single file**: `index.html` (all-in-one)
- **Responsive**: Mobile-friendly grid layout

## Current Features

- Basic arithmetic (+, −, ×, ÷)
- Keyboard support (numbers, operators, Enter, Escape, Backspace)
- Backspace and clear
- Divide-by-zero protection
- Responsive design with gradient UI

## Architecture Decisions

- **No frameworks** — keep it vanilla JS, zero dependencies
- **Single file for now** — split into separate HTML/CSS/JS files when complexity warrants it
- **Progressive enhancement** — each feature should work independently

## Feature Roadmap

### Phase 1: Quick Wins
- [ ] Percentage button (%)
- [ ] +/- sign toggle
- [ ] Copy result to clipboard (click display)
- [ ] Decimal formatting with commas for large numbers
- [ ] Improved button press animations

### Phase 2: Core Enhancements
- [ ] Calculation history (scrollable sidebar/panel)
- [ ] Memory functions (M+, M-, MR, MC)
- [ ] Parentheses support for grouped expressions
- [ ] Dark/light mode toggle with persistence (localStorage)
- [ ] Expression display (show full equation above result)

### Phase 3: Scientific Mode
- [ ] Square root, power, exponent
- [ ] Trigonometric functions (sin, cos, tan)
- [ ] Logarithms (log, ln)
- [ ] Constants (π, e)
- [ ] Factorial
- [ ] Toggle between basic and scientific layouts

### Phase 4: Utilities & Extras
- [ ] Unit converter (length, weight, temperature, currency)
- [ ] Tip calculator mode
- [ ] Age/date calculator
- [ ] Theme picker (multiple color schemes)
- [ ] Sound effects toggle (subtle key clicks)

### Phase 5: Polish & Distribution
- [ ] PWA support (manifest, service worker, installable)
- [ ] Offline mode
- [ ] Keyboard shortcut cheat sheet overlay (? key)
- [ ] Accessibility (ARIA labels, screen reader support, focus management)
- [ ] Share calculation via URL params
- [ ] Localization (number format per locale)

## Development

```bash
# Open in browser
open index.html

# Or use a local server
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## File Structure (planned)

When complexity grows, split into:
```
├── index.html
├── css/
│   ├── main.css
│   ├── themes.css
│   └── scientific.css
├── js/
│   ├── calculator.js
│   ├── history.js
│   ├── memory.js
│   ├── scientific.js
│   ├── converter.js
│   └── themes.js
├── assets/
│   ├── icons/
│   └── sounds/
├── manifest.json
├── sw.js
└── CLAUDE.md
```

## Git Conventions

Follow shared conventions from dev-config:
- Commit types: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Keep commits focused — one feature per commit

## Security

- No backend, no secrets, no API keys
- All computation is client-side
- localStorage used only for preferences (theme, history)
