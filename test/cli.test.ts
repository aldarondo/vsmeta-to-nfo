import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processAction } from '../src/cli.js';
import * as converter from '../src/converter.js';
import * as logger from '../src/logger.js';
import { ConvertResult } from '../src/types.js';
import fs from 'node:fs';
import glob from 'fast-glob';

vi.mock('node:fs');
vi.mock('fast-glob');
vi.mock('../src/converter.js');
vi.mock('../src/logger.js');

describe('cli processAction', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined): never => {
            throw new Error(`process.exit: ${code}`);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should exit with error if path does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        await expect(processAction('badpath', {})).rejects.toThrow('process.exit: 1');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Path not found:'));
    });

    it('should exit with error if single file is not a .vsmeta', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as fs.Stats);

        await expect(processAction('test.txt', {})).rejects.toThrow('process.exit: 1');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('File is not a .vsmeta:'));
    });

    it('should process a single .vsmeta file correctly', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as fs.Stats);

        const mockResult: ConvertResult = { status: 'SUCCESS', message: 'test' };
        vi.mocked(converter.convertVsMetaToNfo).mockReturnValue(mockResult);

        await processAction('test.vsmeta', {});

        expect(converter.convertVsMetaToNfo).toHaveBeenCalled();
        expect(logger.logConvertResult).toHaveBeenCalledWith(mockResult);
    });

    it('should process a directory correctly', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => false, isDirectory: () => true } as fs.Stats);
        vi.mocked(glob).mockResolvedValue(['a.vsmeta', 'b.vsmeta']);

        const successResult: ConvertResult = { status: 'SUCCESS', message: 'test success' };
        const errorResult: ConvertResult = { status: 'ERROR', message: 'test error' };
        vi.mocked(converter.convertVsMetaToNfo)
            .mockReturnValueOnce(successResult)
            .mockReturnValueOnce(errorResult);

        vi.mocked(logger.getResultMessage).mockReturnValue('message');

        await processAction('some_dir', { verbose: true });

        expect(converter.convertVsMetaToNfo).toHaveBeenCalledTimes(2);
        expect(logger.logConvertResult).toHaveBeenCalledTimes(2);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--- Verbose (Non-Success items) ---'));
    });

    it('should handle zero files found in directory correctly', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => false, isDirectory: () => true } as fs.Stats);
        vi.mocked(glob).mockResolvedValue([]);

        await processAction('some_dir', {});

        expect(console.log).toHaveBeenCalledWith('No .vsmeta files found.');
    });

    it('should not log verbose section when verbose is false', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => false, isDirectory: () => true } as fs.Stats);
        vi.mocked(glob).mockResolvedValue(['a.vsmeta']);

        const errorResult: ConvertResult = { status: 'ERROR', message: 'test error' };
        vi.mocked(converter.convertVsMetaToNfo).mockReturnValue(errorResult);
        vi.mocked(logger.getResultMessage).mockReturnValue('[ERROR] test error');

        await processAction('some_dir', { verbose: false });

        expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('--- Verbose'));
    });

    it('should print summary counts after directory processing', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => false, isDirectory: () => true } as fs.Stats);
        vi.mocked(glob).mockResolvedValue(['a.vsmeta']);

        const result: ConvertResult = { status: 'SKIP', message: 'skipped' };
        vi.mocked(converter.convertVsMetaToNfo).mockReturnValue(result);
        vi.mocked(logger.getResultMessage).mockReturnValue('[SKIP] skipped');

        await processAction('some_dir', {});

        expect(console.log).toHaveBeenCalledWith('[SUCCESS] : 0');
        expect(console.log).toHaveBeenCalledWith('[SKIP]    : 1');
        expect(console.log).toHaveBeenCalledWith('[WARN]    : 0');
        expect(console.log).toHaveBeenCalledWith('[ERROR]   : 0');
    });
});

describe('runCLI', () => {
    it('should create a commander program and parse argv', async () => {
        // runCLI sets up Commander and calls program.parse(). We just make sure
        // it does not throw when given a help flag which causes Commander to
        // call process.exit(0).
        const { runCLI } = await import('../src/cli.js');

        vi.spyOn(process, 'exit').mockImplementation((): never => {
            throw new Error('exit');
        });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // --help triggers process.exit(0) inside Commander
        try {
            runCLI(['node', 'cli', '--help']);
        } catch {
            // expected because process.exit is mocked to throw
        }

        expect(process.exit).toHaveBeenCalled();

        vi.restoreAllMocks();
    });
});
