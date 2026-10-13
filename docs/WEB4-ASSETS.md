# Web 4.0 asset register

All new marketing assets are local: no external image URLs or tracking pixels.

| Asset | Origin / rights basis | Usage |
| --- | --- | --- |
| `public/vector/hero.webp` | Aircraft/mountain artwork supplied by the project owner in this task (`codex-clipboard-b7b09293…png`). Owner requested reuse. | Cinematic illustration, never presented as a simulator screenshot. |
| `public/vector/overview.webp`, `dispatch.webp`, `cabin.webp`, `monitor.webp`, `operations.webp`, `copilot.webp`, `journal.webp` | Existing Project Vector WPF validation captures in the owner's local repository. | Real beta captures; example flight data is not live website telemetry. |
| `public/vector/king-air-cabin.webp` | Cabin illustration supplied by the project owner (`codex-clipboard-c58381ea…png`). | Aircraft layout illustration, not certified seat occupancy. |
| `public/vector/icons/*.webp` | Existing owner-supplied Project Vector icon pack. | Product module presentation. |
| Inline mountain, compass, aircraft and route SVGs | Original geometry written for Web 4.0. | Branding / explanatory navigation graphics. |
| Existing `public/branding/*` | Previously tracked Patagonia Wings brand resources. | Existing airline identity. |

WebP derivatives are resized/compressed from originals, which remain untouched. Real captures and illustration labels remain visible in the UI. Owner-supplied artwork provenance is recorded; no additional third-party image licenses are claimed. Google fonts Inter and Rajdhani retain the repository's existing Next.js font integration.

Visual review corrected two misleading legacy capture filenames: dispatch now
uses `m23-3-app-real-despacho.png` (with visible OSM attribution); monitor uses
`ofp-times/live/beta-Copilot.png`, whose actual content is the instrument monitor.
Copilot uses `m24-copiloto.png`. Copilot and operations show real WPF interfaces
with synthetic test inputs and are explicitly labelled as test fixtures in the
interactive gallery. They are not evidence of a live flight or universal support.
