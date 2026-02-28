# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-28
### Added
- Initial release.
- Script and programmatic interface to convert `.vsmeta` to standard Kodi/Jellyfin-compatible `.nfo` files.
- Command line utility (`vsmeta-to-nfo`) for targeted/recursive directory scanning.
- Detection logic to skip standalone leftover `.vsmeta` files lacking an equivalent media source.
- Safeguards to avoid overwriting existing `.nfo` files unless explicitly flagged with `--overwrite`.
