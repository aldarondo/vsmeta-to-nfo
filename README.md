# vsmeta-to-nfo

Convert Synology Video Station `.vsmeta` metadata files into generic Kodi/Jellyfin compatible `.nfo` XML files.

Synology has officially deprecated Video Station with DSM 7.2.2. If you are migrating to Jellyfin, Kodi, Plex, or other generic ecosystems, this tool helps you translate your existing closed-format `.vsmeta` sidecar files into standard, openly parsable `movie.nfo` / `tvshow.nfo` / `episodedetails.nfo` files directly alongside your source media.

Looking to extract embedded posters and backdrops as well? Check out the sibling package [vsmeta-to-jpeg](https://github.com/aldarondo/vsmeta-to-jpeg).

This package provides both a **command-line tool** for batch conversion and a **programmatic interface** for integrating the conversion logic into scripts.

## Installation

```bash
# Global install for CLI use
npm install -g vsmeta-to-nfo

# Or install locally
npm install vsmeta-to-nfo
```

## CLI Usage

### Installed Package
You can point the CLI tool directly to a specific file or run it against a directory, where it will automatically scan for `.vsmeta` files recursively.

```bash
# Process a single file
vsmeta-to-nfo ./path/to/movie.mp4.vsmeta

# Recursively scan a directory and process all discovered .vsmeta files
vsmeta-to-nfo ./path/to/library
```

### Running Locally (From Source)
If you've cloned the repository and want to run the tool without installing it globally, you can execute it directly from the source code.

```bash
# Install dependencies first
npm install

# Option 1: Run directly using tsx
npx tsx src/cli.ts ./path/to/library --dry-run

# Option 2: Build and run the compiled output
npm run build
node dist/cli.js ./path/to/library
```

### Options

*   **`-d, --dry-run`**: Simulate the process without writing any actual `.nfo` files.
*   **`-f, --overwrite`**: By default, the script skips generation if an `.nfo` file already exists at the target location. This option overrides that safeguard.
*   **`-v, --verbose`**: Append a concise list of all skipped or failed files and errors at the end of the console execution run.

### Safety Checks

*   **Existing `.nfo` check:** Automatically skips if a matching `.nfo` exists (unless `--overwrite` is specified).
*   **Missing Media check:** The script checks the directory to ensure a matching media file (e.g., `movie.mp4`, `movie.mkv`) actually exists next to the `.vsmeta`. If it doesn't (indicating a leftover un-cleaned `.vsmeta` file), it skips `.nfo` creation.

## Programmatic API

You can safely import standard handlers if mapping `.vsmeta` programmatically.

```javascript
import { convertVsMetaToNfo } from 'vsmeta-to-nfo';

// Converts the sidecar and returns the resulting ConvertResult object containing status details.
// `status` can be 'SUCCESS', 'WARN', 'SKIP', or 'ERROR'.
const result = convertVsMetaToNfo('./libraries/movies/MyMovie (2020).mp4.vsmeta', {
  dryRun: false,
  overwrite: true,
});

if (result.status === 'SUCCESS') {
    console.log(`Generated: ${result.nfoPath}`);
} else {
    console.log(`Failed/Skipped: ${result.message}`);
}
```

## License

MIT License
