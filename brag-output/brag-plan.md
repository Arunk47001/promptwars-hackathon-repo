# Brag Plan: BRICS Citizen Infrastructure Platform

## What is this app?
A civic-tech pipeline that takes citizen infrastructure complaints over SMS/voice/WhatsApp, anonymizes them, fuses them with real Indian census/health/roads data, and turns them into a ranked, explainable "demand hotspot" map with AI-written rationale for policymakers.

## The angle
This isn't a startup pitch — it's a working policy-ops tool built for a hackathon that takes itself as seriously as the real thing would. The video should feel like an internal product demo a government data team would actually watch: a raw citizen complaint goes in one end, and a ranked, cited, privacy-respecting policy signal comes out the other. The "wow" isn't a joke, it's the pipeline itself — text message to explainable policy map in one continuous motion.

## Hook (first 2-3 seconds)
A phone-style message bubble types itself out mid-frame on the cream background: "Hand pump broken 2 weeks. No drinking water. — Chikkaballapur." Plain, human, unpolished — the opposite of a dashboard. This is the raw material the rest of the video refines.

## Key moments (the middle)
- The district severity grid populating — dozens of small colored cells filling in one by one on the single-hue blue ramp (light → dark = low → high demand), with a "Top hotspots" list ticking in beside it.
- The hotspot drawer sliding in from the right and an AI rationale typing itself out, citing real figures (submission count, composite score, category) — the pipeline explaining its own ranking.
- The anonymization panel's Before/After toggle flipping: a raw record with a phone number and exact free text flips to a clean record — salted hash, scrubbed text, district-only location.

## Outro / punchline
The dark sidebar's small "CI" mark settles center-frame with the full wordmark and one closing line: a complaint becomes a citable policy decision — anonymized the whole way.

## User flow worth showing
1. Entry: a citizen's SMS complaint arrives (the hook).
2. Key action: the pipeline fuses it with real district data and ranks it — visualized as the district grid lighting up and the hotspot drawer generating a rationale.
3. Result: a policymaker sees a ranked, explainable, privacy-safe hotspot — closed with the anonymization before/after proof.

## Tone
- Preset: polished
- Creative direction: quiet, confident civic-data product film — a serious infrastructure tool, not a joke, but still visually alive (data populating, not static screenshots).
- Interpretation: fewer, longer-held scenes; restrained motion (slides/crossfades, no whip-pans or flashes); typography does the work instead of jokes; SFX minimal and precise, matched to real UI actions (toggle, drawer, type).

## Format: landscape — 1920x1080
## Duration: 21s

## Visual identity (from the project)
- Background: `#f6f5f2` (page), `#ffffff` (cards/surfaces)
- Sidebar (dark shell): `#1c2024`
- Accent: `#1e5aa8` (accentHover `#164374`, accentSoft `#eaf1f9`)
- Text: `#1a1c1e` (ink), `#6d7076` (muted)
- Severity ramp (light → dark, single-hue blue, colorblind-safe): `#f0f4f9 → #cddde9 → #9dbed6 → #6497bf → #3a6f9e → #1b4a78`
- Display font: IBM Plex Sans (600 weight for headings)
- Body font: IBM Plex Sans (400/500)
- Numeric/mono font: IBM Plex Mono (used for scores, KPI values, timestamps in the real UI)
- Strongest visual element: the district severity grid (many small cells on the blue ramp) paired with the dark sidebar shell — instantly reads as "real policy tool," not a marketing mockup. The anonymization before/after toggle is the second-strongest — concrete proof of a privacy claim rather than a stated one.

## Share copy (draft)
A citizen's text about a broken hand pump becomes a ranked, cited policy signal — anonymized and fused with real Indian census data, not vibes.

## Audio direction
- Role: sparse professional accents over a steady, restrained music bed
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` ("steady and clean," matches `polished`)
- Music treatment: start at 0 under the hook at low volume (~0.25), hold steady through the middle, small volume lift into the outro, short fade-out after the final line settles
- Music cue guidance: bundled preset read (117s track, ~110 BPM). Strong cues in the 0-21s window: 8.74s, 9.29s, 10.93s, 13.11s, 17.47s, 18.56s. Target the drawer/rationale entrance near 8.74-9.29s and the anonymization toggle-flip near 17.47-18.56s as the two locked reveals; leave the grid population and outro on their own natural timing rather than forcing a third lock.
- Audio-reactive treatment: subtle — let the district grid's cell glow and the dashboard card shadows breathe very slightly with RMS; no waveform/equalizer visuals, no pulsing text.
- SFX posture: minimal but present (2-3 cues total), quiet and precise, never stacked.
- Audio-coupled moments: the SMS bubble typing in (keyboard ticks, very soft), the drawer sliding open (soft slide/drop), the anonymization toggle flip (a single clean switch sound).
- Restraint rule: no comedic, chaotic, or "notification spam" sounds; nothing plays over the rationale typing except a very quiet key-tick bed — the read matters more than the sound.

## Storyboard

### Scene 1 — Hook: the complaint — 3.5s
Cream background (`#f6f5f2`), centered message bubble on white with a soft border. Text types itself out character by character: "Hand pump broken 2 weeks. No drinking water. — Chikkaballapur." No chrome, no logo yet — this reads as a raw incoming text, not UI.
Sequential/interaction: yes — the message types out character by character, cursor blinking at the end for a beat after it finishes.
Audio intent: intimate, slightly tense — this is a real problem, not a feature.
Audio-coupled idea: soft randomized keyboard ticks per character, thinning near the end.
Music: bed fades in under this scene at low volume.
Transition mood: soft crossfade → Scene 2.

### Scene 2 — Reveal: the dashboard shell — 3.5s
The message bubble shrinks and settles into the top-left of frame as the dashboard shell crossfades in behind it: dark sidebar (`#1c2024`) with the "CI" mark and "Citizen Infrastructure / BRICS Platform" label, KPI cards on the cream canvas showing mono-font numbers (e.g. "Active hotspots," "Districts covered"). Wordmark "BRICS Citizen Infrastructure Platform" appears as a brief title card over the top-left.
Sequential/interaction: yes — the 4 KPI cards arrive left to right, ~0.15s apart, each settling before the next starts.
Audio intent: a small confident "arrival" — the message has landed somewhere real.
Audio-coupled idea: one soft drop/arrival sound on the first KPI card only, not all four.
Music: bed holds steady.
Transition mood: clean slide → Scene 3.

### Scene 3 — Highlight: the district grid lights up — 4.5s
Cut to the "Composite demand score by district" panel: a grid of small district cells fills in one by one on the single-hue blue ramp (light `#f0f4f9` → dark `#1b4a78`), fastest in the middle of the scene so it reads as data arriving, not a static image. Beside it, a short "Top hotspots" list ticks in with two or three district names and severity pills (e.g. "High severity").
Sequential/interaction: yes — grid cells populate in a quick wave (not literally one-by-one for all ~30 cells; group into 3-4 waves), Top Hotspots rows arrive just after the grid settles.
Audio intent: data coming alive — busy but orderly, not chaotic.
Audio-coupled idea: aim the grid's main wave and the first Top Hotspot row near the 8.74s/9.29s strong cues.
Music: bed continues, slight presence lift as the grid fills.
Transition mood: soft crossfade → Scene 4.

### Scene 4 — Highlight: the drawer explains itself — 5s
The hotspot drawer slides in from the right over a dimmed backdrop, showing the district name, severity badge, and a "Generate policymaker rationale" moment: a short line of AI-written rationale types itself out, citing real-feeling figures ("42 requests in 18 days · below-median road connectivity · composite score 8.7"). This is the pipeline showing its own reasoning, not just a number.
Sequential/interaction: yes — drawer slide-in, then rationale text types out line by line after a brief pause.
Audio intent: a considered, trustworthy explanation arriving — calm, not flashy.
Audio-coupled idea: one soft slide sound on drawer entrance; quiet key-tick bed under the rationale typing, thinner than Scene 1's.
Music: steady; this is the emotional center of the video, so no volume swells that compete with the reading.
Transition mood: soft crossfade → Scene 5.

### Scene 5 — Highlight: anonymized, provably — 4s
Cut to the "Anonymization in effect" panel. A single toggle flips: BEFORE shows a raw-looking record (a masked-pattern phone number, unredacted free text, precise coordinates); AFTER shows the clean record (salted hash, PII-scrubbed text, district-only location). The flip itself is the moment — before and after should each get a clean, readable beat, not just a blur transition.
Sequential/interaction: yes — simulate a cursor click on the "Show AFTER" toggle; the panel content swaps with a quick crossfade, not a violent cut.
Audio intent: a small, definitive "proof" click — quiet confidence.
Audio-coupled idea: one clean switch/toggle sound exactly at the flip, targeting the 17.47s/18.56s strong cues.
Music: begins its small lift toward the outro here.
Transition mood: soft crossfade → Scene 6.

### Scene 6 — Outro: the line — 2.5s
Cream background returns. The "CI" mark and full wordmark settle center frame. Closing line beneath it: "A complaint becomes a citable policy decision. Anonymized the whole way." Hold on this for the full scene.
Sequential/interaction: none — one clean settle, then hold.
Audio intent: quiet landing, not a fanfare.
Audio-coupled idea: one restrained bell/accent right as the wordmark settles, then let it ring out under the final line.
Music: fades out over the back half of this scene.
Transition mood: hard cut to black/end.

**Music mood for this video:** polished / steady, business-clean instrumental, no vocals.
**Audio summary:** A low, steady music bed carries the whole video with almost no dynamic swings; the only audio events that call attention to themselves are the two locked reveals (the rationale drawer opening, the anonymization toggle flip) plus the soft typing textures in scenes 1 and 4 — everything else stays out of the way of the on-screen data.
