# vsmeta-to-nfo

## What This Project Is
CLI tool + programmatic library to convert Synology DS Video .vsmeta sidecar files into standard Kodi/Jellyfin .nfo XML metadata. Generates movie.nfo, tvshow.nfo, or episodedetails.nfo depending on content type. Part of the DS Video → Jellyfin migration toolkit. Includes safety checks, dry-run mode, and verbose logging.

## Tech Stack
- Node.js / TypeScript
- vsmeta-parser (sibling library — reads .vsmeta binary)
- nfo-create (sibling library — generates .nfo XML strings)
- vitest (testing)
- ESLint
- Changesets (versioning)

## Key Decisions
- Depends on both vsmeta-parser and nfo-create — do not duplicate their logic
- Safety checks: warns before overwriting existing .nfo files; missing media file detection
- Content type auto-detection (movie vs TV episode vs show) from vsmeta-parser output
- Dry-run mode is safe by default

## Session Startup Checklist
1. Read ROADMAP.md to find the current active task
2. Check MEMORY.md if it exists — it contains auto-saved learnings from prior sessions
3. Run `npm install` if node_modules are stale
4. Run `npm test` to verify all tests pass before making changes
5. Do not make architectural changes without confirming with Charles first

## Key Files
- `src/` — CLI and library source
- `test/` — vitest tests
- `CHANGELOG.md` — version history

---
@~/Documents/GitHub/CLAUDE.md
