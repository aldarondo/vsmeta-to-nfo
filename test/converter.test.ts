import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertVsMetaToNfo, clearReaddirCache } from '../src/converter.js';
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import * as vsmetaParser from 'vsmeta-parser';
import * as nfoCreate from 'nfo-create';

vi.mock('node:fs');
vi.mock('vsmeta-parser');
vi.mock('nfo-create');

describe('convertVsMetaToNfo', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        clearReaddirCache();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        vi.mocked(fs.existsSync).mockImplementation((pathStr: unknown) => {
            const str = String(pathStr);
            if (str.endsWith('.nfo')) return false;
            if (str.includes('test')) return true;
            return false;
        });
        vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as fs.Dirent[]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return null and warn if vsmeta parsing fails', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('bad data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockImplementation(() => { throw new Error('parse error'); });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Failed to parse test.vsmeta: parse error');
    });

    it('should return null and error if file reading fails', () => {
        const readErr = new Error('read error') as Error & { code: string };
        readErr.code = 'EACCES';
        vi.mocked(fs.readFileSync).mockImplementation(() => { throw readErr; });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Permission denied: Cannot read file. Please check permissions for test.vsmeta');
    });

    it('should return null and EPERM error if file reading fails randomly', () => {
        const readErr = new Error('read error') as Error & { code: string };
        readErr.code = 'EPERM';
        vi.mocked(fs.readFileSync).mockImplementation(() => { throw readErr; });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Permission denied: Cannot read file. Please check permissions for test.vsmeta');
    });

    it('should return null and generic error if file reading fails randomly', () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('random error'); });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Processing test.vsmeta: random error');
    });

    it('should handle thrown primitives without a message property', () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => { throw 'string error'; });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Processing test.vsmeta: string error');
    });

    it('should skip generating if NFO exists and overwrite is false', () => {
        vi.mocked(fs.existsSync).mockImplementation((pathStr: unknown) => {
            if (String(pathStr).endsWith('.nfo')) return true;
            return false;
        });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('NFO already exists');
    });

    it('should skip generating if media file is missing', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('No matching media file found');
    });

    it('should use cached directory listing on subsequent calls for same directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as fs.Dirent[]);

        // First call populates the cache, second call should reuse it
        convertVsMetaToNfo('dir/a.vsmeta');
        convertVsMetaToNfo('dir/b.vsmeta');

        // readdirSync should only be called once for the 'dir' directory
        expect(fs.readdirSync).toHaveBeenCalledTimes(1);
    });

    it('should generate an episode nfo if season and episode are present', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 2,
            title: 'Episode 1',
            originalTitle: 'Show Title',
            season: 1,
            episode: 1,
            plot: 'Plot',
            rating: 8,
            contentRating: 'TV-14',
            releaseDate: '2023-01-01',
            imdbId: 'tt123',
            tmdbId: '456',
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateEpisodeNfo).mockReturnValue('<episodedetails></episodedetails>');

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).toBe('SUCCESS');
        expect(result?.nfoPath).toBe('test.nfo');
        expect(nfoCreate.generateEpisodeNfo).toHaveBeenCalledWith({
            title: 'Episode 1',
            showTitle: 'Show Title',
            season: 1,
            episode: 1,
            plot: 'Plot',
            rating: 8,
            contentRating: 'TV-14',
            releaseDate: '2023-01-01',
            imdbId: 'tt123',
            tmdbId: '456',
            directors: [],
            writers: [],
            actors: []
        });
        expect(fs.writeFileSync).toHaveBeenCalledWith('test.nfo', '<episodedetails></episodedetails>', 'utf8');
        expect(result?.message).toContain('Wrote test.nfo');
    });

    it('should generate a show nfo if contentType is 2 but no season/episode', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 2,
            title: 'Show Title',
            originalTitle: 'Original Show Title',
            year: 2023,
            plot: 'Plot',
            rating: 8,
            contentRating: 'TV-14',
            releaseDate: '2023-01-01',
            imdbId: 'tt123',
            tmdbId: '456',
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateShowNfo).mockReturnValue('<tvshow></tvshow>');

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).toBe('SUCCESS');
        expect(result?.nfoPath).toBe('test.nfo');
        expect(nfoCreate.generateShowNfo).toHaveBeenCalledWith({
            title: 'Show Title',
            originalTitle: 'Original Show Title',
            year: 2023,
            plot: 'Plot',
            rating: 8,
            contentRating: 'TV-14',
            releaseDate: '2023-01-01',
            imdbId: 'tt123',
            tmdbId: '456',
            genres: [],
            directors: [],
            writers: [],
            actors: []
        });
    });

    it('should generate a movie nfo if contentType is 1 and no season/episode', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            title: 'Movie Title',
            originalTitle: 'Original Movie Title',
            releaseDate: '2024-01-01', // testing extractYear
            episodeTitle: 'A Tagline',
            plot: 'Movie Plot',
            rating: 7,
            contentRating: 'R',
            imdbId: 'tt999',
            tmdbId: '888',
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        const result = convertVsMetaToNfo('test.vsmeta', { dryRun: true });

        expect(result?.status).toBe('SUCCESS');
        expect(result?.nfoPath).toBe('test.nfo');
        expect(nfoCreate.generateMovieNfo).toHaveBeenCalledWith({
            title: 'Movie Title',
            originalTitle: 'Original Movie Title',
            year: 2024,
            tagline: 'A Tagline',
            plot: 'Movie Plot',
            rating: 7,
            contentRating: 'R',
            releaseDate: '2024-01-01',
            imdbId: 'tt999',
            tmdbId: '888',
            genres: [],
            directors: [],
            writers: [],
            actors: []
        });
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(result?.message).toContain('[DRY RUN] Would write test.nfo');
    });

    it('should handle undefined releaseDate correctly for year extraction', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            title: 'Movie Title',
            originalTitle: 'Original Movie Title',
            releaseDate: undefined,
            episodeTitle: 'A Tagline',
            plot: 'Movie Plot',
            rating: 7,
            contentRating: 'R',
            imdbId: 'tt999',
            tmdbId: '888',
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        const result = convertVsMetaToNfo('test.vsmeta', { dryRun: true });

        expect(result?.status).toBe('SUCCESS');
        expect(result?.nfoPath).toBe('test.nfo');
        expect(nfoCreate.generateMovieNfo).toHaveBeenCalledWith({
            title: 'Movie Title',
            originalTitle: 'Original Movie Title',
            year: undefined,
            tagline: 'A Tagline',
            plot: 'Movie Plot',
            rating: 7,
            contentRating: 'R',
            releaseDate: undefined,
            imdbId: 'tt999',
            tmdbId: '888',
            genres: [],
            directors: [],
            writers: [],
            actors: []
        });
    });

    it('should handle releaseDate without 4 digits correctly', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            title: 'Movie Title',
            releaseDate: '01-01', // no year
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        convertVsMetaToNfo('test.vsmeta', { dryRun: true });

        expect(nfoCreate.generateMovieNfo).toHaveBeenCalledWith(expect.objectContaining({
            year: undefined
        }));
    });

    it('should fallback to empty string when all optional titles are missing in Episode', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 2,
            season: 1,
            episode: 1,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateEpisodeNfo).mockReturnValue('');

        convertVsMetaToNfo('test.vsmeta');

        expect(nfoCreate.generateEpisodeNfo).toHaveBeenCalledWith(expect.objectContaining({
            title: '',
            showTitle: ''
        }));
    });

    it('should fallback to empty string when title is missing in Show', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 2,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateShowNfo).mockReturnValue('');

        convertVsMetaToNfo('test.vsmeta');

        expect(nfoCreate.generateShowNfo).toHaveBeenCalledWith(expect.objectContaining({
            title: ''
        }));
    });

    it('should fallback to empty string when title is missing in Movie', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('');

        convertVsMetaToNfo('test.vsmeta');

        expect(nfoCreate.generateMovieNfo).toHaveBeenCalledWith(expect.objectContaining({
            title: ''
        }));
    });

    it('should match media file via readdirSync if direct existsSync fails', () => {
        vi.mocked(fs.existsSync).mockImplementation(() => {
            // direct check fails, so it proceeds to readdirSync
            return false;
        });
        vi.mocked(fs.readdirSync).mockReturnValue([
            'test.mp4',
            'test.vsmeta', // ignore itself
            'other.txt'
        ] as unknown as fs.Dirent[]);
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            title: 'Movie Title',
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).toBe('SUCCESS');
        expect(result?.nfoPath).toBe('test.nfo');
        expect(fs.readdirSync).toHaveBeenCalled();
    });

    it('should return false if readdirSync finds matching prefix but not matching extension', () => {
        vi.mocked(fs.existsSync).mockImplementation(() => {
            return false;
        });
        vi.mocked(fs.readdirSync).mockReturnValue([
            'test.txt', // matching prefix but wrong ext
            'test.nfo',
            'other.mp4' // valid ext but wrong prefix
        ] as unknown as fs.Dirent[]);

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('No matching media file found');
    });

    it('should provide user friendly error if writing NFO throws EACCES', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        const writeErr = new Error('Permission denied') as Error & { code: string };
        writeErr.code = 'EACCES';
        vi.mocked(fs.writeFileSync).mockImplementation(() => { throw writeErr; });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Permission denied: Cannot write to folder. Please check permissions for .');
    });

    it('should provide user friendly error if writing NFO throws EPERM', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        const writeErr = new Error('Permission denied') as Error & { code: string };
        writeErr.code = 'EPERM';
        vi.mocked(fs.writeFileSync).mockImplementation(() => { throw writeErr; });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Permission denied: Cannot write to folder. Please check permissions for .');
    });

    it('should provide user friendly error if writing NFO throws ENOENT', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        const writeErr = new Error('No such file or directory') as Error & { code: string };
        writeErr.code = 'ENOENT';
        vi.mocked(fs.writeFileSync).mockImplementation(() => { throw writeErr; });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Folder does not exist: Cannot write to test.nfo');
    });

    it('should provide generic error if writing NFO throws generic error', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('data'));
        vi.mocked(vsmetaParser.parseVsMeta).mockReturnValue({
            contentType: 1,
            directors: [],
            writers: [],
            actors: [],
            genres: []
        } as unknown as vsmetaParser.VsMetaData);
        vi.mocked(nfoCreate.generateMovieNfo).mockReturnValue('<movie></movie>');

        vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error('Random failing write'); });

        const result = convertVsMetaToNfo('test.vsmeta');

        expect(result?.status).not.toBe('SUCCESS');
        expect(result?.message).toContain('Failed to write test.nfo: Random failing write');
    });
});


