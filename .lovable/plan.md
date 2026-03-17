

# Frequency Analyser — Implementation Plan

## Overview
Port the uploaded frequency analyser JSX application into the project, restyled with the Harmonic Geometry aesthetic (dark obsidian background, neon cyan/electric violet/gold accents) and enhanced with educational "Fun Fact" callouts about musical intervals and human perception.

## Design System
- **Background:** #050508 (Deep Obsidian)
- **Panels:** #0a0a0f with 1px borders in #1a1a2e
- **Primary (Note A):** #00F5FF (Neon Cyan)
- **Secondary (Note B):** #7000FF (Electric Violet)
- **Text:** #E0E0E0 (Cool Silver)
- **Fun Facts/Accents:** #FFD700 (Gold)
- **Fonts:** JetBrains Mono (data/display), Inter (body/educational text)

## Layout (Optimised for Above-the-Fold)
1. **Sticky Header Bar** — App title "Frequency Analyser", current notes, interval delta stats (Hz, semitones, Bark, Mel)
2. **Controls Row** — Note sliders, interval selector buttons, overtone toggle, interference engine pills — compact two-column grid
3. **Interval Insight Bar** — Gold-accented strip with rotating fun facts about the currently selected interval (e.g., "A Perfect Fifth has a 3:2 ratio — it's the basis of most tuning systems")
4. **Spectrum Charts** — All four psychoacoustic views (Hz, Log, Bark, Mel) made more compact (~100px height each) with the design brief's glow aesthetic — cyan/violet reference lines on obsidian
5. **Musical Keyboard** — Flat, low-profile design at the bottom with harmonic markers, dark keys styled to match the theme

## Educational Fun Facts System
- A curated dictionary of fun facts mapped to each interval (Unison through Octave)
- Facts cover real-world perception, historical context, and physics (e.g., "Unison: Two identical frequencies create constructive interference — this is why choirs sound powerful")
- Displayed in the gold-accented Insight Bar, cross-fading when the interval changes
- Additional contextual tooltips on the interference engine explaining roughness/beating

## Key Features Preserved
- Two-note frequency comparison with adjustable MIDI values
- Harmonic overtone series visualisation (6 harmonics per note)
- Four psychoacoustic spectrum views (Physical Hz, Theoretical Log, Biological Bark, Psychological Mel)
- Interference engine highlighting clashing harmonics
- Interactive keyboard with harmonic hover tooltips
- Interval quick-select buttons

## Files to Create/Modify
- `src/pages/Index.tsx` — Main Frequency Analyser app component
- `src/index.css` — Updated CSS variables for the new theme
- `index.html` — Add Google Fonts (JetBrains Mono, Inter)

