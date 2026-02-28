import fs from 'fs';
import path from 'path';
import { parseVsMeta, VsMetaData } from 'vsmeta-parser';
import { generateMovieNfo, generateEpisodeNfo, generateShowNfo, MovieData, EpisodeData, ShowData } from 'nfo-create';

import { ConvertOptions, ConvertResult } from './types.js';

// Common video extensions checked when verifying a matching media file exists.
const MEDIA_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.m2ts', '.ts', '.mpg', '.mpeg']);

// Per-directory cache for readdirSync results — avoids redundant I/O when
// multiple .vsmeta files share the same folder during a batch conversion.
const readdirCache = new Map<string, string[]>();

/** Clear the internal directory listing cache. Call after a batch run completes. */
export function clearReaddirCache(): void {
    readdirCache.clear();
}

function extractYear(releaseDate?: string): number | undefined {
    if (!releaseDate) return undefined;
    const m = releaseDate.match(/(\d{4})/);
    return m ? parseInt(m[1], 10) : undefined;
}

export function hasMatchingMediaFile(vsmetaPath: string): boolean {
    const dir = path.dirname(vsmetaPath);
    const basename = path.basename(vsmetaPath, '.vsmeta');

    // If the .vsmeta name is e.g., 'movie.mp4.vsmeta', basename is 'movie.mp4'.
    // Check if that exact file exists.
    if (fs.existsSync(path.join(dir, basename))) {
        return true;
    }

    // Otherwise, the vsmeta might be 'movie.vsmeta', check for 'movie.*' media files.
    // Use a cached directory listing to avoid redundant readdirSync calls.
    let files = readdirCache.get(dir);
    if (!files) {
        files = fs.readdirSync(dir) as string[];
        readdirCache.set(dir, files);
    }

    for (const file of files) {
        if (file.startsWith(basename) && file !== path.basename(vsmetaPath)) {
            const ext = path.extname(file).toLowerCase();
            if (MEDIA_EXTENSIONS.has(ext)) {
                return true;
            }
        }
    }

    return false;
}


export function convertVsMetaToNfo(vsmetaPath: string, options: ConvertOptions = {}): ConvertResult {
    try {
        const nfoPath = vsmetaPath.replace(/\.vsmeta$/i, '.nfo');

        if (fs.existsSync(nfoPath) && !options.overwrite) {
            return { status: 'SKIP', message: `NFO already exists (use --overwrite to replace): ${nfoPath}` };
        }

        if (!hasMatchingMediaFile(vsmetaPath)) {
            return { status: 'SKIP', message: `No matching media file found for: ${vsmetaPath}` };
        }

        const buffer = fs.readFileSync(vsmetaPath);
        let meta: VsMetaData;
        try {
            // skipImages: true — NFO generation never uses embedded poster/backdrop
            // images. Skipping JPEG decoding saves ~700KB RAM and significant CPU
            // per file, especially noticeable in large library batch conversions.
            meta = parseVsMeta(buffer, { skipImages: true });
        } catch (e) {
            return { status: 'WARN', message: `Failed to parse ${vsmetaPath}: ${(e as Error).message}` };
        }

        let xml = '';

        if (meta.contentType === 2 || (meta.season != null || meta.episode != null)) {
            if (meta.season != null && meta.episode != null) {
                // Episode
                const input: EpisodeData = {
                    title: meta.title || '',
                    showTitle: meta.originalTitle || meta.title || '',
                    season: meta.season,
                    episode: meta.episode,
                    plot: meta.plot,
                    rating: meta.rating,
                    contentRating: meta.contentRating,
                    releaseDate: meta.releaseDate,
                    imdbId: meta.imdbId,
                    tmdbId: meta.tmdbId,
                    directors: meta.directors,
                    writers: meta.writers,
                    actors: meta.actors,
                };
                xml = generateEpisodeNfo(input);
            } else {
                // Show
                const input: ShowData = {
                    title: meta.title || '',
                    originalTitle: meta.originalTitle,
                    year: meta.year || extractYear(meta.releaseDate),
                    plot: meta.plot,
                    rating: meta.rating,
                    contentRating: meta.contentRating,
                    releaseDate: meta.releaseDate,
                    imdbId: meta.imdbId,
                    tmdbId: meta.tmdbId,
                    genres: meta.genres,
                    directors: meta.directors,
                    writers: meta.writers,
                    actors: meta.actors,
                };
                xml = generateShowNfo(input);
            }
        } else {
            // Movie
            const input: MovieData = {
                title: meta.title || '',
                originalTitle: meta.originalTitle,
                year: meta.year || extractYear(meta.releaseDate),
                tagline: meta.episodeTitle,
                plot: meta.plot,
                rating: meta.rating,
                contentRating: meta.contentRating,
                releaseDate: meta.releaseDate,
                imdbId: meta.imdbId,
                tmdbId: meta.tmdbId,
                genres: meta.genres,
                directors: meta.directors,
                writers: meta.writers,
                actors: meta.actors,
            };
            // fallback to episodeTitle as tagline
            xml = generateMovieNfo(input);
        }

        if (!options.dryRun) {
            try {
                fs.writeFileSync(nfoPath, xml, 'utf8');
                return { status: 'SUCCESS', nfoPath, message: `Wrote ${nfoPath}` };
            } catch (writeErr) {
                const e = writeErr as Error & { code?: string };
                let msg = '';
                if (e.code === 'EACCES' || e.code === 'EPERM') {
                    msg = `Permission denied: Cannot write to folder. Please check permissions for ${path.dirname(nfoPath)}`;
                } else if (e.code === 'ENOENT') {
                    msg = `Folder does not exist: Cannot write to ${nfoPath}`;
                } else {
                    msg = `Failed to write ${nfoPath}: ${e.message}`;
                }
                return { status: 'ERROR', message: msg };
            }
        } else {
            return { status: 'SUCCESS', nfoPath, message: `[DRY RUN] Would write ${nfoPath}` };
        }
    } catch (err) {
        const e = err as Error & { code?: string };
        let msg = '';
        if (e.code === 'EACCES' || e.code === 'EPERM') {
            msg = `Permission denied: Cannot read file. Please check permissions for ${vsmetaPath}`;
        } else {
            msg = `Processing ${vsmetaPath}: ${e.message || err}`;
        }
        return { status: 'ERROR', message: msg };
    }
}
