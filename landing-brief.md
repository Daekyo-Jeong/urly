# Urly — Landing Page Design Brief

A single-page download/marketing site for Urly, a macOS utility that turns any URL into a standalone `.app`. The deliverable is an HTML/CSS/JS prototype (Claude Design's native format).

## What Urly is, in one sentence

Urly turns any website into a real macOS app — searchable in Spotlight, dockable, with its own cookies, like Slack or Linear ships theirs, but for everything you use in a browser tab.

## The single message

**Add a URL → get a `.app`.**

Everything on the page should reinforce that one promise. The reader should walk away understanding that they can take, say, `notion.so`, paste it into Urly, and a few seconds later have `Notion.app` in their Dock that looks and acts like a first-party native app — without the company having shipped one.

## Required sections (in vertical order)

### 1. Hero — the only section that absolutely must work

- Urly's brand mark (the orange gradient squircle with the 4-tile grid — same one used in the app's sidebar). Roughly 96–112px, with a soft shadow.
- Wordmark "Urly" — large, tight letter-spacing, SF-style display weight.
- Tagline: *"Turn any URL into a macOS app."*
- One short supporting line: *"Spotlight-searchable. Dockable. Sessions don't bleed across sites. Free, personal use."*
- A single, very prominent primary CTA button:
  - Label: **Download for macOS** with a small chevron / down-arrow.
  - Sublabel underneath, smaller: `v0.1.0 · Apple Silicon · macOS 12+`
  - The button links to the DMG download URL. **Treat this as the most important pixel on the page** — make it impossible to miss.
- Secondary link in muted text: *"View on GitHub →"* linking to `github.com/Daekyo-Jeong/urly`.

### 2. The "before / after" demonstration

This is the section that sells the product. Two side-by-side panels:

- **Before** — a generic browser window with a tab bar, address bar showing `notion.so`, and 14 other tabs crammed next to it. Caption: *"A tab. Lost in the pile. Cookies tangled with every other Google session."*
- **After** — a clean macOS window with traffic lights, a centered title bar saying "Notion", and the Notion logo in the Dock (visible at the bottom). Caption: *"A real app. Cmd+Tab finds it. Its own cookie jar."*

The visual contrast does the talking — don't over-explain in copy.

### 3. Feature grid (3 columns, 2 rows)

Six small cards, each a single icon + 2-line headline + 1-line description. Tight, scannable.

1. **Spotlight & Dock native** — *"Cmd+Space → "Notion" → Enter. It's just there, like any app."*
2. **Session isolation** — *"Two Google accounts? Three Slack workspaces? Each app has its own cookies. No sign-out dance."*
3. **Real macOS chrome** — *"Traffic lights, native menu bar, keyboard shortcuts. No browser UI."*
4. **Auto icons** — *"Pulls the apple-touch-icon or PWA manifest. Looks the part out of the box."*
5. **Per-app cache & sign out** — *"Reset state for one app without touching the others."*
6. **Tags & favorites** — *"Group by Work / Personal / AI. Star the ones you use daily."*

### 4. How it works (3 numbered steps)

Just three illustrated steps. Each step: a small mockup of the relevant UI from the actual app + a one-line caption.

1. **Paste a URL.** Show the New App modal in its empty state.
2. **Urly grabs the title and icon.** Show the same modal mid-extraction with the spinner / found-icon checkmark.
3. **Launch from Spotlight.** Show the Spotlight bar with the new app as the top hit.

### 5. Architecture note (optional, small)

A single short paragraph, gray text, near the bottom. For the technically curious:

*"Urly is a hybrid of one shared Electron runtime and per-URL stub `.app` bundles. Each stub is ~33KB on disk thanks to APFS copy-on-write — so 50 apps cost the same as 1. Open source, MIT, personal use."*

### 6. Footer

- Repeat the download button (smaller).
- "Built by Daekyo Jeong" with a link.
- GitHub link.
- That's it. No newsletter, no socials, no cookie banner.

## Visual direction

- **Brand colors**:
  - Accent / primary: `#FF6B35` (the same orange used in the app)
  - Gradient version (for the icon): `#FF8C5A → #E84B1F`
  - Surface: warm off-white `#F5F2EC` for the page background; pure white `#FFFFFF` for cards
  - Text: `rgba(0,0,0,0.85)` primary, `rgba(0,0,0,0.56)` secondary, `rgba(0,0,0,0.36)` tertiary
- **Type**: `-apple-system, "SF Pro Display", "SF Pro Text"` — Apple system stack. Display weight for the hero, regular elsewhere. Tight tracking on big text.
- **Squircle**: when you draw the app icon anywhere, use a true iOS-style squircle (8-segment continuous-corner shape), not a rounded rectangle. The path is in the README if you want to match it pixel-for-pixel.
- **Tone**: Apple-product-page voice. Confident, sparse, present-tense. Avoid marketing exclamations. No "Amazing!" or "Revolutionary!". If a sentence could appear on apple.com without seeming out of place, it's right.
- **Density**: lots of whitespace, single column with generous max-width (~960px content). Don't pack the screen.
- **No animations beyond subtle hover states**. No scroll-triggered nonsense.

## Dark mode

Both light and dark, auto-respecting the system via `prefers-color-scheme`. No toggle button — the page just matches whatever the OS is set to. The audience (macOS power users) overwhelmingly runs dark, and a forced-bright page would feel jarring.

- **Dark surfaces**:
  - Page background: `#1A1A1C` (warm-leaning near-black, NOT pure `#000`)
  - Card / panel background: `#252527`
  - Borders / separators: `rgba(255,255,255,0.08)` hairline, `rgba(255,255,255,0.14)` stronger
- **Dark text**:
  - Primary: `rgba(255,255,255,0.92)`
  - Secondary: `rgba(255,255,255,0.60)`
  - Tertiary: `rgba(255,255,255,0.36)`
- **Accent stays `#FF6B35`** in dark mode — it sits well on near-black. Don't reach for a brighter tint.
- **The app's own UI mockups stay light in both modes.** Urly itself is a light-only app right now; rendering its windows in dark on the dark page would misrepresent the product. Treat the embedded app window the same way macOS treats a light-themed app: it sits as a light "panel" inside the dark page chrome, with a soft shadow to ground it. That visual contrast is actually a feature, not a bug.
- **The brand icon** — keep the orange gradient + white tiles in both modes. Drop the inner hairline border in dark mode (it disappears anyway).
- **The squircle outline** (`stroke="rgba(0,0,0,0.10)"` in light) should flip to `rgba(255,255,255,0.10)` in dark.

## Content the design tool should not invent

These are real and should appear verbatim:

- Product name: **Urly**
- Tagline options (pick one, or propose another in this register): *"Turn any URL into a macOS app." / "Any URL, a real app." / "Apps from URLs, the macOS way."*
- Version: **v0.1.0**
- Platform requirement: **Apple Silicon, macOS 12 or newer**
- GitHub: `https://github.com/Daekyo-Jeong/urly`
- License/use: free for personal use
- Download artifact: `Urly-0.1.0-arm64.dmg` (~112MB)

## What we're NOT doing

- No pricing section. It's free.
- No testimonials section. We don't have any.
- No comparison table (vs. WebUrly etc.). Stays positive.
- No email capture / newsletter.
- No "Made with Electron" / "Powered by" badges.
- No animation-heavy hero. No video. Static is fine — even preferred.

## Reference points for tone

- The macOS Sequoia features page on apple.com — restrained typography, generous whitespace, hero + feature grid + steps + footer.
- Linear's homepage circa 2023 — dense but quiet, plenty of room around each element.
- Raycast's landing — one strong hero CTA, before/after demo, feature grid, done.

Pick whichever of those resonates most and lean into it.
