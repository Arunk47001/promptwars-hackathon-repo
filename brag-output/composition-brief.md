# Hyperframes Composition Brief: BRICS Citizen Infrastructure Platform

## Objective
Create a short launch-style brag video for the BRICS Citizen Infrastructure Platform — a civic-tech pipeline that turns citizen SMS/voice/WhatsApp complaints into a ranked, explainable, anonymized "demand hotspot" map for policymakers.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21 seconds

## Source Material
- Project root: `C:\Users\akmr4\OneDrive\Desktop\cloned_repo\promptwars-hackathon-repo`
- Primary files read: `README.md`, `package.json`, `app/page.tsx`, `app/globals.css`, `lib/theme.ts`, `components/dashboard/Sidebar.tsx`, `components/dashboard/screens/OverviewScreen.tsx`, `components/dashboard/screens/DataSourcesScreen.tsx`, `components/dashboard/HotspotDrawer.tsx`
- Product name: BRICS Citizen Infrastructure Platform (sidebar wordmark: "Citizen Infrastructure" / "BRICS Platform"; "CI" mark)
- Tagline / strongest claim: a citizen's SMS complaint becomes a ranked, cited, privacy-safe policy signal — real census/infrastructure/investment data fused underneath, not a black box
- Key UI or visual moment to recreate: the district severity grid (many small cells on a single-hue blue ramp, light = low demand, dark = high demand), the dark sidebar shell, the hotspot drawer with a typed-out AI rationale, and the anonymization Before/After toggle
- Copy that must appear verbatim:
  - "Hand pump broken 2 weeks. No drinking water. — Chikkaballapur." (hook message)
  - "BRICS Citizen Infrastructure Platform" (title/wordmark)
  - "A complaint becomes a citable policy decision. Anonymized the whole way." (closing line)

## Creative Direction
- Tone preset: polished
- Creative direction: quiet, confident civic-data product film — a serious infrastructure tool, not a joke, but visually alive (data populating in front of you, not static screenshots)
- Interpretation: fewer, longer-held scenes; restrained motion (slides/crossfades only — no whip-pans, no flashes, no hard chaotic cuts); typography and real data do the persuading; SFX minimal and precise, tied to real UI actions (typing, drawer slide, toggle flip)
- Angle: This isn't a startup pitch — it's a working policy-ops tool that takes itself as seriously as the real thing would. The video should feel like an internal product demo a government data team would actually watch: a raw citizen complaint goes in one end, and a ranked, cited, privacy-respecting policy signal comes out the other. The "wow" is the pipeline itself — text message to explainable policy map in one continuous motion.
- Hook: a plain message bubble typing itself out on the cream background — no chrome, no logo — a raw incoming SMS complaint.
- Outro / punchline: the "CI" mark and wordmark settle center frame under "A complaint becomes a citable policy decision. Anonymized the whole way."
- Avoid:
  - Generic SaaS language ("streamline," "empower," "unlock")
  - Abstract filler visuals (particle systems, generic gradients, stock-photo-style scenes)
  - Unrelated visual redesign — use the project's real palette/tokens from `lib/theme.ts`, not an invented brand system
  - Turning this into a joke or parody tone — it is a civic data tool, treat it with respect

## Visual Identity
- Background: `#f6f5f2` (page canvas), `#ffffff` (cards/surfaces)
- Sidebar (dark shell): `#1c2024`, sidebar text `#b9bec4`, sidebar active state `#2e343a`
- Accent: `#1e5aa8` (hover `#164374`, soft fill `#eaf1f9`)
- Text: `#1a1c1e` (ink/primary), `#6d7076` (muted)
- Severity ramp (light → dark, single-hue blue, colorblind-safe — use exactly this 6-step ramp for the district grid): `#f0f4f9`, `#cddde9`, `#9dbed6`, `#6497bf`, `#3a6f9e`, `#1b4a78`
- Severity badges: danger `#a62b1f` on `#fbeae8`, warn `#8a5600` on `#fbf2e2`, success `#0f5d56` on `#e9f2f0`
- Display font: IBM Plex Sans, 600 weight for headings/wordmark (fall back to a close system sans if the exact font isn't available in the renderer)
- Body font: IBM Plex Sans, 400/500 weight
- Numeric/mono font: IBM Plex Mono for scores, KPI values, timestamps — this is a real detail from the product (`lib/theme.ts` `fonts.mono`) and should appear on the KPI numbers and severity scores
- Visual references from the project: dark left sidebar with small square "CI" badge + two-line wordmark; KPI cards as white bordered rounded rectangles with a small muted label, large mono number, and small sub-label; district grid as a dense array of small rounded-rect cells colored by the severity ramp; right-side slide-over drawer with a scrim backdrop; a two-state (Before/After) toggle panel with monospace-styled "record" content

## Storyboard
Use the full storyboard in `brag-output/brag-plan.md` as the creative contract — durations, copy, and sequencing below are the summary.

Scene summary:
1. Hook: the complaint — 3.5s — message bubble "Hand pump broken 2 weeks. No drinking water. — Chikkaballapur." types out on cream background, no UI chrome.
2. Reveal: the dashboard shell — 3.5s — bubble settles top-left as the dark sidebar + KPI cards crossfade in; wordmark title card briefly overlays.
3. Highlight: the district grid lights up — 4.5s — severity grid cells populate in 3-4 waves on the blue ramp; "Top hotspots" list ticks in beside it.
4. Highlight: the drawer explains itself — 5s — hotspot drawer slides in from the right; AI rationale types out citing concrete figures (request count, connectivity note, composite score).
5. Highlight: anonymized, provably — 4s — Before/After toggle flips from a raw-looking record (masked phone pattern, unredacted text, precise coordinates) to the clean anonymized record (salted hash, scrubbed text, district-only location).
6. Outro: the line — 2.5s — cream background returns; "CI" mark + wordmark settle center frame under the closing line; hold.

## Audio
- Audio role: sparse professional accents over a steady, restrained music bed
- Audio arc: bed fades in under the hook at low volume (~0.25), holds flat through the middle scenes, small presence lift into the outro, fades out under the final held line
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (already copied to `brag-output/composition/assets/music/`)
- Music treatment: fade in 0-0.5s, hold ~0.25 volume through scenes 1-4, small lift (~0.3) into scenes 5-6, fade out over the back half of scene 6
- Music cue guidance: bundled preset at `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (also `.md`). ~110 BPM, 117s track. Strong cues in the 0-21s window: 8.74s, 9.29s, 10.93s, 13.11s, 17.47s, 18.56s. Suggested locks (optional, ±0.15s): drawer/rationale entrance (Scene 4) near 8.74-9.29s if the scene 3→4 transition lands there once timed; anonymization toggle flip (Scene 5) near 17.47s or 18.56s. Do not force a third lock — grid population and the outro should use natural timing.
- Audio-reactive treatment: subtle — district grid cell glow and dashboard card shadow presence may breathe very slightly with music RMS; no waveform/equalizer visuals, no pulsing text, no strobing.
- Audio-coupled moments:
  - Scene 1 (hook typing) — soft randomized keyboard ticks per character, thinning near the end, from `assets/sfx/keyboard/keypress-*.wav`.
  - Scene 2 (first KPI card only) — one soft arrival/drop sound, not all four cards.
  - Scene 3 (grid main wave + first Top Hotspot row) — light accent only on the strongest wave, not every cell.
  - Scene 4 (drawer slide-in) — one soft slide sound on entrance; a thinner, quieter key-tick bed under the rationale typing than Scene 1's.
  - Scene 5 (toggle flip) — one clean switch/toggle sound exactly at the flip.
  - Scene 6 (wordmark settle) — one restrained bell/accent as it settles, then let it ring out under the final line.
- SFX selection guidance: keep every cue quiet and precise (polished tone = 2-3 total main cues plus the typing textures); match the visible gesture (typing → keypress, slide → drop/slide, toggle → switch, reveal → soft bell); never stack more than one cue at a time.
- SFX analysis guidance: read `<skill-dir>/assets/sfx/sfx-analysis.md` before final selection; prefer low/medium high-frequency-risk files since this is a polished, repeated-viewing style video.
- Exact SFX choice: Hyperframes should choose exact filenames, timestamps, density, and volume based on the implemented animation timing.
- Audio files: music already copied to `brag-output/composition/assets/music/`; copy any selected SFX into `brag-output/composition/assets/sfx/...` before referencing them.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). `/brag` is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the district severity grid, the dark sidebar shell, the hotspot drawer, and the anonymization toggle are all required — this product has no marketing landing page worth recreating, the working app IS the material).
- Keep all text readable in the final render — the hook message, the rationale line, and the closing line are the three text passages a viewer must actually read; give each its planned hold.
- Keep the video within 15-25 seconds (target 21s per the plan).
- Include the planned music/SFX layer — audio was not disabled.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks total.
- Use SFX to support motion and interaction: card/drop sounds for the KPI and grid reveals, a slide sound for the drawer, a switch sound for the toggle, key-tick textures for the two typing moments, restraint everywhere else.
- Honor the planned music treatment (fade-in under the hook, flat hold, small lift into the outro, fade-out under the final line).
- Wire at least one visual element to audio-reactive RMS/frequency data per the `hyperframes-creative` audio-reactive workflow (subtle card-shadow/glow presence only) — if extraction is unavailable (no helper or ffmpeg missing), note that in the delivery report and skip it rather than blocking the render.
- Use local assets for audio; the music file is already staged at `brag-output/composition/assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`.
- Run `hyperframes check` before render — it is brag's single gate.
