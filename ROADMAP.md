# vsmeta-to-nfo — Roadmap

## Current Milestone
✅ Production-ready — CLI and library complete

### 🔨 In Progress
[Empty]

### 🟢 Ready (Next Up)
[Empty — tool is complete; update only if new content types or .nfo schema changes are needed]

### 📋 Backlog
- Test against a large real-world DS Video library to find any edge cases
- Add support for multi-episode files (e.g., S01E01E02 combined episodes)
- Consider publishing as npm package for broader DS Video migration community

### 🔴 Blocked
[Empty]

## ✅ Completed
- CLI tool: scan directory, convert all .vsmeta → .nfo
- Content type auto-detection: movie.nfo, tvshow.nfo, episodedetails.nfo
- vsmeta-parser integration for binary reading
- nfo-create integration for XML generation
- Safety checks: existing .nfo detection, missing media file warnings
- Dry-run mode
- Verbose logging
- Programmatic API for use as a library
- Full vitest test coverage
- Changesets versioning
