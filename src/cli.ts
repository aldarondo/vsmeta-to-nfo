#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import glob from 'fast-glob';
import { convertVsMetaToNfo } from './converter.js';
import { logConvertResult, getResultMessage } from './logger.js';
import { ConvertOptions } from './types.js';

export async function processAction(targetPath: string, options: ConvertOptions) {
    const fullPath = path.resolve(targetPath);

    if (!fs.existsSync(fullPath)) {
        console.error(`[ERROR] Path not found: ${fullPath}`);
        process.exit(1);
    }

    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
        if (!fullPath.toLowerCase().endsWith('.vsmeta')) {
            console.error(`[ERROR] File is not a .vsmeta: ${fullPath}`);
            process.exit(1);
        }
        const result = convertVsMetaToNfo(fullPath, options);
        logConvertResult(result);
    } else {
        console.log(`Scanning directory: ${fullPath}`);
        const files = await glob('**/*.vsmeta', { cwd: fullPath, absolute: true, caseSensitiveMatch: false });

        if (files.length === 0) {
            console.log('No .vsmeta files found.');
            return;
        }
        console.log(`Found ${files.length} .vsmeta files.`);

        const counts = { SUCCESS: 0, ERROR: 0, SKIP: 0, WARN: 0 };
        const nonSuccesses: string[] = [];
        for (const file of files) {
            const result = convertVsMetaToNfo(file, options);
            logConvertResult(result);
            counts[result.status]++;
            if (result.status !== 'SUCCESS') {
                nonSuccesses.push(getResultMessage(result));
            }
        }
        console.log('\n--- Final Summary ---');
        console.log(`[SUCCESS] : ${counts.SUCCESS}`);
        console.log(`[SKIP]    : ${counts.SKIP}`);
        console.log(`[WARN]    : ${counts.WARN}`);
        console.log(`[ERROR]   : ${counts.ERROR}`);

        if (options.verbose && nonSuccesses.length > 0) {
            console.log('\n--- Verbose (Non-Success items) ---');
            nonSuccesses.forEach(msg => console.log(msg));
        }
    }
}

export function runCLI(argv: string[]) {
    const program = new Command();
    program
        .name('vsmeta-to-nfo')
        .description('Convert Synology .vsmeta files to Kodi/Jellyfin compatible NFO files.')
        .argument('<path>', 'File or folder path to process. If a folder, it traverses recursively.')
        .option('-d, --dry-run', 'Dry run without outputting files.')
        .option('-f, --overwrite', 'Overwrite existing NFO files. If not provided, existing NFO files will be skipped.')
        .option('-v, --verbose', 'Print a summary of all non-successful operations at the end.')
        .action(processAction);

    program.parse(argv);
}

/* v8 ignore start */
if (process.env.NODE_ENV !== 'test') {
    runCLI(process.argv);
}
/* v8 ignore end */
